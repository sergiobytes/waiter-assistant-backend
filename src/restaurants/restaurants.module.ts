import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService, JwtService],
  imports: [TypeOrmModule.forFeature([Restaurant])],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
