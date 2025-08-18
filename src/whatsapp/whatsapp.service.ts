import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TwilioService } from './services/twilio.service';
import { CustomersService } from '../customers/customers.service';
import { BranchesService } from '../branches/branches.service';
import { AssistantService } from '../openai/assistant.service';

import { TwilioWebhookData } from './models/twilio-webhook-data.response';
import { ProcessedIncomingMessage } from './models/processed-incoming-message';
import { Customer } from '../customers/entities/customer.entity';
import { splitMessages } from '../utils/split-messages';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { hasRequestedBill } from '../utils/has-requested-bill';
import { extractOrderDataFromMessage } from '../utils/extract-order-data-from-message';
import { Product } from '../products/entities/product.entity';
import { CreateOrderItemDto } from '../order-items/dto/create-order-item.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { OrderItem } from '../order-items/entities/order-item.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly twilioService: TwilioService,
    private readonly customersService: CustomersService,
    private readonly branchesService: BranchesService,
    private readonly assistantService: AssistantService,
    private readonly ordersService: OrdersService,
    private readonly orderItemsService: OrderItemsService,
  ) {}

  async handleTwilioWebhook(body: TwilioWebhookData) {
    this.logger.log('Received Twilio WhatsApp webhook');
    this.logger.log('Webhook data:', JSON.stringify(body, null, 2));

    try {
      // Procesar el mensaje entrante
      const result = await this.processIncomingMessage(body);

      this.logger.log('Message processed successfully');

      return { status: 'success', processed: true, result };
    } catch (error) {
      this.logger.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Procesa un mensaje entrante de WhatsApp
   */
  async processIncomingMessage(
    webhookData: TwilioWebhookData,
  ): Promise<ProcessedIncomingMessage> {
    this.logger.log('Processing incoming WhatsApp message');

    // Procesar los datos del webhook
    const messageData = this.twilioService.processIncomingMessage(webhookData);

    this.logger.log(
      `Message from ${messageData.from} to ${messageData.to}: ${messageData.message}`,
    );

    // Identificar el branch basado en el número de destino (To)
    const branch = await this.branchesService.findByPhoneNumber(
      messageData.to.replace('whatsapp:', ''),
    );

    if (!branch) {
      this.logger.warn(`No branch found for phone number: ${messageData.to}`);
      return {
        error: 'Branch not found',
        message: messageData,
        processed: false,
      };
    }

    this.logger.log(
      `Message directed to branch: ${branch.name} (${branch.phoneNumberAssistant})`,
    );

    const isAdmin =
      messageData.from === branch.phoneNumberCashier ? true : false;

    // Verificar si el usuario existe en la base de datos
    const customer = await this.findOrCreateCustomer(
      messageData.from,
      isAdmin,
      messageData.profileName,
    );

    this.logger.log(`Customer processed: ${customer.name} (${customer.phone})`);

    // Procesar mensaje con OpenAI Assistant si el branch tiene uno configurado
    let assistantResponse: string | null = null;
    let threadId: string | null = null;

    if (branch.assistantId) {
      try {
        this.logger.log(
          `Processing message with OpenAI Assistant: ${branch.assistantId}`,
        );

        // Usar el threadId existente del cliente
        const assistantResult = await this.assistantService.processMessage(
          branch,
          customer,
          messageData.message,
          customer.threadId,
        );

        assistantResponse = assistantResult.response;
        threadId = assistantResult.threadId;

        // Realizar solo si no es administrador
        if (!isAdmin) {
          // Si el cliente no tenía threadId o cambió, actualizarlo
          if (
            !customer.threadId ||
            customer.threadId === '' ||
            customer.threadId !== threadId
          ) {
            await this.customersService.update(customer.phone, { threadId });
            customer.threadId = threadId; // Actualizar el objeto en memoria
            this.logger.log(
              `ThreadId updated for customer ${customer.name}: ${threadId}`,
            );
          }
        }

        if (assistantResponse.includes('### CAJA')) {
          const { client, cashier } = splitMessages(assistantResponse);

          const messages: Promise<MessageInstance>[] = [];

          if (client)
            messages.push(
              this.sendMessage(
                customer.phone,
                client,
                branch.phoneNumberAssistant,
              ),
            );

          for (const block of cashier) {
            messages.push(
              this.sendMessage(
                branch.phoneNumberCashier,
                block,
                branch.phoneNumberAssistant,
              ),
            );
          }

          await Promise.all(messages);

          // Crear orden en base de datos después de que el cliente pida la cuenta
          if (hasRequestedBill(cashier)) {
            await this.saveOrder(branch.id, customer.id, client!);
            await this.customersService.update(customer.phone, {
              threadId: '',
            });
          }
        } else {
          await this.sendMessage(
            customer.phone,
            assistantResponse,
            branch.phoneNumberAssistant,
          );
        }

        this.logger.log(`Assistant response sent to ${customer.name}`);
      } catch (error) {
        this.logger.error('Error processing message with assistant:', error);

        // Enviar mensaje de fallback si hay error
        const fallbackMessage =
          'Gracias por tu mensaje. Un miembro de nuestro equipo te responderá pronto.';
        await this.sendMessage(
          customer.phone,
          fallbackMessage,
          branch.phoneNumberAssistant,
        );
      }
    } else {
      // Si no hay asistente configurado, enviar mensaje de bienvenida estándar
      this.logger.log(
        `No assistant configured for branch ${branch.name}, sending welcome message`,
      );
    }

    return {
      customer,
      message: messageData,
      branch,
      assistantResponse,
      threadId,
      processed: true,
    };
  }

  /**
   * Busca un cliente por teléfono, si no existe lo crea
   */
  private async findOrCreateCustomer(
    phone: string,
    isAdmin: boolean,
    profileName?: string,
  ): Promise<Customer> {
    if (isAdmin) {
      // No guardar en base de datos, solo retornar objeto simulado
      const customerName = profileName || `Cliente ${phone.slice(-4)}`;
      this.logger.log(`Admin detected, not saving to DB: ${customerName}`);
      return {
        id: 'xxxx',
        name: customerName,
        phone: phone,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        threadId: undefined,
      };
    }

    try {
      // Intentar encontrar el cliente existente
      const existingCustomer = await this.customersService.findByPhone(phone);

      if (existingCustomer) {
        this.logger.log(`Customer found: ${existingCustomer.name}`);
        return existingCustomer;
      }
    } catch {
      // Si no se encuentra, continuamos para crearlo
      this.logger.log(`Customer not found, creating new one`);
    }

    // Crear nuevo cliente
    const customerName = profileName || `Cliente ${phone.slice(-4)}`;

    const newCustomer = await this.customersService.create({
      name: customerName,
      phone: phone,
    });

    this.logger.log(
      `New customer created: ${newCustomer.name} (${newCustomer.phone})`,
    );
    return newCustomer;
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  private async sendMessage(
    to: string,
    message: string,
    fromBranchPhone: string,
  ) {
    try {
      const response = await this.twilioService.sendWhatsAppMessage(
        to,
        message,
        fromBranchPhone,
      );
      this.logger.log(
        `Message sent successfully to ${to} from branch ${fromBranchPhone}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  private async saveOrder(
    branchId: string,
    customerId: string,
    clientMessage: string,
  ) {
    // Implementar lógica para guardar la orden en la base de datos

    const menuProducts = (await this.assistantService.getMenu(branchId)).data;

    if (!menuProducts) throw new NotFoundException('Menu products not found');

    const parsedOrderData = extractOrderDataFromMessage(clientMessage);

    if (!parsedOrderData) throw new BadRequestException('Invalid order data');

    const orderData: CreateOrderDto = {
      branchId,
      customerId,
      items: [],
    };

    const createdOrder = await this.ordersService.create(orderData);

    let total = 0;
    const orderItems: Promise<OrderItem>[] = [];

    for (const item of parsedOrderData) {
      const product = this.findProductByName(menuProducts, item.productName);

      if (!product) {
        this.logger.error(`Product not found: "${item.productName}".`);
        continue;
      }

      total += product.price * item.quantity;

      const dto: CreateOrderItemDto = {
        orderId: createdOrder.id,
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        notes: '',
      };

      orderItems.push(this.orderItemsService.create(dto));
    }
    const items = await Promise.all(orderItems);

    await this.ordersService.update(createdOrder.id, {
      total,
      items,
    });
  }

  /**
   * Búsqueda mejorada de producto por nombre
   */
  private findProductByName(
    products: Product[],
    searchName: string,
  ): Product | null {
    const normalized = searchName.toLowerCase().trim();

    this.logger.log(
      `Searching for product: "${searchName}" in ${products.length} products`,
    );

    // 1. Búsqueda exacta
    let found = products.find(
      (p) => p.name.toLowerCase().trim() === normalized,
    );

    if (found) {
      this.logger.log(`Found exact match: ${found.name}`);
      return found;
    }

    // 2. Búsqueda por inclusión simple
    found = products.find(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        normalized.includes(p.name.toLowerCase()),
    );

    if (found) {
      this.logger.log(`Found by inclusion: ${found.name}`);
      return found;
    }

    // 3. **NUEVO: Búsqueda específica para productos con variantes**
    // Buscar en contenido de paréntesis: "Refrescos (Cola, fresa)" -> buscar "cola"
    found = products.find((p) => {
      const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
      if (parenthesisMatch) {
        const variants = parenthesisMatch[1].toLowerCase();
        // Dividir por comas y limpiar espacios
        const variantList = variants.split(',').map((v) => v.trim());

        // Verificar si el término buscado coincide con alguna variante
        return variantList.some(
          (variant) =>
            variant.includes(normalized) ||
            normalized.includes(variant) ||
            this.similarityMatch(variant, normalized),
        );
      }
      return false;
    });

    if (found) {
      this.logger.log(`Found by variant match: ${found.name}`);
      return found;
    }

    // 4. **NUEVO: Búsqueda por palabras clave mejorada**
    const searchWords = normalized.split(' ').filter((word) => word.length > 2);

    found = products.find((p) => {
      const productText = p.name.toLowerCase();

      // Verificar si alguna palabra clave coincide
      return searchWords.some((word) => {
        // Buscar en el nombre principal
        if (productText.includes(word)) return true;

        // Buscar en las variantes (contenido de paréntesis)
        const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
        if (parenthesisMatch) {
          const variants = parenthesisMatch[1].toLowerCase();
          return variants.includes(word);
        }

        return false;
      });
    });

    if (found) {
      this.logger.log(`Found by keyword match: ${found.name}`);
      return found;
    }

    // 5. **NUEVO: Mapeo de sinónimos comunes**
    const synonymMap = {
      refresco: ['refrescos', 'bebida', 'soda'],
      cola: ['coca', 'cocacola', 'coca cola', 'pepsi'],
      fresa: ['strawberry', 'frutilla'],
      toronja: ['pomelo', 'grapefruit'],
      torta: ['sandwich', 'sándwich', 'emparedado'],
      jamón: ['jamon', 'ham'],
    };

    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (
        normalized.includes(key) ||
        synonyms.some((syn) => normalized.includes(syn))
      ) {
        found = products.find((p) => {
          const productText = p.name.toLowerCase();
          return (
            productText.includes(key) ||
            synonyms.some((syn) => productText.includes(syn))
          );
        });

        if (found) {
          this.logger.log(`Found by synonym match (${key}): ${found.name}`);
          return found;
        }
      }
    }

    this.logger.warn(`No product found for: "${searchName}"`);
    return null;
  }

  private similarityMatch(str1: string, str2: string): boolean {
    // Implementación simple de similitud
    const minLength = Math.min(str1.length, str2.length);
    const maxLength = Math.max(str1.length, str2.length);

    if (minLength < 3) return false; // Muy corto para comparar

    // Si una string está contenida en la otra y tiene al menos 70% de similitud
    if (minLength / maxLength >= 0.7) {
      return str1.includes(str2) || str2.includes(str1);
    }

    return false;
  }
}
