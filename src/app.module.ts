import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { RestaurantsModule } from './restaurants/restaurants.module';

@Module({
  imports: [DatabaseModule, RestaurantsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
