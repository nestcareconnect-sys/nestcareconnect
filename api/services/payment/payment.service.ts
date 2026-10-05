import { PaymentProvider, CreatePaymentParams, PaymentOrderResult, VerifyPaymentParams, VerificationResult } from './paymentProvider.interface.js';
import { RazorpayProvider } from './razorpay.provider.js';
import { StripeProvider } from './stripe.provider.js';
import { DemoPaymentProvider } from './demo.provider.js';

class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.registerProvider('RAZORPAY', new RazorpayProvider());
    this.registerProvider('STRIPE', new StripeProvider());
    this.registerProvider('DEMO', new DemoPaymentProvider());
  }

  registerProvider(name: string, provider: PaymentProvider) {
    this.providers.set(name.toUpperCase(), provider);
  }

  get isDemoMode(): boolean {
    return (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'demo';
  }

  getProviderForCountry(country: string): PaymentProvider {
    if (this.isDemoMode) {
      return this.providers.get('DEMO') || new DemoPaymentProvider();
    }
    if (country === 'IN') {
      return this.providers.get('RAZORPAY') || new RazorpayProvider();
    }
    return this.providers.get('STRIPE') || new StripeProvider();
  }

  getProviderByName(name: string): PaymentProvider {
    if (this.isDemoMode && (!name || name.toUpperCase() !== 'STRIPE')) {
      return this.providers.get('DEMO') || new DemoPaymentProvider();
    }
    const provider = this.providers.get(name.toUpperCase());
    if (!provider) {
      return this.isDemoMode
        ? this.providers.get('DEMO') || new DemoPaymentProvider()
        : this.providers.get('RAZORPAY') || new RazorpayProvider();
    }
    return provider;
  }

  async createPaymentSession(params: CreatePaymentParams, providerName?: string): Promise<PaymentOrderResult> {
    const effectiveProviderName = this.isDemoMode ? 'DEMO' : providerName;
    const provider = effectiveProviderName
      ? this.getProviderByName(effectiveProviderName)
      : this.getProviderForCountry(params.notes?.country || 'IN');
    return await provider.createPaymentOrder(params);
  }

  async verifyPayment(params: VerifyPaymentParams, providerName?: string): Promise<VerificationResult> {
    const effectiveProviderName = this.isDemoMode ? 'DEMO' : (providerName || 'RAZORPAY');
    const provider = this.getProviderByName(effectiveProviderName);
    return await provider.verifyPayment(params);
  }
}

export const paymentService = new PaymentService();

