import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Menu } from '../../menus/entities/menu.entity';
import { ProductCategory } from '../../common/enums/product-category.enum';

@Entity()
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  category: ProductCategory;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu: Menu;

  @Column()
  menuId: string;
}
