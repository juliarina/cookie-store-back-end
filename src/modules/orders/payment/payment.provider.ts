export interface CreatePaymentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export type PaymentResultStatus = 'PAID' | 'PENDING' | 'FAILED';

export interface PaymentResult {
  providerPaymentId: string;
  status: PaymentResultStatus;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
}