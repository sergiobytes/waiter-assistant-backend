import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { TwilioService } from './twilio.service';
import { CustomersModule } from '../customers/customers.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [CustomersModule, BranchesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, TwilioService],
  exports: [WhatsappService, TwilioService],
})
export class WhatsappModule {}
