import { BaseEntity } from '../../common/base.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { TableStatus } from '../../common/enums/table-status.enum';

@Entity()
export class Table extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: 4 })
  capacity: number;

  @Column({ default: TableStatus.AVAILABLE })
  status: TableStatus;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  branchId: string;
}
