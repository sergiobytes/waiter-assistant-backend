import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { WebhooksService } from './webhooks.service';
import { CustomersModule } from '../customers/customers.module';

@Module({
  controllers: [WebhooksController],
  imports: [PaymentsModule, OrdersModule, CustomersModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
