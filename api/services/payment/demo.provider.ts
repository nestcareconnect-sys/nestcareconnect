import crypto from 'crypto';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  VerificationResult,
} from './paymentProvider.interface.js';

export class DemoPaymentProvider implements PaymentProvider {
  name = 'DEMO';

  /**
   * Create simulated Demo Payment Order
   */
  async createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult> {
    const randomHex = crypto.randomBytes(4).toString('hex');
    const demoOrderId = `demo_ord_${Date.now()}_${randomHex}`;

    return {
      provider: 'DEMO',
      providerOrderId: demoOrderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      metadata: {
        isDemoPayment: true,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        notes: params.notes,
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Verify / Simulate Demo Payment status
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    const randomHex = crypto.randomBytes(4).toString('hex');
    const transactionId = params.paymentId || `demo_pay_${Date.now()}_${randomHex}`;
    const action = (params.rawBody?.action || 'SUCCESS').toUpperCase();

    if (action === 'FAILED') {
      return {
        success: false,
        transactionId,
        amount: 0,
        currency: 'INR',
        status: 'FAILED',
        rawResponse: { mode: 'DEMO', action: 'FAILED', processedAt: new Date().toISOString() },
      };
    }

    if (action === 'PENDING') {
      return {
        success: true,
        transactionId,
        amount: 0,
        currency: 'INR',
        status: 'PENDING',
        rawResponse: { mode: 'DEMO', action: 'PENDING', processedAt: new Date().toISOString() },
      };
    }

    return {
      success: true,
      transactionId,
      amount: 0,
      currency: 'INR',
      status: 'PAID',
      rawResponse: { mode: 'DEMO', action: 'SUCCESS', verifiedAt: new Date().toISOString() },
    };
  }
}
