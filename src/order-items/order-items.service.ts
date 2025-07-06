import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly productService: ProductsService,
  ) {}

  async create(dto: CreateOrderItemDto) {
    const product = await this.productService.findOne(dto.productId);

    const orderItem = this.orderItemRepo.create({
      product,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      notes: dto.notes,
    });
    
    return await this.orderItemRepo.save(orderItem);
  }
}
