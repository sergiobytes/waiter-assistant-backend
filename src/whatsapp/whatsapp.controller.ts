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
import { TwilioMessage } from './classes/twilio-message.class';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(@Body() body: any) {
    return this.whatsappService.handleTwilioWebhook(body);
  }

  @Post('send')
  async sendMessage(@Body() body: TwilioMessage) {
    return this.whatsappService.handleMessageSending(body);
  }
}
