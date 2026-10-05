import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Heart,
  User,
  Truck,
  Sparkles,
  Gift,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { PaymentGatewayModal } from '../components/checkout/PaymentGatewayModal';
import { Order, CountryCode } from '../types';
import { useCart } from '../context/CartContext';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { useAuth } from '../context/AuthContext';
import { ordersApi, shippingApi } from '../services/api';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, discount, shippingFee, total, appliedCoupon, clearCart, refreshCart } = useCart();
  const { country, currency, countryConfig, formatPrice } = useCountryCurrency();
  const { user, isAuthenticated } = useAuth();

  // 1. Buyer Information (Overseas Sender)
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerCountry, setBuyerCountry] = useState<CountryCode>(country);

  // 2. Recipient Information (Delivery in India / destination)
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [relationship, setRelationship] = useState('Parents (Mum & Dad)');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Kerala');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryCountry, setDeliveryCountry] = useState<CountryCode>('IN');

  // 3. Optional Personalization Note
  const [personalizationNote, setPersonalizationNote] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // NimbusPost Live Serviceability State
  const [nimbusServiceability, setNimbusServiceability] = useState<any | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Payment Modal
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    setBuyerCountry(country);
  }, [country]);

  // Check NimbusPost serviceability when 6-digit PIN code is entered
  useEffect(() => {
    const cleanPin = postalCode.replace(/\D/g, '');
    if (cleanPin.length === 6 && deliveryCountry === 'IN') {
      setIsCheckingPin(true);
      shippingApi
        .checkNimbusServiceability({ pincode: cleanPin })
        .then((res) => {
          if (res.data?.success && res.data.data?.serviceable) {
            setNimbusServiceability(res.data.data);
            if (res.data.data.city && !city) setCity(res.data.data.city);
            if (res.data.data.state && !state) setState(res.data.data.state);
          } else {
            setNimbusServiceability(null);
          }
        })
        .catch(() => setNimbusServiceability(null))
        .finally(() => setIsCheckingPin(false));
    } else {
      setNimbusServiceability(null);
    }
  }, [postalCode, deliveryCountry]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!buyerName.trim()) errs.buyerName = 'Your name is required.';
    if (!buyerEmail.trim()) errs.buyerEmail = 'Your email address is required for receipts.';
    if (!recipientName.trim()) errs.recipientName = 'Recipient name (e.g. Mum & Dad) is required.';
    if (!recipientPhone.trim()) errs.recipientPhone = 'Recipient phone number is required for courier delivery.';
    if (!addressLine1.trim()) errs.addressLine1 = 'House/Apartment delivery address is required.';
    if (!city.trim()) errs.city = 'City/Town is required.';
    if (!postalCode.trim()) errs.postalCode = 'PIN/Postal code is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacingOrder) return;
    if (!validateForm()) return;

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // 1. Authoritative check: verify cart is synced
      const hasOptimistic = items.some(
        (itm) => itm.isOptimistic || (itm.id && itm.id.startsWith('opt-'))
      );
      if (hasOptimistic) {
        await refreshCart();
      }

      const formattedItems = items.map((itm) => ({
        itemType: itm.itemType,
        productId: itm.productId || undefined,
        hamperId: itm.hamperId || undefined,
        customHamperData: itm.customHamperData,
        personalization:
          itm.personalization ||
          itm.snapshot?.personalization ||
          itm.customHamperData?.personalization ||
          undefined,
        quantity: itm.quantity,
      }));

      const buyer = {
        name: buyerName.trim(),
        email: buyerEmail.trim(),
        phone: buyerPhone.trim(),
        country: buyerCountry,
      };

      const recipient = {
        name: recipientName.trim(),
        phone: recipientPhone.trim(),
        relationship,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: deliveryCountry,
      };

      const res = await ordersApi.create({
        buyer,
        recipient,
        buyerCountry,
        buyerCurrency: currency,
        deliveryCountry,
        deliveryCurrency: 'INR',
        country: buyerCountry,
        currency,
        shippingAddress: recipient,
        billingAddress: recipient,
        couponCode: appliedCoupon?.code,
        personalizationNote: personalizationNote.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: formattedItems,
      });

      if (res.data?.success && res.data.data) {
        setActiveOrder(res.data.data);
        setIsPaymentModalOpen(true);
      } else {
        throw new Error((res.data as any)?.message || 'Failed to place order.');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to create your order. Please review your cart and try again.';
      alert(errMsg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = (orderId: string) => {
    setIsPaymentModalOpen(false);
    clearCart();
    navigate(`/order-success/${orderId}`);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500">Please choose a care hamper or products before proceeding.</p>
        <Link
          to="/hampers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
        >
          Explore Hampers <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="NRI Gifting & Healthcare Checkout | Nest Care Connect"
        description="Care and gifting checkout tailored for families overseas sending love to parents in India."
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Breadcrumbs items={[{ label: 'Cart', url: '/cart' }, { label: 'Checkout' }]} />

          {/* Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#237A3B] uppercase tracking-wide mb-1">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>NRI Overseas Care & Gifting Checkout</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Send Love Home 
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                You pay in <strong className="text-[#237A3B]">{countryConfig.currency}</strong> ({countryConfig.name}) • Delivered directly to recipient in India.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#237A3B] font-semibold bg-[#F1FAF3] px-3.5 py-2 rounded-2xl border border-[#8BCF9B]/40">
              <ShieldCheck className="w-4 h-4 text-[#237A3B]" />
              <span>256-Bit SSL Encrypted & Verified</span>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Buyer & Recipient Information (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Buyer Information (Overseas Sender) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>Your Information (Buyer / Sender Living Overseas)</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {countryConfig.flag} {countryConfig.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.buyerName && <p className="text-[11px] text-red-500 mt-1">{errors.buyerName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Your Email Address (For Order Receipts) *</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="e.g. rajesh@example.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.buyerEmail && <p className="text-[11px] text-red-500 mt-1">{errors.buyerEmail}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Your Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="e.g. +1 415 555 2671"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Recipient Information (Delivery in India) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>Recipient Information (Parents / Loved Ones in India)</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    🇮🇳 India Delivery
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Name(s) *</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. M. K. Sharma & Lakshmi Sharma"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.recipientName && <p className="text-[11px] text-red-500 mt-1">{errors.recipientName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Phone Number (For Courier) *</label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.recipientPhone && <p className="text-[11px] text-red-500 mt-1">{errors.recipientPhone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    >
                      <option value="Parents (Mum & Dad)">Parents (Mum & Dad)</option>
                      <option value="Mum">Mum</option>
                      <option value="Dad">Dad</option>
                      <option value="Grandparents">Grandparents</option>
                      <option value="Couple / Anniversary">Couple / Anniversary</option>
                      <option value="New Mum & Newborn">New Mum & Newborn</option>
                      <option value="Sibling / Family">Sibling / Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">House Name / Flat No / Street Address *</label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 402 Green Meadows, 5th Main"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.addressLine1 && <p className="text-[11px] text-red-500 mt-1">{errors.addressLine1}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Landmark / Locality (Optional)</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="e.g. Near Indiranagar Metro Station"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City / Town *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru / Kochi / Trivandrum"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.city && <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State *</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Kerala / Karnataka"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PIN / Postal Code *</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 560038 / 682001"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none font-mono"
                    />
                    {errors.postalCode && <p className="text-[11px] text-red-500 mt-1">{errors.postalCode}</p>}
                  </div>

                  {isCheckingPin && (
                    <div className="sm:col-span-2 flex items-center gap-2 text-xs text-gray-500 py-1">
                      <Truck className="w-4 h-4 text-[#237A3B] animate-pulse" />
                      <span>Checking NimbusPost courier serviceability...</span>
                    </div>
                  )}

                  {nimbusServiceability && (
                    <div className="sm:col-span-2 p-3.5 bg-gradient-to-br from-[#F1FAF3] to-emerald-50/50 border border-[#8BCF9B]/50 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#237A3B] font-bold">
                          <Truck className="w-4 h-4" />
                          <span>Direct Doorstep Delivery via NimbusPost</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#237A3B] bg-white px-2 py-0.5 rounded-md border border-[#8BCF9B]/40">
                          {nimbusServiceability.city}, {nimbusServiceability.state}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        {nimbusServiceability.message || 'Express courier partners: Blue Dart, Delhivery, Shadowfax, DTDC with live SMS & WhatsApp tracking.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Personal Message Note Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Personal Greeting Message for Physical Card (Optional)</span>
                </h3>

                <div>
                  <textarea
                    rows={3}
                    value={personalizationNote}
                    onChange={(e) => setPersonalizationNote(e.target.value)}
                    placeholder="Write a message to be hand-printed on the gift card (e.g. Wishing you good health and long life! Miss you Mum & Dad  )..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none font-serif italic"
                  />
                  <span className="text-[11px] text-gray-400 block mt-1">
                    This note will be formatted and printed inside the signature Nest Care greeting card.
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Place Order CTA (5 cols) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-5">
                <h3 className="font-bold text-base text-gray-900 pb-3 border-b border-gray-100">
                  Care Package Summary ({items.length} items)
                </h3>

                {/* Items preview */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {items.map((itm) => {
                    const pers =
                      itm.personalization ||
                      itm.snapshot?.personalization ||
                      itm.customHamperData?.personalization;
                    const photos: string[] = pers?.photos || pers?.attachedPhotos || [];
                    const msg = pers?.customMessage || pers?.message;

                    return (
                      <div
                        key={itm.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="truncate max-w-[200px] space-y-0.5">
                          <span className="font-semibold text-gray-900 block truncate">{itm.name}</span>
                          <span className="text-[11px] text-gray-500 block">Qty: {itm.quantity}</span>
                          {pers?.recipientVariant && (
                            <span className="text-[10px] text-[#237A3B] block font-medium">
                              • {pers.recipientVariant}
                            </span>
                          )}
                          {itm.itemType === 'CUSTOM_HAMPER' && (itm.snapshot?.box?.name || itm.customHamperData?.box?.name) && (
                            <span className="text-[10px] text-[#237A3B] block font-medium">
                              • Box: {itm.snapshot?.box?.name || itm.customHamperData?.box?.name}
                            </span>
                          )}
                          {photos.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <div className="flex -space-x-1 overflow-hidden">
                                {photos.slice(0, 3).map((pUrl, pIdx) => (
                                  <img
                                    key={pIdx}
                                    src={pUrl}
                                    alt="Thumbnail"
                                    className="inline-block w-4 h-4 rounded-full ring-1 ring-white object-cover"
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-[#237A3B] font-bold">
                                {photos.length} photo{photos.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {msg && (
                            <span className="text-[10px] text-gray-500 block italic truncate max-w-[180px]">
                              💌 "{msg}"
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[#237A3B]">{formatPrice(itm.totalPrice)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[#237A3B]">
                      <span>Coupon Discount</span>
                      <span className="font-bold">-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Doorstep Shipping to India</span>
                    <span className="font-semibold text-gray-900">
                      {shippingFee === 0 ? (
                        <span className="text-[#237A3B] font-bold">FREE</span>
                      ) : (
                        formatPrice(shippingFee)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-3">
                    <span>Payable Total</span>
                    <span className="text-xl text-[#237A3B]">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  className="w-full py-4 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isPlacingOrder
                      ? 'Confirming Order...'
                      : (import.meta.env.VITE_PAYMENT_PROVIDER || 'demo').toLowerCase() === 'demo'
                      ? `Pay Securely — Demo Payment (${formatPrice(total)})`
                      : `Proceed to Pay ${formatPrice(total)}`}
                  </span>
                </button>

                <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Verified gateway transaction with delivery updates</span>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        order={activeOrder}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setIsPaymentModalOpen(false)}
      />
    </>
  );
};
