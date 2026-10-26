import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle, MapPin, ExternalLink, Copy, Check, RotateCcw } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Order, NimbusTrackingResult } from '../types';
import { ordersApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { isValidTrackingUrl } from '../utils/validation';

export const OrderTrackingPage: React.FC = () => {
  const { formatPrice } = useCountryCurrency();
  const [searchParams] = useSearchParams();
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const [orderNumber, setOrderNumber] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [nimbusTracking, setNimbusTracking] = useState<NimbusTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Auto-fill and auto-track from URL params or query parameters
  useEffect(() => {
    const qOrder = routeOrderId || searchParams.get('order') || searchParams.get('orderNumber');
    const qContact = searchParams.get('contact') || searchParams.get('phone') || searchParams.get('email') || '';
    if (qOrder) {
      setOrderNumber(qOrder.trim());
      if (qContact) {
        setEmailOrPhone(qContact.trim());
      }
      performTrack(qOrder.trim(), qContact.trim());
    }
  }, [routeOrderId, searchParams]);

  const performTrack = async (targetOrder: string, targetContact: string) => {
    if (!targetOrder) return;

    setIsLoading(true);
    setErrorMessage(null);
    setOrder(null);
    setNimbusTracking(null);

    try {
      const res = await ordersApi.track({
        orderNumber: targetOrder,
        emailOrPhone: targetContact || undefined,
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

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setErrorMessage('Please enter your order number.');
      return;
    }
    performTrack(orderNumber.trim(), emailOrPhone.trim());
  };

  const handleCopyTracking = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
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

  const isManual =
    order?.shippingMethod === 'MANUAL' ||
    order?.isManualShipment === true ||
    order?.shipment?.shippingMethod === 'MANUAL' ||
    order?.shipment?.provider === 'MANUAL';

  const awb = order?.shipment?.trackingNumber || order?.shipment?.awbNumber || order?.trackingNumber || nimbusTracking?.awbNumber;
  const courier = order?.shipment?.courierName || order?.courierName || order?.manualShipment?.courierName || (isManual ? 'Direct Courier Partner' : nimbusTracking?.courierName || 'NimbusPost Partner');
  const trackingUrl = order?.shipment?.trackingUrl || order?.trackingUrl || order?.manualShipment?.trackingUrl;
  const hasValidTrackingUrl = isValidTrackingUrl(trackingUrl);
  const shippingNotes = order?.shipment?.shippingNotes || order?.manualShipment?.shippingNotes || order?.notes;
  const estimatedDelivery = order?.shipment?.estimatedDelivery || order?.estimatedDelivery || order?.manualShipment?.estimatedDelivery;
  const dispatchDate = order?.shipment?.dispatchedAt || order?.dispatchedAt || order?.manualShipment?.dispatchedAt;
  const formattedDispatchDate = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <SEO
        title="Track Your Healthcare Order | Nest Care Connect"
        description="Check real-time fulfillment and shipping status for your healthcare products and hampers."
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
                Enter your order number (e.g. NCC-2026-XXXX) to view current status and tracking ID.
              </p>
            </div>

            <form onSubmit={handleTrack} className="max-w-xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Order Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="NCC-2026-1234"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email or Phone <span className="text-gray-400 font-normal">(Optional)</span>
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
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-700 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => performTrack(orderNumber.trim(), emailOrPhone.trim())}
                    className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-100/50 text-red-700 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Locating Order...' : 'Track Package'}</span>
              </button>
            </form>
          </div>

          {/* Placed Order Loading State */}
          {isLoading && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 border-4 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-base text-gray-900">Locating Placed Order & Live Tracking...</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Connecting to courier fulfillment network to fetch real-time milestone events and status.
                </p>
              </div>
            </div>
          )}

          {/* Tracking Result View */}
          {order && !isLoading && (
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

              {/* Shipment & Tracking Section */}
              <div className="p-6 rounded-2xl border-2 border-[#8BCF9B]/60 bg-gradient-to-br from-[#F1FAF3] via-white to-emerald-50/30 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#8BCF9B]/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#237A3B] text-white flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900">Shipment & Tracking</h3>
                      <p className="text-[11px] text-gray-500">
                        {isManual ? 'Dispatched via Direct Courier Partner' : 'Dispatched via NimbusPost Express Logistics'}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-[#8BCF9B] text-[#237A3B] inline-block self-start sm:self-auto">
                    {order.orderStatus}
                  </span>
                </div>

                {awb ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipping Method</span>
                        <span className="font-bold text-gray-900 text-xs">
                          {order.shippingMethodLabel || (
                            order.shippingMethod === 'MANUAL' || isManual ? 'Manual' : 'NimbusPost'
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Courier</span>
                        <span className="font-bold text-gray-900 text-xs">{courier}</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipment Status</span>
                        <span className="font-bold text-[#237A3B] text-xs uppercase">
                          {order.shipment?.status || order.orderStatus}
                        </span>
                      </div>

                      {formattedDispatchDate && (
                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Dispatch Date</span>
                          <span className="font-bold text-gray-800 text-xs">{formattedDispatchDate}</span>
                        </div>
                      )}

                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs sm:col-span-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Tracking ID / AWB</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono font-bold text-xs text-[#237A3B] bg-emerald-50 px-3 py-1.5 rounded-lg border border-[#8BCF9B]/40">
                            {awb}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(awb)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedTracking ? 'Copied' : 'Copy Tracking ID'}</span>
                          </button>
                        </div>
                      </div>

                      {estimatedDelivery && (
                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Estimated Delivery</span>
                          <span className="font-bold text-gray-800 text-xs">{estimatedDelivery}</span>
                        </div>
                      )}

                      {shippingNotes && (
                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs sm:col-span-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Shipping Notes</span>
                          <span className="text-gray-700 italic text-xs">{shippingNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* External Tracking Button */}
                    {hasValidTrackingUrl && (
                      <div className="pt-2 flex justify-start sm:justify-end">
                        <a
                          href={trackingUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          <span>Track Shipment</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    {/* Live Courier Milestones from NimbusPost if available */}
                    {!isManual && nimbusTracking?.history && nimbusTracking.history.length > 0 && (
                      <div className="pt-4 border-t border-[#8BCF9B]/30 space-y-3">
                        <span className="text-xs font-bold text-gray-800 block">Live Courier Milestones:</span>
                        <div className="space-y-2.5 border-l-2 border-[#237A3B] ml-2 pl-3">
                          {nimbusTracking.history.map((step, idx) => (
                            <div key={idx} className="relative text-xs space-y-0.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#237A3B] absolute -left-[17px] top-1" />
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
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-gray-900 block text-xs">Order In Progress</span>
                      <p className="text-gray-700 text-xs font-medium">
                        Your order is being processed. Tracking details will be available after dispatch.
                      </p>
                    </div>
                  </div>
                )}
              </div>

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
