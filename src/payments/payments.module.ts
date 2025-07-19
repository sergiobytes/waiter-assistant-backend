import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { StripeService } from './services/stripe.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
  imports: [
    TypeOrmModule.forFeature([Payment]),
    OrdersModule,
  ],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
