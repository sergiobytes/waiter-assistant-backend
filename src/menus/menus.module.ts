import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Menu } from './entities/menu.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [MenusService, JwtService],
  controllers: [MenusController],
  imports: [TypeOrmModule.forFeature([Menu])],
  exports: [MenusService],
})
export class MenusModule {}
