import { Module } from '@nestjs/common';
import { OpenAIService } from './services/openai.service';
import { AssistantService } from './assistant.service';
import { BranchesModule } from '../branches/branches.module';
import { MenusModule } from '../menus/menus.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    BranchesModule,
    MenusModule,
    ProductsModule,
    OrdersModule,
    CustomersModule,
  ],
  providers: [OpenAIService, AssistantService],
  exports: [OpenAIService, AssistantService],
})
export class OpenAIModule {}
