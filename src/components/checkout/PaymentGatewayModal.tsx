import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Smartphone,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { Order } from '../../types';
import { paymentsApi } from '../../services/api';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  order: Order | null;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  order,
  onSuccess,
  onCancel,
}) => {
  const { formatPrice } = useCountryCurrency();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [configuredKeyId, setConfiguredKeyId] = useState<string>('');
  const [isLiveGateway, setIsLiveGateway] = useState<boolean>(false);

  // Load Razorpay Checkout SDK Script
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-sdk')) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load checkout.js script.');
      setRazorpayLoaded(false);
    };
    document.body.appendChild(script);
  }, []);

  // Fetch public gateway configuration from backend on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsProcessing(false);

      paymentsApi
        .getConfig()
        .then((res) => {
          if (res.data?.success && res.data.data?.keyId) {
            setConfiguredKeyId(res.data.data.keyId);
            setIsLiveGateway(res.data.data.isLive);
          }
        })
        .catch((err) => {
          console.warn('[Razorpay] Could not fetch public key config:', err);
        });
    }
  }, [isOpen]);

  // Open Razorpay Standard Checkout Popup
  const handleLaunchRazorpay = useCallback(async () => {
    if (!order) return;
    if (isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Request official Razorpay order from backend
      const orderRes = await paymentsApi.createPaymentSession({
        orderId: order.id,
        providerName: 'RAZORPAY',
      });

      const orderData = orderRes.data?.data;
      if (!orderData || !orderData.providerOrderId) {
        throw new Error('Failed to create Razorpay payment order on the server.');
      }

      // 2. Resolve public Key ID (Backend authoritative response takes precedence, fallback to env or cached config)
      const keyId =
        orderData.keyId ||
        configuredKeyId ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!keyId || keyId.includes('placeholder') || keyId.includes('actual_key')) {
        throw new Error(
          'Razorpay credentials are not configured. Please ensure RAZORPAY_KEY_ID is properly configured in your environment.'
        );
      }

      if (typeof (window as any).Razorpay !== 'function') {
        throw new Error('Razorpay Checkout SDK is still loading. Please try again in a few moments.');
      }

      // 3. Configure Razorpay Standard Modal Options
      const options = {
        key: keyId,
        amount: orderData.amountPaise || Math.round(order.total * 100),
        currency: orderData.currency || 'INR',
        name: 'Nest Care Connect',
        description: `Care Hamper Order #${order.orderNumber}`,
        order_id: orderData.providerOrderId,
        prefill: {
          name: orderData.customer?.name || '',
          email: orderData.customer?.email || '',
          contact: orderData.customer?.phone || '',
        },
        theme: {
          color: '#237A3B',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Send payment credentials to backend for cryptographic HMAC-SHA256 verification
            const verifyRes = await paymentsApi.verifyRazorpayPayment({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              setIsProcessing(false);
              onSuccess(order.id);
            } else {
              setErrorMessage(
                verifyRes.data?.message || 'Payment verification failed. Please contact support.'
              );
              setIsProcessing(false);
            }
          } catch (vErr: any) {
            console.error('[Razorpay] Verification request error:', vErr);
            setErrorMessage(
              vErr.response?.data?.message || 'Payment verification failed on server.'
            );
            setIsProcessing(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', (resp: any) => {
        const errorDesc =
          resp.error?.description ||
          resp.error?.reason ||
          'Payment transaction was declined by bank.';
        setErrorMessage(`Payment Failed: ${errorDesc}`);
        setIsProcessing(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('[Razorpay] Launch checkout error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to open Razorpay payment gateway.'
      );
      setIsProcessing(false);
    }
  }, [order, isProcessing, configuredKeyId, onSuccess]);

  if (!order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
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
                  {isLiveGateway ? 'RAZORPAY LIVE' : 'RAZORPAY'}
                </div>
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
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

              {/* Razorpay Gateway Information Banner */}
              <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/50 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#237A3B] font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Official Razorpay Payment Gateway</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Click below to open the official Razorpay Checkout interface. You can pay seamlessly using UPI, Credit / Debit Cards, NetBanking, or Wallets.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-semibold text-gray-500">
                  <span className="px-2 py-0.5 bg-white rounded-md border border-gray-200 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-[#237A3B]" /> UPI (GPay / PhonePe / Paytm)
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded-md border border-gray-200 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#237A3B]" /> Cards (Visa / MC / RuPay)
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded-md border border-gray-200 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#237A3B]" /> NetBanking
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs text-red-800">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Payment Unsuccessful</span>
                  </div>
                  <p className="text-[11px] text-red-700">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      handleLaunchRazorpay();
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleLaunchRazorpay}
                disabled={isProcessing}
                className="w-full py-4 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay Securely {formatPrice(order.total)}</span>
                  </>
                )}
              </button>

              {/* Security Footer Note */}
              <div className="pt-2 text-center">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Official Razorpay 256-Bit SSL Encryption • Real-Time Order Confirmation</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
