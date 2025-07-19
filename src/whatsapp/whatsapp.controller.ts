import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsappService } from './whatsapp.service';
import { TwilioService } from './twilio.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly twilioService: TwilioService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Req() request: Request,
  ) {
    this.logger.log('Received Twilio WhatsApp webhook');
    this.logger.log('Webhook data:', JSON.stringify(body, null, 2));

    // TODO: Descomentar cuando tengas la URL pública configurada
    // Validar que el webhook viene de Twilio
    /*
    const isValid = this.twilioService.validateWebhook(
      signature,
      request.url,
      body
    );

    if (!isValid) {
      this.logger.error('Invalid Twilio webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }
    */

    try {
      // Procesar el mensaje entrante
      const result = await this.whatsappService.processIncomingMessage(body);
      
      this.logger.log('Message processed successfully');

      return { status: 'success', processed: true, result };
    } catch (error) {
      this.logger.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  @Post('send')
  async sendMessage(
    @Body() body: { to: string; message: string; branchPhone: string }
  ) {
    const { to, message, branchPhone } = body;
    
    if (!to || !message || !branchPhone) {
      throw new BadRequestException('Missing required fields: to, message, branchPhone');
    }

    try {
      const result = await this.whatsappService.sendMessage(to, message, branchPhone);
      return { 
        success: true, 
        messageSid: result.sid,
        to: to 
      };
    } catch (error) {
      this.logger.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() body: any) {
    this.logger.log('Test WhatsApp webhook received');
    this.logger.log('Body:', JSON.stringify(body, null, 2));
    
    return { 
      received: true, 
      timestamp: new Date().toISOString(),
      body 
    };
  }
}
