import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity()
export class Restaurant extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;
}
