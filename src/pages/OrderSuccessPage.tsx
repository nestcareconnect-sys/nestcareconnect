import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  ArrowRight,
  Printer,
  Calendar,
  CreditCard,
  MapPin,
  User,
  Phone,
  MessageSquare,
  Paperclip,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Order } from '../types';
import { ordersApi, paymentsApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { formatPrice } = useCountryCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [fetchStatus, setFetchStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      setErrorMessage('No order reference provided.');
      setFetchStatus('error');
      return;
    }

    setFetchStatus('loading');
    setErrorMessage(null);

    try {
      // Check if redirected from Stripe redirect flow with payment_intent
      const paymentIntentId = searchParams.get('payment_intent');
      if (paymentIntentId) {
        try {
          await paymentsApi.verifyStripePayment({
            orderId,
            paymentIntentId,
          });
        } catch (verifyErr) {
          console.warn('[OrderSuccessPage] Stripe redirect verification notice:', verifyErr);
        }
      }

      const res = await ordersApi.getById(orderId);
      if (res.data?.success && res.data.data) {
        setOrder(res.data.data);
        setFetchStatus('success');
      } else {
        setErrorMessage('Unable to find this order. It may have expired or is still being finalized.');
        setFetchStatus('error');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to retrieve order confirmation. Please check your connection and try again.'
      );
      setFetchStatus('error');
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  if (fetchStatus === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-gray-50/50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 border-4 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-gray-900">Confirming Your Placed Order...</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Verifying payment status, preparing packaging checklist, and generating fulfillment timeline.
            </p>
          </div>
          <div className="pt-2 text-[11px] font-mono text-gray-400">
            Order Ref: {orderId || 'Pending'}
          </div>
        </div>
      </div>
    );
  }

  if (fetchStatus === 'error' || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 bg-gray-50/50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-lg text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-gray-900">Order Confirmation Not Available</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {errorMessage || 'We could not locate this order in the system.'}
            </p>
            <p className="text-[11px] text-gray-400">
              If your payment was processed, your healthcare package is safe and our concierge team is preparing it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={fetchOrderDetails}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Order Confirmation</span>
            </button>
            <Link
              to="/track"
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rawShippingAddr = (order?.shippingAddress as any) || {};
  const recipientAddr = rawShippingAddr.recipient || rawShippingAddr;
  const buyerInfo = rawShippingAddr.buyer || {
    name: (order as any)?.guestName,
    email: (order as any)?.guestEmail,
    phone: (order as any)?.guestPhone,
    country: (order as any)?.country,
  };

  return (
    <>
      <SEO
        title="Order Confirmed | Nest Care Connect"
        description="Your healthcare order has been confirmed and is being processed."
      />

      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Success Banner */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F1FAF3] border border-[#8BCF9B] text-[#237A3B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-block">
              {order?.paymentProvider === 'DEMO' || order?.transactionId?.startsWith('demo_')
                ? '✓ Demo Order Confirmed'
                : 'Payment & Order Verified'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {order?.paymentProvider === 'DEMO' || order?.transactionId?.startsWith('demo_')
                ? 'Your Demo Payment Was Successful!'
                : 'Thank You for Your Order!'}
            </h1>

            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              {order?.paymentProvider === 'DEMO' || order?.transactionId?.startsWith('demo_')
                ? 'Your simulated transaction has been confirmed in test mode. We are preparing your healthcare package.'
                : 'We have received your payment and are preparing your healthcare package with sealed protective packaging.'}
            </p>

            {(order?.paymentProvider === 'DEMO' || order?.transactionId?.startsWith('demo_')) && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-semibold max-w-md mx-auto">
                ⚠️ Demo/Test Payment — No real money was charged.
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
              <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                <span className="text-gray-400 block text-[10px]">ORDER NUMBER</span>
                <span className="font-bold text-gray-900">{order?.orderNumber || 'NCC-2026-CONFIRMED'}</span>
              </div>

              {order?.transactionId && (
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">PAYMENT REFERENCE</span>
                  <span className="font-bold text-[#237A3B]">{order.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Items Breakdown */}
          {order && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-100 text-xs">
                {/* Overseas Buyer / Sender Information */}
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#237A3B]" /> Buyer / Sender
                  </h4>
                  <div className="space-y-0.5 text-gray-800">
                    <div className="font-bold">{buyerInfo.name || 'Overseas Sender'}</div>
                    <div className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400 inline shrink-0" />
                      <span>{buyerInfo.phone || (order as any)?.guestPhone || '—'}</span>
                    </div>
                    {buyerInfo.email && <div className="text-gray-500 break-all">{buyerInfo.email}</div>}
                    {buyerInfo.country && (
                      <div className="text-[11px] text-[#237A3B] font-medium pt-0.5">
                        Living in {buyerInfo.country}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient / Shipping Destination */}
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#237A3B]" /> Recipient & Delivery
                  </h4>
                  <div className="space-y-0.5 text-gray-800">
                    <div className="font-bold">{recipientAddr.name || rawShippingAddr.name}</div>
                    <div className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400 inline shrink-0" />
                      <span>{recipientAddr.phone || rawShippingAddr.phone}</span>
                    </div>
                    <div>{recipientAddr.addressLine1 || rawShippingAddr.addressLine1}</div>
                    {(recipientAddr.addressLine2 || rawShippingAddr.addressLine2) && (
                      <div>{recipientAddr.addressLine2 || rawShippingAddr.addressLine2}</div>
                    )}
                    <div>
                      {recipientAddr.city || rawShippingAddr.city},{' '}
                      {recipientAddr.state || recipientAddr.emirate || rawShippingAddr.state} -{' '}
                      {recipientAddr.postalCode || rawShippingAddr.postalCode}
                    </div>
                    <div className="font-semibold text-[#237A3B]">{order.country || 'India'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#237A3B]" /> Fulfillment & Tracking Details
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-xs font-bold border border-[#8BCF9B]/40">
                        {order.orderStatus}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        Payment:{' '}
                        <strong className="text-emerald-700">
                          {order.paymentProvider === 'DEMO' || order.transactionId?.startsWith('demo_')
                            ? 'DEMO — Successful'
                            : `${order.paymentStatus} (${order.paymentProvider === 'RAZORPAY' ? 'Razorpay' : 'Stripe'})`}
                        </strong>
                      </span>
                    </div>
                    {order.trackingNumber ? (
                      <div className="text-[11px] text-gray-700">
                        <span className="text-gray-400">Tracking ID: </span>
                        <strong className="font-mono text-[#237A3B]">{order.trackingNumber}</strong>
                        <span className="text-gray-500">
                          {' '}
                          ({order.shipment?.courierName || (order.shippingMethod === 'MANUAL' ? 'Direct Courier' : 'NimbusPost Partner')})
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500">
                        Status:{' '}
                        <strong className="text-gray-700">
                          Being packed with sealed protective care
                        </strong>
                      </p>
                    )}
                    <div className="pt-1">
                      <Link
                        to={`/track?order=${order.orderNumber}`}
                        className="text-[11px] font-bold text-[#237A3B] hover:underline flex items-center gap-1"
                      >
                        <span>View Live Tracking on Web</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                  Ordered Items ({order.items?.length || 0})
                </h4>
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 block">{item.name}</span>
                      <span className="text-gray-500 text-[11px]">
                        Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-bold text-[#237A3B]">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-[#237A3B]">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Paid Total ({order.currency})</span>
                  <span className="text-[#237A3B]">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Support & Additional Media Sharing Card */}
          {order && (
            <div className="bg-gradient-to-r from-[#F1FAF3] via-white to-[#F1FAF3] rounded-3xl p-6 sm:p-7 border border-[#8BCF9B]/50 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6 text-[#237A3B]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      Need to Send Photos, Videos, or Notes to Our Team?
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Your order #{order.orderNumber} has been received. You can continue to our business WhatsApp anytime to share family photos or gift instructions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href={`https://wa.me/${(import.meta.env.VITE_WHATSAPP_PHONE_NUMBER || '918921342411').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `CUSTOMER ORDER DETAILS\n\n` +
                    `Order ID: ${order.orderNumber}\n\n` +
                    `BUYER / SENDER INFORMATION\n` +
                    `Name: ${buyerInfo.name || 'Overseas Sender'}\n` +
                    `Email: ${buyerInfo.email || ''}\n` +
                    `Phone: ${buyerInfo.phone || ''}\n` +
                    `Country: ${buyerInfo.country || 'Overseas'}\n\n` +
                    `RECIPIENT INFORMATION\n` +
                    `Recipient Name: ${recipientAddr.name || ''}\n` +
                    `Recipient Phone: ${recipientAddr.phone || ''}\n` +
                    `Delivery Address: ${recipientAddr.addressLine1 || ''}${recipientAddr.addressLine2 ? ', ' + recipientAddr.addressLine2 : ''}\n` +
                    `City: ${recipientAddr.city || ''}\n` +
                    `State: ${recipientAddr.state || ''}\n` +
                    `PIN Code: ${recipientAddr.postalCode || ''}\n\n` +
                    `ORDER INFORMATION\n` +
                    `Care Package: ${order.items?.map(i => i.name).join(', ') || 'Care Package'}\n` +
                    `Quantity: ${order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1}\n` +
                    `Subtotal: ₹${order.subtotal}\n` +
                    `Shipping: ${order.shippingFee === 0 ? 'FREE' : '₹' + order.shippingFee}\n` +
                    `Total Payable: ₹${order.total}\n` +
                    `Currency: INR\n\n` +
                    `Additional Notes: Hi Nest Care Connect concierge, I have placed Order #${order.orderNumber} and would like to share additional details or photos.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>Continue on WhatsApp (Order #{order.orderNumber})</span>
                </a>

                <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Tap 📎 in WhatsApp to attach images & videos</span>
                </span>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/order-tracking"
              className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-semibold text-center hover:bg-black transition-colors"
            >
              Track Package Status
            </Link>

            <Link
              to="/shop"
              className="w-full sm:w-auto px-6 py-3 bg-[#237A3B] text-white rounded-xl text-xs font-bold text-center hover:bg-[#1c6330] transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
