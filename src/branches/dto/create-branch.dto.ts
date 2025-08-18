import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberAssistant: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberCashier: string;

  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsString()
  @IsOptional()
  assistantId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  balance?: number;
}
