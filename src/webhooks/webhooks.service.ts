import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../payments/services/stripe.service';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
  ) {}

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    this.logger.log('Received Stripe webhook');
    this.logger.debug(`Raw body length: ${rawBody?.length}`);
    this.logger.debug(`Signature present: ${!!signature}`);

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody) {
      this.logger.error('Missing request body');
      throw new BadRequestException('Missing request body');
    }

    let event;
    try {
      // Verificar que el webhook viene realmente de Stripe
      event = this.stripeService.verifyWebhook(rawBody, signature);
      this.logger.log(`Webhook verified successfully: ${event.type}`);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Processing event: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'charge.dispute.created':
          await this.handleDispute(event.data.object);
          break;

        case 'payment_intent.requires_action':
          await this.handleRequiresAction(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      this.logger.log(`Successfully processed webhook event: ${event.type}`);
    } catch (error) {
      this.logger.error('Error processing webhook event', error);
      throw error;
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) {
      this.logger.warn('No orderId in payment intent metadata');
      return;
    }

    const order = await this.ordersService.findOne(orderId);

    try {
      // 1. Buscar el pago en nuestra base de datos
      const payments = await this.paymentsService.findByOrder(orderId);
      const payment = payments.find(
        (p) =>
          p.externalPaymentId === paymentIntent.id ||
          p.status === PaymentStatus.PROCESSING,
      );

      if (payment) {
        // 2. Actualizar el pago
        await this.paymentsService.update(payment.id, {
          status: PaymentStatus.COMPLETED,
          externalPaymentId: paymentIntent.id,
        });

        // 3. Marcar la orden como pagada
        await this.ordersService.paid(orderId);

        // 4. Limpiar el threadId del cliente para una nueva conversación
        await this.customersService.update(order.customer.id, {
          threadId: undefined,
        });

        // 5. TODO: Enviar WhatsApp de confirmación
        // await this.whatsappService.sendPaymentConfirmation(orderId);

        this.logger.log(`Order ${orderId} marked as paid`);
      } else {
        this.logger.warn(`Payment not found for order ${orderId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling payment success for order ${orderId}`,
        error,
      );
    }
  }

  private async handlePaymentFailed(paymentIntent: any) {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) {
      this.logger.warn('No orderId in payment intent metadata');
      return;
    }

    try {
      const payments = await this.paymentsService.findByOrder(orderId);
      const payment = payments.find(
        (p) =>
          p.externalPaymentId === paymentIntent.id ||
          p.status === PaymentStatus.PROCESSING,
      );

      if (payment) {
        await this.paymentsService.update(payment.id, {
          status: PaymentStatus.FAILED,
          failureReason:
            paymentIntent.last_payment_error?.message || 'Payment failed',
        });

        // TODO: Enviar WhatsApp de fallo
        // await this.whatsappService.sendPaymentFailure(orderId);

        this.logger.log(`Payment marked as failed for order ${orderId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling payment failure for order ${orderId}`,
        error,
      );
    }
  }

  private async handleCheckoutSessionCompleted(session: any) {
    this.logger.log(`Checkout session completed: ${session.id}`);

    const orderId = session.metadata.orderId;
    if (!orderId) {
      this.logger.warn('No orderId in checkout session metadata');
      return;
    }

    try {
      // 1. Buscar el pago en nuestra base de datos
      let payments = await this.paymentsService.findByOrder(orderId);
      let payment = payments.find(
        (p) =>
          p.externalPaymentId === session.id ||
          p.status === PaymentStatus.PROCESSING ||
          (p.metadata && p.metadata['checkoutSessionId'] === session.id),
      );

      if (!payment) {
        // Si no existe, crear el pago (fallback para casos legacy)
        this.logger.warn(
          `Creating payment for order ${orderId} from webhook - this should not happen normally`,
        );
        payment = await this.paymentsService.create({
          orderId,
          amount: session.amount_total / 100, // Stripe usa centavos
          method: 'card' as any,
          paymentGateway: 'stripe',
          metadata: {
            checkoutSessionId: session.id,
            customerPhone: session.metadata.customerPhone,
          },
        });
      }

      // 2. Actualizar el pago como completado
      payment.status = PaymentStatus.COMPLETED;
      payment.externalPaymentId = session.payment_intent;
      payment.completedAt = new Date();
      payment.metadata = {
        ...payment.metadata,
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent,
      };

      await this.paymentsService.update(payment.id, {
        status: PaymentStatus.COMPLETED,
        externalPaymentId: session.payment_intent,
      });

      // 3. Marcar la orden como pagada
      await this.ordersService.paid(orderId);

      // 4. TODO: Enviar WhatsApp de confirmación
      // await this.whatsappService.sendPaymentConfirmation(orderId);

      this.logger.log(`Order ${orderId} marked as paid via checkout session`);
    } catch (error) {
      this.logger.error(
        `Error handling checkout session completion for order ${orderId}`,
        error,
      );
    }
  }

  private async handleDispute(charge: any) {
    this.logger.log(`Dispute created: ${charge.id}`);

    // TODO: Implementar manejo de disputas
    // - Notificar al administrador
    // - Marcar la orden como en disputa
    // - Preparar evidencia automática
  }

  private async handleRequiresAction(paymentIntent: any) {
    this.logger.log(`Payment requires action: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata.orderId;
    if (orderId) {
      // TODO: Notificar al cliente que necesita completar la acción
      // await this.whatsappService.sendPaymentActionRequired(orderId, paymentIntent.next_action);
    }
  }
}
