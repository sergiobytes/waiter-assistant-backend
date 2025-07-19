import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  controllers: [WebhooksController],
  imports: [PaymentsModule, OrdersModule],
})
export class WebhooksModule {}
