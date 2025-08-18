import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';

@Module({
  controllers: [],
  providers: [CustomersService],
  imports: [TypeOrmModule.forFeature([Customer])],
  exports: [CustomersService],
})
export class CustomersModule {}
