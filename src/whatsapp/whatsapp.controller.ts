import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { TwilioWebhookData } from './models/twilio-webhook-data.response';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleTwilioWebhook(@Body() body: TwilioWebhookData) {
    return this.whatsappService.handleTwilioWebhook(body);
  }
}
