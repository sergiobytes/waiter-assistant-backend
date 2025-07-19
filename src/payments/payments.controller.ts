import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post('/process/:orderId')
  processPayment(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(orderId, dto);
  }

  @Post('/confirm-bank-transfer/:paymentId')
  confirmBankTransfer(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body('externalPaymentId') externalPaymentId: string,
  ) {
    return this.paymentsService.confirmBankTransfer(
      paymentId,
      externalPaymentId,
    );
  }

  @Post('/refund/:paymentId')
  refundPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.refundPayment(paymentId, reason);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('/stats')
  getStats() {
    return this.paymentsService.getPaymentStats();
  }

  @Get('/stats/order/:orderId')
  getOrderStats(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.getPaymentStats(orderId);
  }

  @Get('/by-order/:orderId')
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post('/create-checkout-session/:orderId')
  async createCheckoutSession(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.createStripeCheckoutSession(orderId);
  }

  @Get(':id/summary')
  getPaymentSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentSummary(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }
}
