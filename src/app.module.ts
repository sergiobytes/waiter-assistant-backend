import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { BranchesModule } from './branches/branches.module';

@Module({
  imports: [DatabaseModule, RestaurantsModule, BranchesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
