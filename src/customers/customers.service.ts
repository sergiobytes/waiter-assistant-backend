import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepo.create(dto);
    return await this.customerRepo.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return await this.customerRepo.find({
      where: { isActive: true },
    });
  }

  async findById(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, isActive: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return customer;
  }

  async findByPhone(phone: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { phone: phone, isActive: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return customer;
  }

  async update(phone: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findByPhone(phone);
    Object.assign(customer, dto);
    return await this.customerRepo.save(customer);
  }

  async remove(phone: string): Promise<void> {
    const customer = await this.findByPhone(phone);
    customer.isActive = false;
    await this.customerRepo.save(customer);
  }
}
