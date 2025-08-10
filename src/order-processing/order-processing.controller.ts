import { Controller } from '@nestjs/common';
import { OrderProcessingService } from './order-processing.service';

@Controller('order-processing')
export class OrderProcessingController {
  constructor(
    private readonly orderProcessingService: OrderProcessingService,
  ) {}
}
