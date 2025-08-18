import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { OrderItem } from '../../order-items/entities/order-item.entity';

@Entity()
export class Order extends BaseEntity {
  @ManyToOne(() => Customer, { nullable: true, eager: true })
  customer: Customer;

  @ManyToOne(() => Branch, { eager: true })
  branch: Branch;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;
}
