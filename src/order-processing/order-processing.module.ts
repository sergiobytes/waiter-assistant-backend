import { Module } from '@nestjs/common';
import { OrderProcessingService } from './order-processing.service';
import { OrderProcessingController } from './order-processing.controller';
import { OrdersModule } from '../orders/orders.module';
import { OrderItemsModule } from '../order-items/order-items.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { TablesModule } from '../tables/tables.module';
import { MenusModule } from '../menus/menus.module';

@Module({
  controllers: [OrderProcessingController],
  providers: [OrderProcessingService],
  imports: [
    OrdersModule,
    OrderItemsModule,
    ProductsModule,
    CustomersModule,
    TablesModule,
    MenusModule,
  ],
  exports: [OrderProcessingService],
})
export class OrderProcessingModule {}
