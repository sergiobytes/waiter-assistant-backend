import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { BranchesService } from '../branches/branches.service';
import { TablesService } from '../tables/tables.service';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderType } from '../common/enums/order-type.enum';
import { Table } from '../tables/entities/table.entity';
import { Repository } from 'typeorm';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderItemsService } from '../order-items/order-items.service';
import { OrderItem } from '../order-items/entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly branchService: BranchesService,
    private readonly tableService: TablesService,
    private readonly customerService: CustomersService,
    private readonly productService: ProductsService,
    private readonly orderItemService: OrderItemsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const branch = await this.branchService.findOne(dto.branchId);

    let table: Table | null = null;

    if (dto.type === OrderType.DINE_IN) {
      table = await this.tableService.findOne(dto.tableId!);
    }

    const customer = await this.customerService.findByPhone(dto.customerPhone);

    const items: OrderItem[] = [];

    let total = 0;

    for (const item of dto.items) {
      const orderItem = await this.orderItemService.create(item);
      total += item.unitPrice * item.quantity;
      items.push(orderItem);
    }

    const order = this.orderRepo.create({
      status: dto.status,
      type: dto.type,
      customer,
      branch,
      table: table || undefined,
      items,
      total,
      notes: dto.notes,
    });

    return await this.orderRepo.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepo.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
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
    order.status = OrderStatus.CANCELLED;
    return await this.orderRepo.save(order);
  }

  async close(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException('Cannot close an empty order');
    }

    order.status = OrderStatus.PAID;
    order.closedAt = new Date();

    return await this.orderRepo.save(order);
  }
}
