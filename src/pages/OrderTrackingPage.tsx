import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle, MapPin, ExternalLink } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Order, NimbusTrackingResult } from '../types';
import { ordersApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';

export const OrderTrackingPage: React.FC = () => {
  const { formatPrice } = useCountryCurrency();
  const [orderNumber, setOrderNumber] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [nimbusTracking, setNimbusTracking] = useState<NimbusTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !emailOrPhone.trim()) {
      setErrorMessage('Please enter both your order number and email or phone number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setOrder(null);
    setNimbusTracking(null);

    try {
      const res = await ordersApi.track({
        orderNumber: orderNumber.trim(),
        emailOrPhone: emailOrPhone.trim(),
      });

      if (res.data?.success && res.data.data) {
        setOrder(res.data.data);
        if (res.data.data.nimbusTracking) {
          setNimbusTracking(res.data.data.nimbusTracking);
        }
      } else {
        setErrorMessage('No matching order found. Please check your order number and contact info.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Could not locate order details.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Payment Confirmed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'PACKED', label: 'Packed with Care' },
    { key: 'SHIPPED', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Delivered' },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (currentIndex >= stepIndex && currentIndex !== -1) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'upcoming';
  };

  const awb = order?.shipment?.awbNumber || order?.trackingNumber || nimbusTracking?.awbNumber;
  const courier = order?.shipment?.courierName || nimbusTracking?.courierName || 'NimbusPost Express Courier';

  return (
    <>
      <SEO
        title="Track Your Healthcare Order | Nest Care Connect"
        description="Check real-time fulfillment and NimbusPost shipping status for your healthcare products and hampers."
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <Breadcrumbs items={[{ label: 'Track Order' }]} />

          {/* Search Box Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
            <div className="text-center max-w-lg mx-auto space-y-2">
              <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-block">
                Live Shipment Tracking
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Track Your Healthcare Order
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Enter your order number (e.g. NCC-2026-XXXX) and registered email or phone.
              </p>
            </div>

            <form onSubmit={handleTrack} className="max-w-xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="NCC-2026-1234"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email or Phone
                  </label>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="e.g. rajesh@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Locating Order...' : 'Track Package'}</span>
              </button>
            </form>
          </div>

          {/* Tracking Result View */}
          {order && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-8 animate-fade-in">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                <div>
                  <span className="text-xs text-gray-400 font-mono">ORDER #{order.orderNumber}</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                    Status: <span className="text-[#237A3B]">{order.orderStatus}</span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total Amount</span>
                  <span className="text-lg font-extrabold text-[#237A3B]">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* NimbusPost Courier Section */}
              {awb && (
                <div className="p-5 bg-gradient-to-br from-[#F1FAF3] to-emerald-50/40 rounded-2xl border border-[#8BCF9B]/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#237A3B] text-white flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                          Dispatched via NimbusPost Partner
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">{courier}</h4>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold">AWB Tracking #</span>
                      <span className="font-mono font-bold text-xs text-[#237A3B] bg-white px-2.5 py-1 rounded-lg border border-[#8BCF9B]/40 inline-block">
                        {awb}
                      </span>
                    </div>
                  </div>

                  {nimbusTracking?.history && nimbusTracking.history.length > 0 && (
                    <div className="pt-3 border-t border-[#8BCF9B]/30 space-y-2.5">
                      <span className="text-[11px] font-bold text-gray-800 block">Live Courier Milestones:</span>
                      <div className="space-y-2 border-l-2 border-[#237A3B] ml-2 pl-3">
                        {nimbusTracking.history.map((step, idx) => (
                          <div key={idx} className="relative text-xs space-y-0.5">
                            <div className="w-2 h-2 rounded-full bg-[#237A3B] absolute -left-[17px] top-1" />
                            <span className="font-bold text-gray-900 block">{step.activity}</span>
                            <span className="text-[11px] text-gray-500 block">{step.location}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(step.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Steps Indicator */}
              <div className="py-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {steps.map((step) => {
                    const status = getStepStatus(step.key, order.orderStatus);
                    return (
                      <div
                        key={step.key}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1.5 ${
                          status === 'completed'
                            ? 'bg-[#F1FAF3] border-[#8BCF9B] text-[#237A3B]'
                            : status === 'current'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-100 text-gray-400'
                        }`}
                      >
                        {status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#237A3B]" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                        <span className="text-[11px] font-bold leading-tight">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline Log */}
              {order.timeline && order.timeline.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                    Activity History
                  </h4>
                  <div className="space-y-2">
                    {order.timeline.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 text-xs p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#237A3B] mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-bold text-gray-900">{event.title}</span>
                          {event.description && (
                            <p className="text-gray-500 mt-0.5">{event.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
