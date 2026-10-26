import crypto from 'crypto';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  VerificationResult,
} from './paymentProvider.interface.js';
import { isPlaceholderKey } from '../../config/envValidation.js';

export class RazorpayProvider implements PaymentProvider {
  name = 'RAZORPAY';

  get keyId(): string {
    return process.env.RAZORPAY_KEY_ID?.trim() || '';
  }

  get keySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  }

  get webhookSecret(): string {
    return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';
  }

  get isLiveMode(): boolean {
    return this.keyId.startsWith('rzp_live_');
  }

  get mode(): 'live' | 'test' {
    return this.isLiveMode ? 'live' : 'test';
  }

  /**
   * Validate credentials before interacting with Razorpay API
   */
  private validateCredentials(): void {
    if (!this.keyId || !this.keySecret || isPlaceholderKey(this.keyId) || isPlaceholderKey(this.keySecret)) {
      throw new Error(
        'Razorpay API credentials are not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.'
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !this.isLiveMode) {
      throw new Error(
        'Production environment requires Razorpay Live credentials (RAZORPAY_KEY_ID starting with "rzp_live_"). Test Mode credentials cannot process live customer payments.'
      );
    }
  }

  /**
   * Create official Razorpay Order via REST API
   * Converts INR amount to paise (1 INR = 100 paise)
   */
  async createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult> {
    this.validateCredentials();

    const amountInPaise = Math.round(params.amount * 100);

    if (amountInPaise <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }

    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: params.currency || 'INR',
          receipt: params.orderNumber,
          notes: {
            ...params.notes,
            orderId: params.orderId,
            orderNumber: params.orderNumber,
            customerName: params.customer?.name || '',
            customerEmail: params.customer?.email || '',
            mode: this.mode,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData?.error?.description ||
          errData?.message ||
          `Razorpay Orders API returned HTTP ${response.status} (${response.statusText})`;
        console.error('[RazorpayProvider] Orders API error:', response.status, errData);
        throw new Error(`Razorpay order creation failed: ${errMsg}`);
      }

      const data = await response.json();
      return {
        provider: 'RAZORPAY',
        providerOrderId: data.id,
        amount: params.amount,
        currency: params.currency || 'INR',
        keyId: this.keyId,
        metadata: {
          ...data,
          gatewayMode: this.mode,
        },
      };
    } catch (err: any) {
      console.error('[RazorpayProvider] createPaymentOrder exception:', err.message);
      throw err;
    }
  }

  /**
   * Fetch payment entity directly from Razorpay REST API
   */
  async fetchPaymentDetails(paymentId: string): Promise<any> {
    this.validateCredentials();
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.description || `HTTP ${response.status} (${response.statusText})`;
      throw new Error(`Failed to fetch payment details from Razorpay: ${errMsg}`);
    }

    return await response.json();
  }

  /**
   * Verify HMAC SHA256 Signature for Razorpay Checkout
   * Strictly cryptographically verified — no simulated bypasses allowed.
   */
  async verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult> {
    const { providerOrderId, paymentId, signature } = params;

    if (!providerOrderId || !paymentId || !signature) {
      return {
        success: false,
        transactionId: paymentId || '',
        amount: 0,
        currency: 'INR',
        status: 'FAILED',
        rawResponse: { error: 'Missing paymentId, providerOrderId, or signature' },
      };
    }

    if (!this.keySecret || isPlaceholderKey(this.keySecret)) {
      throw new Error('Razorpay Key Secret is not configured in backend environment variables.');
    }

    // Official Razorpay HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${providerOrderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');
    const isSignatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isSignatureValid) {
      console.warn('[RazorpayProvider] Cryptographic signature mismatch!', {
        paymentId,
        providerOrderId,
      });
      return {
        success: false,
        transactionId: paymentId,
        amount: 0,
        currency: 'INR',
        status: 'FAILED',
        rawResponse: { error: 'Invalid HMAC-SHA256 signature mismatch' },
      };
    }

    // Attempt to enrich with authoritative Razorpay transaction metadata
    let paymentDetails: any = null;
    try {
      paymentDetails = await this.fetchPaymentDetails(paymentId);

      // Verify that Razorpay's payment record actually points to this order
      if (paymentDetails.order_id && paymentDetails.order_id !== providerOrderId) {
        console.error('[RazorpayProvider] Payment order ID mismatch! Expected:', providerOrderId, 'Got:', paymentDetails.order_id);
        return {
          success: false,
          transactionId: paymentId,
          amount: 0,
          currency: 'INR',
          status: 'FAILED',
          rawResponse: { error: 'Payment order ID mismatch with Razorpay record' },
        };
      }
    } catch (fetchErr: any) {
      console.warn('[RazorpayProvider] Could not fetch payment details from Razorpay API:', fetchErr.message);
    }

    const verifiedAmount = paymentDetails?.amount ? paymentDetails.amount / 100 : 0;
    const verifiedCurrency = paymentDetails?.currency || 'INR';

    return {
      success: true,
      transactionId: paymentId,
      amount: verifiedAmount,
      currency: verifiedCurrency,
      status: 'PAID',
      rawResponse: paymentDetails || {
        paymentId,
        orderId: providerOrderId,
        signatureVerified: true,
        verifiedAt: new Date().toISOString(),
        gatewayMode: this.mode,
      },
    };
  }

  /**
   * Verify Razorpay Webhook Signature
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature || !rawBody) return false;
    const secret = this.webhookSecret || this.keySecret;
    if (!secret || isPlaceholderKey(secret)) return false;

    try {
      const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(signature, 'utf8');
      return (
        expectedBuf.length === receivedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, receivedBuf)
      );
    } catch (err: any) {
      console.error('[RazorpayProvider] Webhook verification exception:', err.message);
      return false;
    }
  }
}
