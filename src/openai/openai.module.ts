import { Module } from '@nestjs/common';
import { OpenAIService } from './services/openai.service';
import { AssistantService } from './assistant.service';
import { MenusModule } from '../menus/menus.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderItemsModule } from '../order-items/order-items.module';

@Module({
  imports: [
    MenusModule,
    ProductsModule,
    OrdersModule,
    OrdersModule,
    OrderItemsModule,
  ],
  providers: [OpenAIService, AssistantService],
  exports: [OpenAIService, AssistantService],
})
export class OpenAIModule {}
