import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { CurrencyUtils } from '../utils/currency.utils';
import { StripeService } from './services/stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly stripeService: StripeService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    // Verificar que la orden existe y está en estado correcto
    const order = await this.ordersService.findOne(dto.orderId);

    if (order.status !== OrderStatus.CLOSED) {
      throw new BadRequestException(
        'Order must be closed before creating payment',
      );
    }

    // Validar y redondear monto
    dto.amount = CurrencyUtils.roundToMXN(dto.amount);
    if (!CurrencyUtils.isValidAmount(dto.amount)) {
      throw new BadRequestException('Invalid payment amount');
    }

    // Verificar que no hay un pago exitoso previo
    const existingPayment = await this.paymentRepo.findOne({
      where: {
        orderId: dto.orderId,
        status: PaymentStatus.COMPLETED,
      },
    });

    if (existingPayment) {
      throw new BadRequestException('Order already has a completed payment');
    }

    const payment = this.paymentRepo.create({
      ...dto,
      order,
      transactionId: this.generateTransactionId(),
    });

    return await this.paymentRepo.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return await this.paymentRepo.find({
      where: { isActive: true },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, isActive: true },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    return await this.paymentRepo.find({
      where: { orderId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, dto);
    return await this.paymentRepo.save(payment);
  }

  async processPayment(
    orderId: string,
    dto: ProcessPaymentDto,
  ): Promise<Payment> {
    const order = await this.ordersService.findOne(orderId);

    if (order.status !== OrderStatus.CLOSED) {
      throw new BadRequestException('Order must be closed to process payment');
    }

    // Crear el pago
    const payment = await this.create({
      orderId,
      amount: order.total,
      method: dto.method,
      paymentGateway: dto.paymentGateway,
      metadata: dto.metadata,
    });

    // Procesar según el método de pago
    let processedPayment: Payment;

    switch (dto.method) {
      case PaymentMethod.CASH:
        processedPayment = await this.processCashPayment(payment);
        break;
      case PaymentMethod.CARD:
        processedPayment = await this.processCardPayment(payment, dto);
        break;
      case PaymentMethod.DIGITAL_WALLET:
        processedPayment = await this.processDigitalWalletPayment(payment, dto);
        break;
      case PaymentMethod.BANK_TRANSFER:
        processedPayment = await this.processBankTransferPayment(payment, dto);
        break;
      default:
        throw new BadRequestException('Unsupported payment method');
    }

    // Si el pago fue exitoso, marcar la orden como pagada
    if (processedPayment.status === PaymentStatus.COMPLETED) {
      await this.ordersService.paid(orderId);
    }

    return processedPayment;
  }

  private async processCashPayment(payment: Payment): Promise<Payment> {
    // Para pagos en efectivo, se considera completado inmediatamente
    payment.status = PaymentStatus.COMPLETED;
    payment.processedAt = new Date();
    payment.completedAt = new Date();
    payment.paymentGateway = 'cash';

    return await this.paymentRepo.save(payment);
  }

  private async processCardPayment(
    payment: Payment,
    dto: ProcessPaymentDto,
  ): Promise<Payment> {
    // Integración con Stripe para tarjetas usando checkout sessions

    try {
      payment.status = PaymentStatus.PROCESSING;
      payment.processedAt = new Date();
      payment.paymentGateway = 'stripe';

      await this.paymentRepo.save(payment);

      // Crear Checkout Session en Stripe (más fácil para el usuario)
      const session = await this.stripeService.createCheckoutSession(
        payment.amount,
        payment.orderId,
        { description: `Order ${payment.orderId}` },
      );

      payment.externalPaymentId = session.id;
      payment.metadata = {
        ...payment.metadata,
        checkoutUrl: session.url,
      };

      // El estado se actualizará via webhook cuando se complete
      return await this.paymentRepo.save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error.message;
      return await this.paymentRepo.save(payment);
    }
  }

  private async processDigitalWalletPayment(
    payment: Payment,
    dto: ProcessPaymentDto,
  ): Promise<Payment> {
    // Stripe maneja Google Pay, Apple Pay, etc. a través de checkout sessions
    try {
      payment.status = PaymentStatus.PROCESSING;
      payment.processedAt = new Date();
      payment.paymentGateway = 'stripe';

      await this.paymentRepo.save(payment);

      // Crear Checkout Session con soporte para wallets
      const session = await this.stripeService.createCheckoutSession(
        payment.amount,
        payment.orderId,
        {
          description: `Order ${payment.orderId} - Digital Wallet`,
        },
      );

      payment.externalPaymentId = session.id;
      payment.metadata = {
        ...payment.metadata,
        checkoutUrl: session.url,
        walletType: dto.metadata?.walletType,
      };

      // El estado se actualizará via webhook
      return await this.paymentRepo.save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error.message;
      return await this.paymentRepo.save(payment);
    }
  }

  private async processBankTransferPayment(
    payment: Payment,
    dto: ProcessPaymentDto,
  ): Promise<Payment> {
    // Las transferencias bancarias usualmente requieren confirmación manual
    payment.status = PaymentStatus.PENDING;
    payment.processedAt = new Date();
    payment.paymentGateway = dto.paymentGateway || 'bank_transfer';
    payment.metadata = {
      ...payment.metadata,
      requiresManualConfirmation: true,
    };

    return await this.paymentRepo.save(payment);
  }

  async confirmBankTransfer(
    paymentId: string,
    externalPaymentId: string,
  ): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.method !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('This method is only for bank transfers');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending status');
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.completedAt = new Date();
    payment.externalPaymentId = externalPaymentId;

    const updatedPayment = await this.paymentRepo.save(payment);

    // Marcar la orden como pagada
    await this.ordersService.paid(payment.orderId);

    return updatedPayment;
  }

  async refundPayment(paymentId: string, reason?: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // TODO: Integrar con gateways para reembolsos reales
    payment.status = PaymentStatus.REFUNDED;
    payment.failureReason = reason || 'Refund requested';
    payment.metadata = {
      ...payment.metadata,
      refundedAt: new Date(),
      refundReason: reason,
    };

    return await this.paymentRepo.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete completed payments');
    }

    payment.isActive = false;
    await this.paymentRepo.save(payment);
  }

  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  // Método útil para estadísticas
  async getPaymentStats(orderId?: string) {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.isActive = :isActive', { isActive: true });

    if (orderId) {
      queryBuilder.andWhere('payment.orderId = :orderId', { orderId });
    }

    const [payments, total] = await queryBuilder.getManyAndCount();

    const stats = {
      total,
      byStatus: {} as Record<PaymentStatus, number>,
      byMethod: {} as Record<PaymentMethod, number>,
      totalAmount: 0,
    };

    payments.forEach((payment) => {
      // Por estado
      stats.byStatus[payment.status] =
        (stats.byStatus[payment.status] || 0) + 1;

      // Por método
      stats.byMethod[payment.method] =
        (stats.byMethod[payment.method] || 0) + 1;

      // Total de dinero
      if (payment.status === PaymentStatus.COMPLETED) {
        stats.totalAmount += Number(payment.amount);
      }
    });

    return stats;
  }

  /**
   * Formatea un monto para mostrar en respuestas
   */
  formatAmount(amount: number): string {
    return CurrencyUtils.formatMXN(amount);
  }

  /**
   * Obtiene el resumen de un pago formateado
   */
  async getPaymentSummary(paymentId: string) {
    const payment = await this.findOne(paymentId);

    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      amountFormatted: this.formatAmount(payment.amount),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
    };
  }

  /**
   * Crea una sesión de checkout de Stripe para una orden
   */
  async createStripeCheckoutSession(
    orderId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ) {
    const order = await this.ordersService.findOne(orderId);

    if (order.status !== OrderStatus.CLOSED) {
      throw new BadRequestException(
        'Order must be closed to create checkout session',
      );
    }

    const paymentAmount = order.total;

    try {
      // 1. Crear la sesión de checkout en Stripe
      const session = await this.stripeService.createCheckoutSession(
        paymentAmount,
        orderId,
        {
          description: `Orden ${orderId}`,
          customerPhone: order.customer?.phone,
          successUrl: options?.successUrl,
          cancelUrl: options?.cancelUrl,
        },
      );

      // 2. Registrar el pago en la base de datos
      const payment = await this.create({
        orderId,
        amount: paymentAmount,
        method: PaymentMethod.CARD, // Checkout session típicamente es para tarjetas
        paymentGateway: 'stripe',
        metadata: {
          checkoutSessionId: session.id,
          checkoutUrl: session.url,
          customerPhone: order.customer?.phone,
        },
      });

      // 3. Actualizar el pago con el ID externo y status
      payment.status = PaymentStatus.PROCESSING;
      payment.externalPaymentId = session.id;
      payment.processedAt = new Date();
      await this.paymentRepo.save(payment);

      return {
        paymentId: payment.id,
        sessionId: session.id,
        url: session.url,
        amount: paymentAmount,
        currency: 'mxn',
        expiresAt: new Date(session.expires_at * 1000),
        transactionId: payment.transactionId,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }
}
