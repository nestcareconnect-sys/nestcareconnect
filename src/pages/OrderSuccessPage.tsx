import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Order } from '../types';
import { ordersApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { formatPrice } = useCountryCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    ordersApi
      .getById(orderId)
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setOrder(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        <div className="w-8 h-8 border-3 border-[#8BCF9B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading order confirmation...
      </div>
    );
  }

  const shippingAddr = (order?.shippingAddress as any) || {};

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100 text-xs">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#237A3B]" /> Shipping Destination
                  </h4>
                  <div className="space-y-0.5 text-gray-800">
                    <div className="font-bold">{shippingAddr.name}</div>
                    <div>{shippingAddr.phone}</div>
                    <div>{shippingAddr.addressLine1}</div>
                    {shippingAddr.addressLine2 && <div>{shippingAddr.addressLine2}</div>}
                    <div>
                      {shippingAddr.city}, {shippingAddr.state || shippingAddr.emirate} - {shippingAddr.postalCode}
                    </div>
                    <div className="font-semibold text-[#237A3B]">{order.country}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#237A3B]" /> Fulfillment & NimbusPost Tracking
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
                            : `${order.paymentStatus} (Razorpay)`}
                        </strong>
                      </span>
                    </div>
                    {order.trackingNumber && (
                      <div className="text-[11px] text-gray-700">
                        <span className="text-gray-400">AWB Tracking: </span>
                        <strong className="font-mono text-[#237A3B]">{order.trackingNumber}</strong>
                        <span className="text-gray-500"> ({order.shipment?.courierName || 'NimbusPost Partner'})</span>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Shipping:{' '}
                      <strong>
                        {order.orderStatus === 'SHIPPED' ? 'Dispatched' : 'Processing'}
                      </strong>
                    </p>
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
