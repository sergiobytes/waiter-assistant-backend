import {
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItem } from '../../order-items/entities/order-item.entity';

export class CreateOrderDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  items: OrderItem[];

  @IsOptional()
  @IsString()
  notes?: string;
}
