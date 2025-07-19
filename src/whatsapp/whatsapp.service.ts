import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { CustomersService } from '../customers/customers.service';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly twilioService: TwilioService,
    private readonly customersService: CustomersService,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Procesa un mensaje entrante de WhatsApp
   */
  async processIncomingMessage(webhookData: any) {
    this.logger.log('Processing incoming WhatsApp message');

    // Procesar los datos del webhook
    const messageData = this.twilioService.processIncomingMessage(webhookData);
    
    this.logger.log(`Message from ${messageData.from} to ${messageData.to}: ${messageData.message}`);

    // Identificar el branch basado en el número de destino (To)
    const branch = await this.branchesService.findByPhoneNumber(
      messageData.to.replace('whatsapp:', '')
    );

    if (!branch) {
      this.logger.warn(`No branch found for phone number: ${messageData.to}`);
      return {
        error: 'Branch not found',
        message: messageData,
        processed: false,
      };
    }

    this.logger.log(`Message directed to branch: ${branch.name} (${branch.phoneNumber})`);

    // Verificar si el usuario existe en la base de datos
    const customer = await this.findOrCreateCustomer(
      messageData.from,
      messageData.profileName
    );

    this.logger.log(`Customer processed: ${customer.name} (${customer.phone})`);

    // Enviar mensaje de bienvenida automático si es un cliente nuevo
    if (customer) {
      await this.sendWelcomeMessage(customer.phone, customer.name, branch.phoneNumber);
    }

    return {
      customer,
      message: messageData,
      branch,
      processed: true,
    };
  }

  /**
   * Busca un cliente por teléfono, si no existe lo crea
   */
  private async findOrCreateCustomer(phone: string, profileName?: string) {
    try {
      // Intentar encontrar el cliente existente
      const existingCustomer = await this.customersService.findByPhone(phone);
      
      if (existingCustomer) {
        this.logger.log(`Customer found: ${existingCustomer.name}`);
        return existingCustomer;
      }
    } catch (error) {
      // Si no se encuentra, continuamos para crearlo
      this.logger.log(`Customer not found, creating new one`);
    }

    // Crear nuevo cliente
    const customerName = profileName || `Cliente ${phone.slice(-4)}`;
    
    const newCustomer = await this.customersService.create({
      name: customerName,
      phone: phone,
    });

    this.logger.log(`New customer created: ${newCustomer.name} (${newCustomer.phone})`);
    return newCustomer;
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  async sendMessage(to: string, message: string, fromBranchPhone: string) {
    try {
      const response = await this.twilioService.sendWhatsAppMessage(to, message, fromBranchPhone);
      this.logger.log(`Message sent successfully to ${to} from branch ${fromBranchPhone}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Envía un mensaje de bienvenida a un nuevo cliente
   */
  async sendWelcomeMessage(customerPhone: string, customerName: string, branchPhone: string) {
    const welcomeMessage = `¡Hola ${customerName}! 👋 

Bienvenido a nuestro servicio de WhatsApp. 

Puedes usar este chat para:
• Ver nuestro menú
• Hacer pedidos
• Consultar el estado de tu orden

¿En qué podemos ayudarte hoy?`;

    return this.sendMessage(customerPhone, welcomeMessage, branchPhone);
  }
}
