import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { TwilioService } from './services/twilio.service';
import { CustomersModule } from '../customers/customers.module';
import { BranchesModule } from '../branches/branches.module';
import { OpenAIModule } from '../openai/openai.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderItemsModule } from '../order-items/order-items.module';

@Module({
  imports: [
    CustomersModule,
    BranchesModule,
    OpenAIModule,
    OrdersModule,
    OrderItemsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, TwilioService],
  exports: [WhatsappService, TwilioService],
})
export class WhatsappModule {}
