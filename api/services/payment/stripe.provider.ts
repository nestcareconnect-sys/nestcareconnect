import Stripe from 'stripe';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  VerificationResult,
} from './paymentProvider.interface.js';
import { isPlaceholderKey } from '../../config/envValidation.js';

export class StripeProvider implements PaymentProvider {
  name = 'STRIPE';
  private stripeClient: Stripe | null = null;

  get secretKey(): string {
    return (process.env.STRIPE_SECRET_KEY || '').trim();
  }

  get publishableKey(): string {
    return (
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
      ''
    ).trim();
  }

  get webhookSecret(): string {
    return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  }

  get isLiveMode(): boolean {
    return this.publishableKey.startsWith('pk_live_') || this.secretKey.startsWith('sk_live_');
  }

  get mode(): 'live' | 'test' {
    return this.isLiveMode ? 'live' : 'test';
  }

  private getStripe(): Stripe {
    if (!this.secretKey || isPlaceholderKey(this.secretKey)) {
      throw new Error(
        'Stripe API credentials are not configured. Please set a valid STRIPE_SECRET_KEY in your environment.'
      );
    }
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(this.secretKey);
    }
    return this.stripeClient;
  }

  /**
   * Create official Stripe PaymentIntent
   */
  async createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult> {
    const rawCurrency = (params.currency || 'INR').toLowerCase();
    // Stripe zero-decimal currencies (JPY, etc.) vs standard currencies (INR, USD, AED, etc.)
    const isZeroDecimal = ['jpy', 'krw', 'vnd', 'clp', 'pyg'].includes(rawCurrency);
    const amountInSmallestUnit = isZeroDecimal
      ? Math.round(params.amount)
      : Math.round(params.amount * 100);

    if (amountInSmallestUnit <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }

    // Check if real Stripe credentials are provided
    if (this.secretKey && !isPlaceholderKey(this.secretKey)) {
      try {
        const stripe = this.getStripe();
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInSmallestUnit,
          currency: rawCurrency,
          description: `Nest Care Connect Order #${params.orderNumber}`,
          metadata: {
            orderId: params.orderId,
            orderNumber: params.orderNumber,
            customerName: params.customer?.name || '',
            customerEmail: params.customer?.email || '',
            customerPhone: params.customer?.phone || '',
          },
          receipt_email: params.customer?.email && params.customer.email.includes('@')
            ? params.customer.email
            : undefined,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        return {
          provider: 'STRIPE',
          providerOrderId: paymentIntent.id,
          amount: params.amount,
          currency: params.currency || 'INR',
          clientSecret: paymentIntent.client_secret || undefined,
          publishableKey: this.publishableKey,
          metadata: paymentIntent as any,
        };
      } catch (err: any) {
        console.error('[StripeProvider] createPaymentOrder failed:', err.message);
        throw new Error(`Stripe payment intent creation failed: ${err.message}`);
      }
    }

    // Sandbox / Mock fallback when test keys haven't been pasted yet
    const mockIntentId = `pi_stripe_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 12)}`;

    console.warn(
      '[StripeProvider] STRIPE_SECRET_KEY is placeholder or unset. Using simulated PaymentIntent for development sandbox.'
    );

    return {
      provider: 'STRIPE',
      providerOrderId: mockIntentId,
      amount: params.amount,
      currency: params.currency || 'INR',
      clientSecret: mockClientSecret,
      publishableKey: this.publishableKey || 'pk_test_placeholder',
      metadata: { mock: true },
    };
  }

  /**
   * Verify Payment status by retrieving PaymentIntent from Stripe API
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    const intentId = (params.paymentId || params.providerOrderId || '').trim();

    if (!intentId) {
      throw new Error('Payment Intent ID is required for Stripe verification.');
    }

    // Mock verification fallback
    if (intentId.startsWith('pi_stripe_mock_') || isPlaceholderKey(this.secretKey)) {
      console.warn('[StripeProvider] Verifying mock PaymentIntent:', intentId);
      return {
        success: true,
        transactionId: intentId,
        amount: 0,
        currency: 'INR',
        status: 'PAID',
        rawResponse: { mock: true, intentId },
      };
    }

    try {
      const stripe = this.getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

      const isZeroDecimal = ['jpy', 'krw', 'vnd', 'clp', 'pyg'].includes(
        paymentIntent.currency.toLowerCase()
      );
      const paidAmount = isZeroDecimal
        ? (paymentIntent.amount_received || paymentIntent.amount)
        : (paymentIntent.amount_received || paymentIntent.amount) / 100;

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paidAmount,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'PAID',
          rawResponse: paymentIntent,
        };
      } else if (
        paymentIntent.status === 'processing' ||
        paymentIntent.status === 'requires_capture'
      ) {
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paidAmount,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'PENDING',
          rawResponse: paymentIntent,
        };
      } else {
        return {
          success: false,
          transactionId: paymentIntent.id,
          amount: paidAmount,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'FAILED',
          rawResponse: paymentIntent,
        };
      }
    } catch (err: any) {
      console.error('[StripeProvider] verifyPayment error:', err.message);
      throw new Error(`Failed to verify payment with Stripe: ${err.message}`);
    }
  }

  /**
   * Cryptographically construct and verify Stripe Webhook event
   */
  constructWebhookEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret || isPlaceholderKey(this.webhookSecret)) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured on the server.');
    }
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }
}
