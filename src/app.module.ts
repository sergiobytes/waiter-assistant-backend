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
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OpenAIModule } from './openai/openai.module';
import { OrderProcessingModule } from './order-processing/order-processing.module';

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
    PaymentsModule,
    WebhooksModule,
    WhatsappModule,
    OpenAIModule,
    OrderProcessingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
