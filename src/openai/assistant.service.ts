import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OpenAIService } from './services/openai.service';
import { BranchesService } from '../branches/branches.service';
import { MenusService } from '../menus/menus.service';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import { OrderType } from '../common/enums/order-type.enum';
import { TablesService } from '../tables/tables.service';

import {
  OrderConfirmationData,
  OrderProcessingService,
} from '../order-processing/order-processing.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @Inject(forwardRef(() => OpenAIService))
    private readonly openAIService: OpenAIService,
    private readonly branchesService: BranchesService,
    private readonly menusService: MenusService,
    private readonly productsService: ProductsService,
    private readonly customersService: CustomersService,
    private readonly orderProcessingService: OrderProcessingService,
    private readonly tableService: TablesService,
  ) {}

  /**
   * Procesa un mensaje del cliente y devuelve la respuesta del asistente
   */
  async processMessage(
    branchId: string,
    customerPhone: string,
    message: string,
    threadId?: string,
    tableInfo?: any,
  ): Promise<{ response: string; threadId: string }> {
    try {
      // 1. Obtener el branch y validar que tenga assistantId
      const branch = await this.branchesService.findOne(branchId);

      if (!branch.assistantId) {
        throw new BadRequestException(
          `Branch '${branch.name}' does not have an assistant configured`,
        );
      }

      this.logger.log(
        `Processing message for branch: ${branch.name} with assistant: ${branch.assistantId}`,
      );

      // 2. Obtener información del cliente
      const customer = await this.customersService.findByPhone(customerPhone);

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // 3. Usar el thread existente o crear uno nuevo
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await this.openAIService.createThread();
        this.logger.log(
          `Created new thread for customer ${customer.name}: ${currentThreadId}`,
        );
      } else {
        this.logger.log(
          `Using existing thread for customer ${customer.name}: ${currentThreadId}`,
        );
      }

      // 4. Preparar contexto del cliente y branch
      const customerContext = {
        customer: {
          name: customer.name,
          phone: customer.phone,
        },
        branch: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
        },
        restaurant: {
          name: branch.restaurant.name,
        },
      };

      let enhancedMessage = message;

      // 5. Agregar información de la mesa si está disponible
      if (tableInfo?.hasTableMention) {
        const tableContext = this.buildTableContext(tableInfo);
        enhancedMessage += `${message}\n\n[CONTEXT: ${tableContext}]`;

        this.logger.log(`Enhanced message with table context: ${tableContext}`);
      }

      // 6. Enviar mensaje al asistente
      let response = await this.openAIService.sendMessageToAssistant(
        branch.assistantId,
        currentThreadId,
        enhancedMessage,
        customerContext,
      );

      this.logger.log(
        `Assistant response generated for customer ${customer.name}`,
      );

      const orderConfirmation = await this.detectOrderConfirmation(
        enhancedMessage,
        response,
      );
      
      if (!tableInfo.hasTableMention) {
        tableInfo = await this.tableService.processTableMention(
          response,
          branch.id,
        );
      }

      if (orderConfirmation.isConfirmation && orderConfirmation.orderData) {
        this.logger.log(
          `Order confirmation detected for customer ${customerPhone}`,
        );

        // Procesar la orden en base de datos
        const orderResult = await this.processConfirmedOrder(
          customerPhone,
          branchId,
          orderConfirmation.orderData,
          tableInfo,
          currentThreadId,
        );

        if (orderResult.success) {
          // Sobrescribir respuesta del assistant con confirmación de orden
          response = orderResult.message;
          this.logger.log(
            `Order processed successfully: ${orderResult.order?.id}`,
          );
        } else {
          // Mantener respuesta del assistant pero loggear error
          this.logger.error(
            `Order processing failed: ${orderResult.errors?.join(', ')}`,
          );
        }
      }

      return {
        response,
        threadId: currentThreadId,
      };
    } catch (error) {
      this.logger.error('Error processing message with assistant:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Respuesta de fallback si hay error con OpenAI
      return {
        response:
          'Lo siento, estoy teniendo problemas técnicos en este momento. ¿Puedes intentar de nuevo en unos minutos?',
        threadId: threadId || 'error',
      };
    }
  }

  /**
   * Obtiene el menú de un branch específico
   */
  async getMenu(branchId: string): Promise<any> {
    try {
      const menu = await this.menusService.findByBranch(branchId);

      const menuData: any[] = [];

      const products = await this.productsService.findByMenu(menu!.id);

      menuData.push({
        menuName: menu!.name,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
        })),
      });

      return {
        status: 'success',
        data: menuData,
      };
    } catch (error) {
      this.logger.error('Error getting menu:', error);
      return {
        status: 'error',
        message: 'No se pudo obtener el menú',
      };
    }
  }

  /**
   * Crea una nueva orden
   */
  async createOrder(
    customerPhone: string,
    branchId: string,
    tableNumber?: string,
  ): Promise<any> {
    try {
      const customer = await this.customersService.findByPhone(customerPhone);

      if (!customer) {
        return {
          status: 'error',
          message: 'Cliente no encontrado',
        };
      }

      // Aquí implementarías la lógica para crear la orden
      // Por ahora, solo retornamos un placeholder

      const orderData = {
        customerId: customer.id,
        branchId: branchId,
        tableNumber: tableNumber,
        status: 'PENDING',
        items: [],
      };

      this.logger.log(`Order creation requested for customer ${customer.name}`);

      return {
        status: 'success',
        message: 'Orden creada exitosamente',
        data: orderData,
      };
    } catch (error) {
      this.logger.error('Error creating order:', error);
      return {
        status: 'error',
        message: 'No se pudo crear la orden',
      };
    }
  }

  buildTableContext(tableInfo: any): string {
    if (tableInfo.error) {
      switch (tableInfo.error) {
        case 'NO_TABLES_FOUND':
          return `ERROR: No tables are configured for this branch. Customer cannot place table orders.`;

        case 'TABLE_NOT_FOUND':
          const availableTables = tableInfo.tables
            .map((t) => `${t.name}(${t.capacity} seats, ${t.status})`)
            .join(', ');
          return `ERROR: Table ${tableInfo.detectedTableNumber} not found. Available tables: ${availableTables}`;

        case 'TABLE_NOT_AVAILABLE':
          const alternativeTables = tableInfo.availableTablesForOrder
            .map((t) => `${t.name}(${t.capacity} seats, ${t.status})`)
            .join(', ');
          return `ERROR: Table ${tableInfo.detectedTableNumber} is ${tableInfo.validatedTable.status}. Alternative tables: ${alternativeTables}`;
      }
    }

    // Contexto normal si no hay errores
    let context = `Customer mentioned table. `;

    if (tableInfo.detectedTableNumber) {
      context += `Detected table number: ${tableInfo.detectedTableNumber}. `;

      if (tableInfo.validatedTable) {
        context += `${tableInfo.tableStatus}. `;
      }
    }

    const availableTablesText = tableInfo.availableTablesForOrder
      .map((t) => `${t.name}(${t.capacity} seats, ${t.status})`)
      .join(', ');

    context += `Tables available for ordering: ${availableTablesText}`;

    return context;
  }

  /**
   * **NUEVO: Detectar si el mensaje es una confirmación de orden**
   */
  private async detectOrderConfirmation(
    userMessage: string,
    assistantResponse: string,
  ): Promise<{
    isConfirmation: boolean;
    orderData?: any;
  }> {
    // Palabras clave que indican confirmación
    const confirmationKeywords = ['si', 'sí'];

    const messageNormalized = userMessage.toLowerCase();
    const messageWords = messageNormalized.split(/\s+/);
    const hasConfirmationKeyword = confirmationKeywords.some((keyword) =>
      messageWords.includes(keyword.toLowerCase()),
    );

    if (!hasConfirmationKeyword) {
      return { isConfirmation: false };
    }

    // **NUEVO: Extraer datos de orden de la respuesta del assistant**
    const orderData = this.extractOrderDataFromResponse(assistantResponse);

    if (!orderData || !orderData.items || orderData.items.length === 0) {
      this.logger.warn(
        'Confirmation detected but no order data found in assistant response',
      );
      return { isConfirmation: false };
    }

    return {
      isConfirmation: true,
      orderData,
    };
  }

  /**
   * **NUEVO: Extraer datos de orden de la respuesta del assistant**
   */
  private extractOrderDataFromResponse(assistantResponse: string): any | null {
    try {
      // El assistant debería estructurar su respuesta con los datos de la orden
      // Buscamos patrones como:
      // "Tu pedido: 1. Pizza Margarita x2 - $25.00"

      const items: any[] = [];
      const lines = assistantResponse.split('\n');

      for (const line of lines) {
        // Buscar líneas que parezcan items de pedido
        // Patrón: "1. Pizza Margarita x2 - $25.00" o "- Pizza Margarita x2"
        const itemMatch = line.match(
          /(?:\d+\.|[-•])\s*(.+?)\s*x(\d+)(?:\s*[-–]\s*\$?([\d,]+(?:\.\d{2})?))?/i,
        );

        if (itemMatch) {
          const [, productName, quantity, price] = itemMatch;

          items.push({
            productName: productName.trim(),
            quantity: parseInt(quantity),
            unitPrice: price ? parseFloat(price.replace(',', '')) : undefined,
          });
        }
      }

      if (items.length === 0) {
        // Método alternativo: buscar en formato más simple
        const simplePattern = /(.+?)\s*x\s*(\d+)/gi;
        let match;

        while ((match = simplePattern.exec(assistantResponse)) !== null) {
          const [, productName, quantity] = match;

          items.push({
            productName: productName.trim(),
            quantity: parseInt(quantity),
          });
        }
      }

      return items.length > 0 ? { items } : null;
    } catch (error) {
      this.logger.error('Error extracting order data:', error);
      return null;
    }
  }

  /**
   * **NUEVO: Procesar orden confirmada**
   */
  private async processConfirmedOrder(
    customerPhone: string,
    branchId: string,
    orderData: any,
    tableInfo: any,
    threadId: string,
  ): Promise<{
    success: boolean;
    order?: any;
    message: string;
    errors?: string[];
  }> {
    try {
      // Determinar tipo de orden y mesa
      let orderType: OrderType;
      let tableId: string | null;

      if (tableInfo?.validatedTable) {
        orderType = OrderType.DINE_IN;
        tableId = tableInfo.validatedTable.id;
      }

      // Preparar datos para OrderProcessingService
      const confirmationData: OrderConfirmationData = {
        customerPhone,
        branchId,
        tableId: tableId!,
        orderType: orderType!,
        items: orderData.items,
        notes: orderData.notes,
        assistantThreadId: threadId,
      };

      // Procesar la orden
      const result =
        await this.orderProcessingService.processOrderConfirmation(
          confirmationData,
        );

      if (result.success) {
        const message = this.buildOrderConfirmationMessage(result);

        return {
          success: true,
          order: result.order,
          message,
        };
      } else {
        return {
          success: false,
          message: `❌ No pude procesar tu pedido: ${result.errors?.join(' ')}`,
          errors: result.errors,
        };
      }
    } catch (error) {
      this.logger.error('Error processing confirmed order:', error);

      return {
        success: false,
        message:
          '❌ Hubo un error procesando tu pedido. Por favor intenta de nuevo.',
        errors: [error.message],
      };
    }
  }

  /**
   * **NUEVO: Construir mensaje de confirmación**
   */
  private buildOrderConfirmationMessage(result: any): string {
    const order = result.order;
    const items = result.orderItems;

    let message = `✅ *¡Pedido confirmado!*\n\n`;
    message += `📋 *Orden #${order.id.slice(-6)}*\n`;

    if (order.tableId && order.table) {
      message += `🪑 Mesa: ${order.table.name}\n`;
    }

    message += `\n🍽️ *Tu pedido:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product?.name || 'Producto'} x${item.quantity}`;
      if (item.notes) {
        message += ` (${item.notes})`;
      }
      message += ` - $${(item.unitPrice * item.quantity).toFixed(2)}\n`;
    });

    message += `\n💰 *Total: $${result.total.toFixed(2)}*\n\n`;
    message += `⏰ Estado: ⏳ Pendiente\n`;
    message += `🕐 Tiempo estimado: 15-20 minutos\n\n`;
    message += `Te notificaremos cuando esté listo! 📲`;

    return message;
  }
}
