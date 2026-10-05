import React, { useState, useEffect } from 'react';
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
  Sparkles,
  QrCode,
  XCircle,
  Clock,
  RotateCcw,
  Check,
  Banknote,
} from 'lucide-react';
import { Order } from '../../types';
import { paymentsApi, ordersApi } from '../../services/api';
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
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [failedNotice, setFailedNotice] = useState<string | null>(null);

  // Check if DEMO mode is enabled
  const isDemoMode = (import.meta.env.VITE_PAYMENT_PROVIDER || 'demo').trim().toLowerCase() === 'demo';

  // Demo Payment Method Selection
  const [demoMethod, setDemoMethod] = useState<'CARD' | 'UPI' | 'NETBANKING' | 'TEST'>('CARD');

  // Simulated Inputs
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('Aswin (Test Buyer)');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [upiId, setUpiId] = useState('success@demo.upi');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Razorpay Mode (Only active when VITE_PAYMENT_PROVIDER !== 'demo')
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Only load Razorpay Checkout script if NOT in demo mode
    if (isDemoMode) {
      return;
    }

    if (document.getElementById('razorpay-checkout-sdk')) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setRazorpayLoaded(false);
    document.body.appendChild(script);
  }, [isDemoMode]);

  // Reset notices when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setPendingNotice(null);
      setFailedNotice(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!order) return null;

  // -------------------------------------------------------------
  // DEMO PAYMENT SIMULATION ACTIONS
  // -------------------------------------------------------------
  const handleSimulateDemoPayment = async (action: 'SUCCESS' | 'FAILED' | 'PENDING') => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setPendingNotice(null);
    setFailedNotice(null);

    try {
      const res = await paymentsApi.processDemoPayment({
        orderId: order.id,
        action,
      });

      if (action === 'SUCCESS') {
        if (res.data?.success) {
          setIsProcessing(false);
          onSuccess(order.id);
        } else {
          setErrorMessage(res.data?.message || 'Demo payment processing failed.');
          setIsProcessing(false);
        }
      } else if (action === 'FAILED') {
        setIsProcessing(false);
        setFailedNotice('Payment failed. No money was charged.');
      } else if (action === 'PENDING') {
        setIsProcessing(false);
        setPendingNotice('Payment is pending. Please check your payment status later.');
      }
    } catch (err: any) {
      console.error('[handleSimulateDemoPayment] Error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Error processing demo transaction.');
      setIsProcessing(false);
    }
  };

  const handleCheckStatus = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await ordersApi.getById(order.id);
      if (res.data?.success && res.data.data) {
        const ord = res.data.data;
        if (ord.paymentStatus === 'PAID') {
          setIsProcessing(false);
          onSuccess(ord.id);
          return;
        } else {
          setPendingNotice(`Current status: ${ord.paymentStatus}. Order is still awaiting confirmation.`);
        }
      }
    } catch (err: any) {
      setPendingNotice('Could not retrieve updated status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForRetry = () => {
    setFailedNotice(null);
    setPendingNotice(null);
    setErrorMessage(null);
  };

  // -------------------------------------------------------------
  // REAL RAZORPAY FLOW (ACTIVE ONLY WHEN PAYMENT_PROVIDER=razorpay)
  // -------------------------------------------------------------
  const handleLaunchRazorpaySdk = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const orderRes = await paymentsApi.createPaymentSession({
        orderId: order.id,
        providerName: 'RAZORPAY',
      });

      const orderData = orderRes.data?.data;
      if (!orderData || !orderData.providerOrderId) {
        throw new Error('Failed to obtain Razorpay order from backend.');
      }

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.keyId;
      if (!keyId || keyId.includes('placeholder') || keyId.includes('12345678')) {
        throw new Error('Valid Razorpay Key ID is required when PAYMENT_PROVIDER=razorpay.');
      }

      if (typeof (window as any).Razorpay !== 'function') {
        throw new Error('Razorpay SDK is not loaded. Please refresh and try again.');
      }

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
        theme: { color: '#237A3B' },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
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
              setErrorMessage('Payment verification failed.');
              setIsProcessing(false);
            }
          } catch (vErr: any) {
            setErrorMessage(vErr.response?.data?.message || 'Payment verification failed.');
            setIsProcessing(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setErrorMessage(`Payment failed: ${resp.error?.description || 'Transaction declined.'}`);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Unable to open Razorpay checkout.');
      setIsProcessing(false);
    }
  };

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
            {/* ------------------------------------------------------------- */}
            {/* HEADER */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#237A3B] text-white p-5 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-xs text-[#8BCF9B] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isDemoMode ? 'DEMO PAYMENT GATEWAY' : '256-Bit SSL Encrypted Checkout'}</span>
                </div>
                <h3 className="font-extrabold text-lg mt-0.5">
                  Pay {formatPrice(order.total)}
                </h3>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                {isDemoMode ? (
                  <div className="px-2.5 py-1 bg-white/20 rounded-lg border border-white/30 text-[10px] font-black tracking-widest uppercase">
                    TEST MODE
                  </div>
                ) : (
                  <div className="px-2.5 py-1 bg-white/15 rounded-lg border border-white/20 text-[11px] font-bold tracking-wider">
                    RAZORPAY
                  </div>
                )}
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CONTENT AREA */}
            {/* ------------------------------------------------------------- */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Demo Mode Notice Banner */}
              {isDemoMode && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-[#8BCF9B]/50 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#237A3B] shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700 leading-relaxed">
                    <strong className="text-[#237A3B] block font-bold">Demo Payment Gateway (Simulation Mode)</strong>
                    <span>Test mode — no real money will be charged. Choose a simulated action below to test the complete order workflow.</span>
                  </div>
                </div>
              )}

              {/* Order & Currency Summary Card */}
              <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Order ID</span>
                  <span className="font-mono font-bold text-gray-900 truncate block">{order.orderNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Currency</span>
                  <span className="font-bold text-[#237A3B]">{order.currency}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Order Amount</span>
                  <span className="font-extrabold text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* DEMO PAYMENT UI BODY */}
              {/* ----------------------------------------------------------- */}
              {isDemoMode ? (
                <>
                  {/* Payment Method Selector Tabs */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Simulated Payment Option:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setDemoMethod('CARD')}
                        className={`py-2 px-1.5 text-center rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                          demoMethod === 'CARD'
                            ? 'border-[#237A3B] bg-[#F1FAF3] text-[#237A3B] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDemoMethod('UPI')}
                        className={`py-2 px-1.5 text-center rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                          demoMethod === 'UPI'
                            ? 'border-[#237A3B] bg-[#F1FAF3] text-[#237A3B] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>UPI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDemoMethod('NETBANKING')}
                        className={`py-2 px-1.5 text-center rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                          demoMethod === 'NETBANKING'
                            ? 'border-[#237A3B] bg-[#F1FAF3] text-[#237A3B] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Net Banking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDemoMethod('TEST')}
                        className={`py-2 px-1.5 text-center rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                          demoMethod === 'TEST'
                            ? 'border-[#237A3B] bg-[#F1FAF3] text-[#237A3B] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Cash / Test</span>
                      </button>
                    </div>
                  </div>

                  {/* Simulated Card Form */}
                  {demoMethod === 'CARD' && (
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Card Number (Simulated)</label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs focus:border-[#8BCF9B] outline-none"
                          />
                          <CreditCard className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="w-full px-3 py-2 mt-1 bg-white border border-gray-200 rounded-xl font-mono text-xs focus:border-[#8BCF9B] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">CVV</label>
                          <input
                            type="password"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            className="w-full px-3 py-2 mt-1 bg-white border border-gray-200 rounded-xl font-mono text-xs focus:border-[#8BCF9B] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simulated UPI Form */}
                  {demoMethod === 'UPI' && (
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                        <div className="w-12 h-12 bg-[#F1FAF3] rounded-lg flex items-center justify-center text-[#237A3B] shrink-0">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block">Simulated Dynamic UPI QR</span>
                          <span className="text-[11px] text-gray-500">Supports test GPay, PhonePe, Paytm</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">UPI ID (Virtual)</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs focus:border-[#8BCF9B] outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Simulated Net Banking Form */}
                  {demoMethod === 'NETBANKING' && (
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Select Bank</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800 outline-none"
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="State Bank of India">State Bank of India</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  {/* Simulated Cash / Test Payment Form */}
                  {demoMethod === 'TEST' && (
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
                      <span className="font-bold text-gray-900 block">Instant Developer Test Simulator</span>
                      <p className="text-gray-500 text-[11px]">
                        Bypasses all manual entry and executes server-side validation directly with order ID.
                      </p>
                    </div>
                  )}

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Failed Notice with Try Again CTA */}
                  {failedNotice && (
                    <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs text-red-800">
                      <div className="flex items-center gap-2 font-bold">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{failedNotice}</span>
                      </div>
                      <p className="text-[11px] text-red-700">
                        Order remains unpaid. No stock was deducted and no shipment was booked.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetForRetry}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  )}

                  {/* Pending Notice with Check Status CTA */}
                  {pendingNotice && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
                      <div className="flex items-center gap-2 font-bold">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{pendingNotice}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Payment is currently marked PENDING in the database.
                      </p>
                      <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Check Payment Status</span>
                      </button>
                    </div>
                  )}

                  {/* Simulation Action Buttons */}
                  {!failedNotice && !pendingNotice && (
                    <div className="space-y-2.5 pt-1">
                      {/* 1. Simulate Success Button */}
                      <button
                        type="button"
                        onClick={() => handleSimulateDemoPayment('SUCCESS')}
                        disabled={isProcessing}
                        className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Demo Payment...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Simulate Successful Payment</span>
                          </>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        {/* 2. Simulate Failure Button */}
                        <button
                          type="button"
                          onClick={() => handleSimulateDemoPayment('FAILED')}
                          disabled={isProcessing}
                          className="py-2.5 px-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Simulate Failed</span>
                        </button>

                        {/* 3. Simulate Pending Button */}
                        <button
                          type="button"
                          onClick={() => handleSimulateDemoPayment('PENDING')}
                          disabled={isProcessing}
                          className="py-2.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Simulate Pending</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ----------------------------------------------------------- */
                /* REAL RAZORPAY MODE (PAYMENT_PROVIDER=razorpay) */
                /* ----------------------------------------------------------- */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/50 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#237A3B] font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Official Razorpay Checkout Integration</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      Opens official Razorpay standard popup supporting UPI, Cards, NetBanking, and Wallets.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLaunchRazorpaySdk}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-2xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay Securely {formatPrice(order.total)}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Security Footer Note */}
              <div className="pt-1 text-center">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Server-side verified transaction & automatic NimbusPost courier dispatch</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
