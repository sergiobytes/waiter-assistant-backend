import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { UserRoles } from './../enums/user-valid-roles';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRoles })
  role: UserRoles;
}
