import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { CustomersModule } from './customers/customers.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { BranchesModule } from './branches/branches.module';
import { MenusModule } from './menus/menus.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OpenAIModule } from './openai/openai.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AuthModule } from './auth/auth.module';
import { CustomJwtModule } from './custom-jwt/custom-jwt.module';
import { CustomPassportModule } from './custom-passport/custom-passport.module';
import { CustomThrottlerModule } from './custom-throttler/custom-throttler.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    CustomersModule,
    RestaurantsModule,
    BranchesModule,
    MenusModule,
    ProductsModule,
    OrdersModule,
    OrderItemsModule,
    OpenAIModule,
    WhatsappModule,
    AuthModule,
    CustomJwtModule,
    CustomPassportModule,
    CustomThrottlerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
