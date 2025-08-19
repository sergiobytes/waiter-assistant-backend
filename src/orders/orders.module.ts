import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { OrderItemsModule } from '../order-items/order-items.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, JwtService],
  imports: [
    TypeOrmModule.forFeature([Order]),
    BranchesModule,
    CustomersModule,
    ProductsModule,
    OrderItemsModule,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
