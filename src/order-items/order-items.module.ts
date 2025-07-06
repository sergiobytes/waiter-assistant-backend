import { Module } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';

import { OrderItem } from './entities/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';

@Module({
  controllers: [],
  providers: [OrderItemsService],
  imports: [TypeOrmModule.forFeature([OrderItem]), ProductsModule],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
