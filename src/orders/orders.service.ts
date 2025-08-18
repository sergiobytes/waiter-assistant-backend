import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { BranchesService } from '../branches/branches.service';

import { CustomersService } from '../customers/customers.service';
import { CreateOrderDto } from './dto/create-order.dto';

import { Repository } from 'typeorm';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly branchService: BranchesService,
    private readonly customerService: CustomersService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const branch = await this.branchService.findOne(dto.branchId);

    const customer = await this.customerService.findById(dto.customerId);

    const order = this.orderRepo.create({
      customer,
      branch,
      notes: dto.notes,
    });

    return await this.orderRepo.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepo.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(id);
    Object.assign(order, dto);
    return this.orderRepo.save(order);
  }

  async remove(id: string): Promise<Order> {
    const order = await this.findOne(id);
    order.isActive = false;
    return await this.orderRepo.save(order);
  }
}
