import crypto from 'node:crypto';
import type {
  CreatePaymentParams,
  PaymentProvider,
  PaymentResult,
} from './payment.provider.js';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createPayment(_params: CreatePaymentParams): Promise<PaymentResult> {
    return {
      providerPaymentId: `mock_${crypto.randomUUID()}`,
      status: 'PAID',
    };
  }
}