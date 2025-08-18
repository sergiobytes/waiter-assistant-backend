import { Injectable, Logger } from '@nestjs/common';
import { twilioConfig } from '../../config/twilio.config';
import * as twilio from 'twilio';
import { TwilioWebhookData } from '../models/twilio-webhook-data.response';
import { MessageData } from '../models/message-data';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: twilio.Twilio;

  constructor() {
    if (twilioConfig.accountSid && twilioConfig.authToken) {
      this.client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
      this.logger.log('Twilio service initialized');
    } else {
      this.logger.warn('Twilio not configured - missing credentials');
    }
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  async sendWhatsAppMessage(
    to: string,
    message: string,
    from: string,
  ): Promise<MessageInstance> {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    try {
      // Asegurar que el número tenga el formato correcto para WhatsApp
      const whatsappNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const fromNumber = from.startsWith('whatsapp:')
        ? from
        : `whatsapp:${from}`;

      const messageResponse = await this.client.messages.create({
        body: message,
        from: fromNumber,
        to: whatsappNumber,
      });

      this.logger.log(`WhatsApp message sent to ${to}: ${messageResponse.sid}`);
      return messageResponse;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Procesa un mensaje entrante de WhatsApp
   */
  processIncomingMessage(webhookData: TwilioWebhookData): MessageData {
    const {
      From: from,
      To: to,
      Body: body,
      ProfileName: profileName,
      MessageSid: messageSid,
    } = webhookData;

    // Limpiar el número de teléfono (remover "whatsapp:" prefix)
    const phoneNumber = from?.replace('whatsapp:', '');

    return {
      from: phoneNumber,
      to: to?.replace('whatsapp:', ''),
      message: body || '',
      profileName: profileName || '',
      messageSid,
      timestamp: new Date(),
    };
  }

  /**
   * Valida que el webhook viene de Twilio
   */
  validateWebhook(signature: string, url: string, params: any): boolean {
    if (!this.client) {
      return false;
    }

    try {
      return twilio.validateRequest(
        twilioConfig.authToken,
        signature,
        url,
        params,
      );
    } catch (error) {
      this.logger.error('Error validating Twilio webhook:', error);
      return false;
    }
  }
}
