import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { Table } from './entities/table.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [TablesService],
  controllers: [TablesController],
  imports: [TypeOrmModule.forFeature([Table])],
  exports: [TablesService],
})
export class TablesModule {}
