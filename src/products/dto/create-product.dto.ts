import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProductCategory } from '../../common/enums/product-category.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @IsString()
  @IsNotEmpty()
  menuId: string;
}
