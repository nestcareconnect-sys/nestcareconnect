import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Order } from '../../types';
import { paymentsApi } from '../../services/api';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  order: Order | null;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

// Embedded Stripe Checkout Form
const StripePaymentForm: React.FC<{
  order: Order;
  onSuccess: (orderId: string) => void;
  formatPrice: (amount: number) => string;
}> = ({ order, onSuccess, formatPrice }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success/${order.id}`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setErrorMessage(
          result.error.message || 'Payment transaction failed. Please check card details.'
        );
        setIsProcessing(false);
        return;
      }

      const intent = result.paymentIntent;
      if (
        intent &&
        (intent.status === 'succeeded' || intent.status === 'processing')
      ) {
        // Authoritative server-side verification
        const verifyRes = await paymentsApi.verifyStripePayment({
          orderId: order.id,
          paymentIntentId: intent.id,
        });

        if (verifyRes.data?.success) {
          setIsProcessing(false);
          onSuccess(order.id);
        } else {
          setErrorMessage(
            verifyRes.data?.message || 'Payment verification failed on the server.'
          );
          setIsProcessing(false);
        }
      } else {
        setErrorMessage('Payment could not be completed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('[Stripe] confirmPayment error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Payment processing error.'
      );
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-200/80">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs text-red-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Payment Unsuccessful</span>
          </div>
          <p className="text-[11px] text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing with Stripe...</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Pay Securely {formatPrice(order.total)}</span>
          </>
        )}
      </button>
    </form>
  );
};

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  order,
  onSuccess,
  onCancel,
}) => {
  const { formatPrice } = useCountryCurrency();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string>('');
  const [isLiveGateway, setIsLiveGateway] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulatingMock, setIsSimulatingMock] = useState(false);

  // Initialize or fetch payment session whenever modal opens
  useEffect(() => {
    if (isOpen && order) {
      setErrorMessage(null);
      setIsLoadingSession(true);
      setClientSecret(null);

      paymentsApi
        .createPaymentSession({
          orderId: order.id,
          providerName: 'STRIPE',
        })
        .then((res) => {
          if (res.data?.success && res.data.data) {
            const data = res.data.data;
            const key =
              data.publishableKey ||
              import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
              '';
            setPublishableKey(key);
            setIsLiveGateway(key.startsWith('pk_live_'));
            setClientSecret(data.clientSecret || null);
          } else {
            throw new Error('Failed to create Stripe payment intent.');
          }
        })
        .catch((err) => {
          console.error('[Stripe] Failed to create payment session:', err);
          setErrorMessage(
            err.response?.data?.message ||
              err.message ||
              'Unable to initialize Stripe payment. Please check your network and try again.'
          );
        })
        .finally(() => {
          setIsLoadingSession(false);
        });
    }
  }, [isOpen, order]);

  // Load Stripe instance
  const stripePromise = useMemo(() => {
    if (!publishableKey || publishableKey.includes('placeholder')) {
      return null;
    }
    return loadStripe(publishableKey);
  }, [publishableKey]);

  // Handle mock simulation when running in sandbox without active Stripe credentials
  const isMockMode =
    !stripePromise ||
    (clientSecret && clientSecret.startsWith('pi_stripe_mock_'));

  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsSimulatingMock(true);
    setErrorMessage(null);

    try {
      const res = await paymentsApi.verifyStripePayment({
        orderId: order.id,
        paymentIntentId: clientSecret || `pi_sim_${Date.now()}`,
      });

      if (res.data?.success) {
        onSuccess(order.id);
      } else {
        setErrorMessage(res.data?.message || 'Sandbox verification failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Payment failed.');
    } finally {
      setIsSimulatingMock(false);
    }
  };

  if (!order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#237A3B] text-white p-5 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-xs text-[#8BCF9B] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>256-Bit SSL Encrypted Checkout</span>
                </div>
                <h3 className="font-extrabold text-xl mt-0.5">
                  Pay {formatPrice(order.total)}
                </h3>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                <div className="px-2.5 py-1 bg-white/20 rounded-lg border border-white/30 text-[10px] font-black tracking-widest uppercase">
                  {isLiveGateway ? 'STRIPE LIVE' : 'STRIPE'}
                </div>
                <button
                  onClick={onCancel}
                  disabled={isLoadingSession || isSimulatingMock}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Order Summary Card */}
              <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">
                    Order #
                  </span>
                  <span className="font-mono font-bold text-gray-900 truncate block">
                    {order.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">
                    Currency
                  </span>
                  <span className="font-bold text-[#237A3B]">{order.currency}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">
                    Payable Amount
                  </span>
                  <span className="font-extrabold text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Stripe Information Banner */}
              <div className="p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/50 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#237A3B] font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Official Stripe Payment Gateway</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Enter your card or wallet credentials below. Stripe processes payments securely with end-to-end tokenization and 3D Secure fraud prevention.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] font-semibold text-gray-500">
                  <span className="px-2 py-0.5 bg-white rounded-md border border-gray-200 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#237A3B]" /> Credit & Debit Cards (Visa, Mastercard, Amex, RuPay)
                  </span>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingSession && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#237A3B]" />
                  <p className="text-xs font-semibold">Initializing secure Stripe checkout...</p>
                </div>
              )}

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs text-red-800">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Payment Initialization Failed</span>
                  </div>
                  <p className="text-[11px] text-red-700">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setIsLoadingSession(true);
                      paymentsApi
                        .createPaymentSession({
                          orderId: order.id,
                          providerName: 'STRIPE',
                        })
                        .then((res) => {
                          if (res.data?.success && res.data.data) {
                            setClientSecret(res.data.data.clientSecret || null);
                          }
                        })
                        .finally(() => setIsLoadingSession(false));
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Real Stripe Elements Checkout */}
              {!isLoadingSession && !isMockMode && clientSecret && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#237A3B',
                        colorBackground: '#ffffff',
                        colorText: '#1f2937',
                        colorDanger: '#dc2626',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        borderRadius: '12px',
                        spacingUnit: '4px',
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    order={order}
                    onSuccess={onSuccess}
                    formatPrice={formatPrice}
                  />
                </Elements>
              )}

              {/* Simulated Sandbox Mode when keys are placeholders */}
              {!isLoadingSession && isMockMode && !errorMessage && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Stripe Sandbox / Test Environment</span>
                  </div>
                  <p className="text-amber-700 text-[11px] leading-relaxed">
                    Stripe API credentials (<code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[10px]">STRIPE_SECRET_KEY</code> / <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[10px]">STRIPE_PUBLISHABLE_KEY</code>) can be configured in your <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-[10px]">.env</code> file. In development sandbox, you can simulate a successful transaction below.
                  </p>

                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={isSimulatingMock}
                    className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSimulatingMock ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Simulating Stripe Confirmation...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Confirm Sandbox Payment ({formatPrice(order.total)})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Security Footer Note */}
              <div className="pt-2 text-center">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Stripe 256-Bit Encryption • PCI-DSS Level 1 Certified • Live Order Reconciliation</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
