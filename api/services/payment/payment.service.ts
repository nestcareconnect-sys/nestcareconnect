import { PaymentProvider, CreatePaymentParams, PaymentOrderResult, VerifyPaymentParams, VerificationResult } from './paymentProvider.interface.js';
import { RazorpayProvider } from './razorpay.provider.js';
import { StripeProvider } from './stripe.provider.js';

class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.registerProvider('RAZORPAY', new RazorpayProvider());
    this.registerProvider('STRIPE', new StripeProvider());
  }

  registerProvider(name: string, provider: PaymentProvider) {
    this.providers.set(name.toUpperCase(), provider);
  }

  get isDemoMode(): boolean {
    return false;
  }

  getProviderForCountry(_country: string): PaymentProvider {
    return this.providers.get('STRIPE') || new StripeProvider();
  }

  getProviderByName(name: string): PaymentProvider {
    const normalized = (name || '').toUpperCase();
    if (normalized === 'DEMO') {
      throw new Error(
        'Demo payment mode is disabled. Nest Care Connect uses Stripe Payment Gateway for transactions.'
      );
    }
    const provider = this.providers.get(normalized);
    if (!provider) {
      return this.providers.get('STRIPE') || new StripeProvider();
    }
    return provider;
  }

  async createPaymentSession(params: CreatePaymentParams, providerName?: string): Promise<PaymentOrderResult> {
    const targetProvider = (providerName && providerName.toUpperCase() !== 'DEMO')
      ? this.getProviderByName(providerName)
      : this.getProviderByName('STRIPE');
    return await targetProvider.createPaymentOrder(params);
  }

  async verifyPayment(params: VerifyPaymentParams, providerName?: string): Promise<VerificationResult> {
    const targetName = (providerName && providerName.toUpperCase() !== 'DEMO') ? providerName : 'STRIPE';
    const provider = this.getProviderByName(targetName);
    return await provider.verifyPayment(params);
  }
}

export const paymentService = new PaymentService();
