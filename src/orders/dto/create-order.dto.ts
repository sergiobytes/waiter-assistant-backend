import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from '../../order-items/dto/create-order-item.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderType } from '../../common/enums/order-type.enum';

export class CreateOrderDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(OrderType)
  type: OrderType;
}
