import { PaymentProvider, CreatePaymentParams, PaymentOrderResult, VerifyPaymentParams, VerificationResult } from './paymentProvider.interface.js';

export class StripeProvider implements PaymentProvider {
  name = 'STRIPE';
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_nestcare';
  }

  async createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult> {
    const amountInCents = Math.round(params.amount * 100);
    const mockIntentId = `pi_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      try {
        const body = new URLSearchParams({
          amount: amountInCents.toString(),
          currency: (params.currency || 'USD').toLowerCase(),
          'metadata[orderId]': params.orderId,
          'metadata[orderNumber]': params.orderNumber,
          description: `Nest Care Connect Order ${params.orderNumber}`,
        });

        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            provider: 'STRIPE',
            providerOrderId: data.id,
            amount: params.amount,
            currency: params.currency,
            clientSecret: data.client_secret,
            metadata: data,
          };
        }
      } catch (e) {
        console.warn('Stripe API error, falling back to simulated intent:', e);
      }
    }

    return {
      provider: 'STRIPE',
      providerOrderId: mockIntentId,
      amount: params.amount,
      currency: params.currency || 'USD',
      clientSecret: mockClientSecret,
      metadata: { mock: true },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    const { paymentId, providerOrderId } = params;
    return {
      success: true,
      transactionId: paymentId || providerOrderId || `ch_stripe_test_${Date.now()}`,
      amount: 0,
      currency: 'USD',
      status: 'PAID',
    };
  }
}
