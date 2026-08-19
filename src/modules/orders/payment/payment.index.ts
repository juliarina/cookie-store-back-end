import { env } from '../../../config/env.js';
import { MockPaymentProvider } from './mockPayment.provider.js';
import { StripePaymentProvider } from './stripe.provider.js';
import type { PaymentProvider } from './payment.provider.js';

let provider: PaymentProvider | null = null;

export const getPaymentProvider = (): PaymentProvider => {
  if (!provider) {
    provider = env.PAYMENT_PROVIDER === 'stripe' ? new StripePaymentProvider() : new MockPaymentProvider();
  }
  return provider;
};