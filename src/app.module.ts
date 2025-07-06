import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { BranchesModule } from './branches/branches.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [DatabaseModule, RestaurantsModule, BranchesModule, TablesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
