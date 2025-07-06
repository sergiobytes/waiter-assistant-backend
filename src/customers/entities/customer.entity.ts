import { Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

export class Customer extends BaseEntity {
  @Column()
  name: string;

  @Column()
  phone: string;
}
