import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity()
export class Branch extends BaseEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  phoneNumberAssistant: string;

  @Column()
  phoneNumberCashier: string;

  @Column({ nullable: true })
  assistantId: string;

  @Column({ nullable: true })
  qrUrl: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column()
  restaurantId: string;
}
