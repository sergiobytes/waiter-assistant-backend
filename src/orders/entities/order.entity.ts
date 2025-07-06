import { OrderStatus } from './../../common/enums/order-status.enum';
import { BaseEntity } from '../../common/base.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Table } from '../../tables/entities/table.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { OrderItem } from '../../order-items/entities/order-item.entity';
import { OrderType } from '../../common/enums/order-type.enum';

@Entity()
export class Order extends BaseEntity {
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @ManyToOne(() => Customer, { nullable: true, eager: true })
  customer: Customer;

  @ManyToOne(() => Branch, { eager: true })
  branch: Branch;

  @ManyToOne(() => Table, {nullable: true, eager: true })
  table?: Table;

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
