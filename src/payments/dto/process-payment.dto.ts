import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class ProcessPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  paymentGateway?: string;

  @IsOptional()
  @IsString()
  externalPaymentId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
