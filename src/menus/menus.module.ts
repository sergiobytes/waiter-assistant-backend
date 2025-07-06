import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { Menu } from './entities/menu.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [MenusService],
  controllers: [MenusController],
  imports: [TypeOrmModule.forFeature([Menu])],
  exports: [MenusService],
})
export class MenusModule {}
