import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { BranchesModule } from './branches/branches.module';
import { TablesModule } from './tables/tables.module';
import { MenusModule } from './menus/menus.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';

@Module({
  imports: [
    DatabaseModule,
    RestaurantsModule,
    BranchesModule,
    TablesModule,
    MenusModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    OrderItemsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
