import { Branch } from '../../branches/entities/branch.entity';
import { Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity()
export class Menu extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  branchId: string;
}
