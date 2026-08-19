import { ApiError } from '../../../utils/ApiError.js';
import type {
  CreatePaymentParams,
  PaymentProvider,
  PaymentResult,
} from './payment.provider.js';

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createPayment(_params: CreatePaymentParams): Promise<PaymentResult> {
    throw ApiError.internal('Stripe integration is not configured yet');
  }
}