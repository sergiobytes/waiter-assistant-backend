export interface PaymentGatewayConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  sandboxMode?: boolean;
}

export interface PaymentConfig {
  gateways: {
    stripe: PaymentGatewayConfig;
  };
  defaultCurrency: string;
  allowedMethods: string[];
}

export const paymentConfig: PaymentConfig = {
  gateways: {
    stripe: {
      name: 'Stripe',
      enabled: process.env.STRIPE_ENABLED === 'true',
      apiKey: process.env.STRIPE_API_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      sandboxMode: process.env.NODE_ENV !== 'production',
    },
  },
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'MXN',
  allowedMethods: (
    process.env.ALLOWED_PAYMENT_METHODS || 'CASH,CARD,DIGITAL_WALLET'
  ).split(','),
};
