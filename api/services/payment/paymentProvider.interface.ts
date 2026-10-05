export interface CreatePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in minor units or base units depending on gateway
  currency: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  provider: 'RAZORPAY' | 'STRIPE' | 'COD' | 'DEMO';
  providerOrderId: string;
  amount: number;
  currency: string;
  clientSecret?: string; // For Stripe
  keyId?: string; // For Razorpay
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId?: string;
  providerOrderId?: string;
  signature?: string;
  rawBody?: any;
}

export interface VerificationResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
  rawResponse?: any;
}

export interface PaymentProvider {
  name: string;
  createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerificationResult>;
  refundPayment?(paymentId: string, amount?: number): Promise<boolean>;
}
