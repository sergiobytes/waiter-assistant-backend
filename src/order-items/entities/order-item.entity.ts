import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.items)
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ nullable: true })
  notes?: string;
}
