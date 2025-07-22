import { Injectable, Logger } from '@nestjs/common';
import { paymentConfig } from '../../config/payment.config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    if (
      paymentConfig.gateways.stripe.enabled &&
      paymentConfig.gateways.stripe.secretKey
    ) {
      this.stripe = new Stripe(paymentConfig.gateways.stripe.secretKey, {
        apiVersion: '2025-06-30.basil',
      });
      this.logger.log('Stripe service initialized');
    } else {
      this.logger.warn('Stripe not configured - running in simulation mode');
    }
  }

  /**
   * Crea un Payment Intent en Stripe
   */
  async createPaymentIntent(amount: number, orderId: string, metadata?: any) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe usa centavos
        currency: 'mxn',
        metadata: {
          orderId,
          ...metadata,
        },
        payment_method_types: ['card', 'oxxo'],
      });

      return paymentIntent;
    } catch (error) {
      this.logger.error('Error creating Stripe Payment Intent', error);
      throw error;
    }
  }

  /**
   * Confirma un pago en Stripe
   */
  async confirmPayment(paymentIntentId: string, paymentMethodId: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        { payment_method: paymentMethodId },
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error('Error confirming Stripe payment', error);
      throw error;
    }
  }

  /**
   * Crea un reembolso en Stripe
   */
  async createRefund(chargeId: string, amount?: number, reason?: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: (reason as any) || 'requested_by_customer',
      });

      return refund;
    } catch (error) {
      this.logger.error('Error creating Stripe refund', error);
      throw error;
    }
  }

  /**
   * Verifica webhook de Stripe
   */
  verifyWebhook(payload: string | Buffer, signature: string): any {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        paymentConfig.gateways.stripe.webhookSecret!,
      );
    } catch (error) {
      this.logger.error('Error verifying Stripe webhook', error);
      throw error;
    }
  }

  /**
   * Obtiene información de un pago
   */
  async getPaymentIntent(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Error retrieving Stripe Payment Intent', error);
      throw error;
    }
  }

  /**
   * Crea una sesión de checkout en Stripe
   */
  async createCheckoutSession(
    amount: number,
    orderId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
      description?: string;
      customerPhone?: string;
    },
  ) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card', 'oxxo'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: options?.description || `Orden ${orderId}`,
              },
              unit_amount: Math.round(amount * 100), // Stripe usa centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url:
          options?.successUrl ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          options?.cancelUrl ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
        metadata: {
          orderId,
          customerPhone: options?.customerPhone || '',
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutos
      });

      return session;
    } catch (error) {
      this.logger.error('Error creating Stripe Checkout Session', error);
      throw error;
    }
  }

  /**
   * Obtiene información de una sesión de checkout
   */
  async getCheckoutSession(sessionId: string) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error('Error retrieving Stripe Checkout Session', error);
      throw error;
    }
  }
}
