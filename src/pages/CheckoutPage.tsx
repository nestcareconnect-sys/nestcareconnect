import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Heart,
  User,
  Truck,
  Gift,
  Package,
  AlertCircle,
  Info,
  MessageSquare,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { PaymentGatewayModal } from '../components/checkout/PaymentGatewayModal';
import { WhatsAppMediaSection } from '../components/checkout/WhatsAppMediaSection';
import { WhatsAppContinueModal } from '../components/checkout/WhatsAppContinueModal';
import { Order, CountryCode, WhatsAppMediaItem, isHamperItem, isNormalProductItem } from '../types';
import { useCart } from '../context/CartContext';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { useAuth } from '../context/AuthContext';
import { ordersApi, shippingApi, whatsappApi } from '../services/api';
import { validateEmailInput, validatePhoneNumber } from '../utils/validation';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, discount, shippingFee, total, appliedCoupon, clearCart, refreshCart } = useCart();
  const { country, currency, countryConfig, formatPrice } = useCountryCurrency();
  const { user, isAuthenticated } = useAuth();

  // 1. Cart product type categorizations
  const hamperItems = useMemo(() => items.filter(isHamperItem), [items]);
  const normalItems = useMemo(() => items.filter(isNormalProductItem), [items]);

  const isHamperOnly = hamperItems.length > 0 && normalItems.length === 0;
  const isNormalOnly = hamperItems.length === 0 && normalItems.length > 0;
  const isMixedCart = hamperItems.length > 0 && normalItems.length > 0;
  const hasHampers = hamperItems.length > 0;

  // 2. Customer / Buyer Information
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerCountry, setBuyerCountry] = useState<CountryCode>(country);

  // 3. Recipient / Delivery Address Information (in India)
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [relationship, setRelationship] = useState('Parents (Mum & Dad)');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Kerala');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryCountry, setDeliveryCountry] = useState<CountryCode>('IN');

  // 4. Hamper Personalization & Greeting Card Notes
  // When there are multiple hampers, support per-hamper customization
  const [selectedHamperTabId, setSelectedHamperTabId] = useState<string>('');
  const [hamperNotes, setHamperNotes] = useState<Record<string, string>>({});
  const [hamperMediaMap, setHamperMediaMap] = useState<Record<string, WhatsAppMediaItem[]>>({});

  // Single hamper fallback state
  const [personalizationNote, setPersonalizationNote] = useState('');
  const [whatsappMedia, setWhatsappMedia] = useState<WhatsAppMediaItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // NimbusPost Live Serviceability State
  const [nimbusServiceability, setNimbusServiceability] = useState<any | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Payment Modal
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // WhatsApp Communication State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [businessWhatsAppNumber, setBusinessWhatsAppNumber] = useState(
    (import.meta.env.VITE_WHATSAPP_PHONE_NUMBER || '918921342411').replace(/\D/g, '')
  );

  useEffect(() => {
    whatsappApi
      .getConfig()
      .then((res) => {
        if (res.data?.success && res.data.data?.businessPhoneNumber) {
          setBusinessWhatsAppNumber(res.data.data.businessPhoneNumber);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setBuyerCountry(country);
  }, [country]);

  // Set initial selected hamper tab when hampers are available
  useEffect(() => {
    if (hamperItems.length > 0) {
      if (!selectedHamperTabId || !hamperItems.some((h) => h.id === selectedHamperTabId)) {
        setSelectedHamperTabId(hamperItems[0].id);
      }
    }
  }, [hamperItems, selectedHamperTabId]);

  // Check NimbusPost serviceability when 6-digit PIN code is entered (debounced)
  useEffect(() => {
    const cleanPin = postalCode.replace(/\D/g, '');
    if (cleanPin.length === 6 && deliveryCountry === 'IN') {
      setIsCheckingPin(true);
      const timer = setTimeout(() => {
        shippingApi
          .checkNimbusServiceability({
            pincode: cleanPin,
            items: items.map((itm) => ({
              productId: itm.productId,
              hamperId: itm.hamperId,
              itemType: itm.itemType,
              quantity: itm.quantity,
              customHamperData: itm.customHamperData,
            })),
          })
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
      }, 350);

      return () => clearTimeout(timer);
    } else {
      setNimbusServiceability(null);
      setIsCheckingPin(false);
    }
  }, [postalCode, deliveryCountry, items]);

  // Form Validation strictly adapted to the flow
  const validateForm = () => {
    const errs: Record<string, string> = {};

    // 1. Customer / Buyer Info
    if (!buyerName.trim()) {
      errs.buyerName = isNormalOnly ? 'Customer full name is required.' : 'Your full name is required.';
    }

    const emailValidation = validateEmailInput(buyerEmail);
    if (!emailValidation.isValid) {
      errs.buyerEmail = emailValidation.error || 'A valid email address is required.';
    }

    const phoneValidation = validatePhoneNumber(buyerPhone);
    if (!phoneValidation.isValid) {
      errs.buyerPhone = phoneValidation.error || 'Please enter your mobile phone number.';
    }

    // 2. Shipping / Recipient Details
    if (isHamperOnly) {
      // NRI Hamper flow: recipient is explicitly in India
      if (!recipientName.trim()) errs.recipientName = 'Recipient name in India is required.';
      if (!recipientPhone.trim()) errs.recipientPhone = 'Recipient phone number is required for courier delivery.';
    } else if (isMixedCart) {
      // Mixed flow: delivery recipient
      const effName = recipientName.trim() || buyerName.trim();
      const effPhone = recipientPhone.trim() || buyerPhone.trim();
      if (!effName) errs.recipientName = 'Delivery recipient name is required.';
      if (!effPhone) errs.recipientPhone = 'Delivery phone number is required.';
    }

    // Delivery Address
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
      // Authoritative check: verify cart is synced
      const hasOptimistic = items.some(
        (itm) => itm.isOptimistic || (itm.id && itm.id.startsWith('opt-'))
      );
      if (hasOptimistic) {
        await refreshCart();
      }

      // Format items cleanly isolating hamper customizations
      const formattedItems = items.map((itm) => {
        const isHamp = isHamperItem(itm);
        if (isHamp) {
          // If customer provided per-hamper customization, use it
          const itemMsg = (hamperItems.length > 1 ? hamperNotes[itm.id] : personalizationNote) || '';
          const itemMedia = (hamperItems.length > 1 ? hamperMediaMap[itm.id] : whatsappMedia) || [];
          const itemPhotos = itemMedia.filter((m) => m.mediaType === 'IMAGE').map((m) => m.url);

          return {
            itemType: itm.itemType,
            productId: itm.productId || undefined,
            hamperId: itm.hamperId || undefined,
            customHamperData: itm.customHamperData,
            personalization: {
              ...(itm.personalization || itm.snapshot?.personalization || itm.customHamperData?.personalization || {}),
              customMessage: itemMsg.trim() || undefined,
              photos: itemPhotos.length > 0 ? itemPhotos : undefined,
              whatsappMedia: itemMedia.length > 0 ? itemMedia : undefined,
            },
            quantity: itm.quantity,
          };
        } else {
          // Normal product: NO hamper customization, greeting message, or photos attached
          return {
            itemType: itm.itemType,
            productId: itm.productId || undefined,
            quantity: itm.quantity,
          };
        }
      });

      const cleanEmail = buyerEmail.trim().toLowerCase();
      const effRecipientName = isNormalOnly ? buyerName.trim() : (recipientName.trim() || buyerName.trim());
      const effRecipientPhone = isNormalOnly ? buyerPhone.trim() : (recipientPhone.trim() || buyerPhone.trim());

      const buyer = {
        name: buyerName.trim(),
        email: cleanEmail,
        phone: buyerPhone.trim(),
        country: isNormalOnly ? 'IN' : buyerCountry,
      };

      const recipient = {
        name: effRecipientName,
        email: cleanEmail,
        phone: effRecipientPhone,
        relationship: isNormalOnly ? undefined : relationship,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: deliveryCountry,
      };

      // Collect all media across hampers
      const allWhatsappMedia: WhatsAppMediaItem[] = isNormalOnly
        ? []
        : hamperItems.length > 1
        ? Object.values(hamperMediaMap).flat()
        : whatsappMedia;

      // Primary note for card
      let primaryNote: string | undefined = undefined;
      if (hasHampers) {
        if (hamperItems.length > 1) {
          const notesSummary = hamperItems
            .map((h, idx) => {
              const note = hamperNotes[h.id]?.trim();
              return note ? `[Gift #${idx + 1} (${h.name})]: "${note}"` : null;
            })
            .filter(Boolean);
          primaryNote = notesSummary.length > 0 ? notesSummary.join('\n\n') : undefined;
        } else {
          primaryNote = personalizationNote.trim() || undefined;
        }
      }

      const res = await ordersApi.create({
        buyer,
        recipient,
        buyerCountry: isNormalOnly ? 'IN' : buyerCountry,
        buyerCurrency: isNormalOnly ? 'INR' : currency,
        deliveryCountry,
        deliveryCurrency: 'INR',
        country: isNormalOnly ? 'IN' : buyerCountry,
        currency: isNormalOnly ? 'INR' : currency,
        shippingAddress: recipient,
        billingAddress: recipient,
        couponCode: appliedCoupon?.code,
        personalizationNote: primaryNote,
        notes: orderNotes.trim() || undefined,
        items: formattedItems,
        whatsappMedia: allWhatsappMedia,
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

  const handleContinueOnWhatsApp = () => {
    setIsWhatsAppModalOpen(true);
  };

  const handleOpenWhatsAppUrl = () => {
    const addressParts = [addressLine1, addressLine2].filter(Boolean);
    const fullAddress = addressParts.join(', ') || 'Not Provided';
    const totalQty = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const orderId = activeOrder?.orderNumber || activeOrder?.id || 'Pending Checkout';

    const shippingChargeStr = shippingFee === 0 ? 'FREE' : `₹${shippingFee}`;
    const subtotalStr = `₹${subtotal}`;
    const totalPayableStr = `₹${total}`;

    const allMedia = hamperItems.length > 1
      ? Object.values(hamperMediaMap).flat()
      : whatsappMedia;

    let msg = '';

    if (isNormalOnly) {
      // Clean standard WhatsApp text for normal product orders
      const productsSummary = normalItems
        .map((i) => (i.quantity > 1 ? `${i.name} (x${i.quantity})` : i.name))
        .join(', ');

      msg =
        `CUSTOMER ORDER DETAILS\n\n` +
        `Order ID: ${orderId}\n\n` +
        `CUSTOMER INFORMATION\n` +
        `Name: ${buyerName.trim() || 'Not Provided'}\n` +
        `Email: ${buyerEmail.trim() || 'Not Provided'}\n` +
        `Phone: ${buyerPhone.trim() || 'Not Provided'}\n\n` +
        `DELIVERY ADDRESS\n` +
        `Address: ${fullAddress}\n` +
        `City: ${city.trim() || 'Not Provided'}\n` +
        `State: ${state.trim() || 'Kerala'}\n` +
        `PIN Code: ${postalCode.trim() || 'Not Provided'}\n\n` +
        `ORDER ITEMS\n` +
        `Products: ${productsSummary}\n` +
        `Total Items: ${totalQty}\n` +
        `Subtotal: ${subtotalStr}\n` +
        `Shipping: ${shippingChargeStr}\n` +
        `Total Payable: ${totalPayableStr}\n` +
        `Currency: INR\n\n` +
        `Delivery Notes: ${orderNotes.trim() || 'None'}`;
    } else {
      // Hamper or Mixed cart text with sender, recipient, and hamper keepsakes
      const carePackageSummary = items.length > 0
        ? items.map((i) => (i.quantity > 1 ? `${i.name} (x${i.quantity})` : i.name)).join(', ')
        : 'Care Package';

      const greetingNote = hamperItems.length > 1
        ? hamperItems.map((h, i) => `Gift #${i + 1} (${h.name}): ${hamperNotes[h.id] || 'None'}`).join('\n')
        : (personalizationNote.trim() || 'None');

      msg =
        `CUSTOMER ORDER DETAILS\n\n` +
        `Order ID: ${orderId}\n\n` +
        `BUYER / SENDER INFORMATION\n` +
        `Name: ${buyerName.trim() || 'Not Provided'}\n` +
        `Email: ${buyerEmail.trim() || 'Not Provided'}\n` +
        `Phone: ${buyerPhone.trim() || 'Not Provided'}\n` +
        `Country: ${isNormalOnly ? 'India' : (buyerCountry || 'Overseas')}\n\n` +
        `RECIPIENT / DELIVERY INFORMATION\n` +
        `Recipient Name: ${recipientName.trim() || buyerName.trim() || 'Not Provided'}\n` +
        `Recipient Phone: ${recipientPhone.trim() || buyerPhone.trim() || 'Not Provided'}\n` +
        `Relationship: ${relationship || 'Loved One'}\n` +
        `Delivery Address: ${fullAddress}\n` +
        `City: ${city.trim() || 'Not Provided'}\n` +
        `State: ${state.trim() || 'Kerala'}\n` +
        `PIN Code: ${postalCode.trim() || 'Not Provided'}\n\n` +
        `ORDER INFORMATION\n` +
        `Care Package: ${carePackageSummary}\n` +
        `Total Items: ${totalQty}\n` +
        `Subtotal: ${subtotalStr}\n` +
        `Shipping: ${shippingChargeStr}\n` +
        `Total Payable: ${totalPayableStr}\n` +
        `Currency: INR\n\n` +
        `Hamper Greeting Card Message:\n${greetingNote}\n\n` +
        `Order Delivery Notes: ${orderNotes.trim() || 'None'}`;

      if (allMedia.length > 0) {
        const appUrl = window.location.origin;
        msg += `\n\nATTACHED MEDIA (${allMedia.length} files)\n`;
        allMedia.forEach((m, idx) => {
          const fullUrl = m.url.startsWith('http') ? m.url : `${appUrl}${m.url}`;
          msg += `${idx + 1}. [${m.mediaType}] ${m.originalName}\n   Preview: ${fullUrl}\n`;
        });
        msg += `\nNote: Please also tap the paperclip (📎) icon in WhatsApp to send your photos/videos directly to our concierge.`;
      }
    }

    const cleanNumber = businessWhatsAppNumber.replace(/\D/g, '') || '918921342411';
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;

    setIsWhatsAppModalOpen(false);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500">Please choose a care hamper or healthcare products before proceeding.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/hampers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
          >
            Explore Hampers <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
          >
            Healthcare Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={
          isNormalOnly
            ? 'Checkout | Nest Care Connect'
            : isHamperOnly
            ? 'NRI Gifting & Healthcare Checkout | Nest Care Connect'
            : 'Care & Healthcare Checkout | Nest Care Connect'
        }
        description={
          isNormalOnly
            ? 'Fast and secure doorstep delivery checkout for healthcare products across India.'
            : 'Care and gifting checkout tailored for families overseas sending love to parents in India.'
        }
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Breadcrumbs items={[{ label: 'Cart', url: '/cart' }, { label: 'Checkout' }]} />

          {/* Heading Banner - Tailored per flow */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
            <div>
              {isNormalOnly ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#237A3B] uppercase tracking-wide mb-1">
                    <Package className="w-3.5 h-3.5 text-[#237A3B]" />
                    <span>Standard Delivery Checkout</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Complete Your Order
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fast doorstep courier delivery across India • Verified healthcare supplies.
                  </p>
                </>
              ) : isHamperOnly ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#237A3B] uppercase tracking-wide mb-1">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>NRI Overseas Care & Gifting Checkout</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Send Love Home
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    You pay in <strong className="text-[#237A3B]">{countryConfig.currency}</strong> ({countryConfig.name}) • Delivered directly to recipient in India with custom greeting card & photos.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#237A3B] uppercase tracking-wide mb-1">
                    <Gift className="w-3.5 h-3.5 text-[#237A3B]" />
                    <span>Care & Healthcare Checkout</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Order & Delivery Checkout
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Order contains <strong>{hamperItems.length} gift hamper{hamperItems.length > 1 ? 's' : ''}</strong> and <strong>{normalItems.length} standard healthcare product{normalItems.length > 1 ? 's' : ''}</strong>.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#237A3B] font-semibold bg-[#F1FAF3] px-3.5 py-2 rounded-2xl border border-[#8BCF9B]/40 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-[#237A3B]" />
              <span>256-Bit SSL Encrypted & Verified</span>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form Sections (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* ========================================================== */}
              {/* SECTION 1: CUSTOMER / BUYER INFORMATION */}
              {/* ========================================================== */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>
                      {isNormalOnly
                        ? 'Customer Information'
                        : isHamperOnly
                        ? 'Your Information (Buyer / Sender Living Overseas)'
                        : 'Customer / Buyer Information'}
                    </span>
                  </h3>
                  {!isNormalOnly && (
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {countryConfig.flag} {countryConfig.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {isNormalOnly ? 'Full Name *' : 'Your Full Name *'}
                    </label>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address (For Invoices & Tracking) *
                    </label>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {isNormalOnly ? 'Phone Number (For Delivery & SMS Updates) *' : 'Your Phone Number *'}
                    </label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => {
                        setBuyerPhone(e.target.value);
                        if (errors.buyerPhone) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.buyerPhone;
                            return next;
                          });
                        }
                      }}
                      placeholder={isNormalOnly ? 'e.g. 9876543210' : 'e.g. +1 415 555 2671 or +91 8921342411'}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                    {errors.buyerPhone && <p className="text-[11px] text-red-500 mt-1">{errors.buyerPhone}</p>}
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* SECTION 2: DELIVERY / RECIPIENT INFORMATION (IN INDIA) */}
              {/* ========================================================== */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>
                      {isNormalOnly
                        ? 'Delivery Address'
                        : isHamperOnly
                        ? 'Recipient Information (Parents / Loved Ones in India)'
                        : 'Delivery / Shipping Address in India'}
                    </span>
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    🇮🇳 India Delivery
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Recipient name and relationship are shown for Hamper and Mixed flows */}
                  {!isNormalOnly && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Recipient Name(s) *
                        </label>
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
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Recipient Phone Number (For Courier) *
                        </label>
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="e.g. +91 8921342411"
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                        />
                        {errors.recipientPhone && <p className="text-[11px] text-red-500 mt-1">{errors.recipientPhone}</p>}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship to Recipient</label>
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
                          <option value="Self / Personal">Self / Personal</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      House Name / Flat No / Street Address *
                    </label>
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
                    <div className="sm:col-span-2 p-4 bg-gradient-to-br from-[#F1FAF3] to-emerald-50/50 border border-[#8BCF9B]/50 rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#237A3B] font-bold">
                          <Truck className="w-4 h-4" />
                          <span>Direct Doorstep Delivery via NimbusPost</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#237A3B] bg-white px-2 py-0.5 rounded-md border border-[#8BCF9B]/40">
                          {nimbusServiceability.city}, {nimbusServiceability.state} (PIN {postalCode})
                        </span>
                      </div>

                      {nimbusServiceability.packageDetails && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-100 text-[11px]">
                          <div>
                            <span className="block text-[10px] text-gray-500 font-semibold">Total Actual</span>
                            <span className="font-bold text-gray-800">{nimbusServiceability.packageDetails.actualWeightKg} kg</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-500 font-semibold">Volumetric Wt</span>
                            <span className="font-bold text-gray-800">{nimbusServiceability.packageDetails.volumetricWeightKg} kg</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-500 font-semibold">Packed Parcel</span>
                            <span className="font-mono text-gray-800 font-medium">
                              {nimbusServiceability.packageDetails.lengthCm}×{nimbusServiceability.packageDetails.breadthCm}×{nimbusServiceability.packageDetails.heightCm}cm
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-[#237A3B] font-bold">Billable Weight</span>
                            <span className="font-extrabold text-[#237A3B]">{nimbusServiceability.packageDetails.chargeableWeightKg} kg</span>
                          </div>
                        </div>
                      )}

                      {nimbusServiceability.couriers && nimbusServiceability.couriers.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="block text-[11px] font-semibold text-gray-700">
                            Available Courier Partners:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {nimbusServiceability.couriers.slice(0, 4).map((c: any) => (
                              <div
                                key={c.courierId}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 shadow-2xs"
                              >
                                <div>
                                  <span className="font-bold text-gray-800 block text-[11px] truncate max-w-[140px]">
                                    {c.courierName}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    Est: {c.estimatedDays}
                                  </span>
                                </div>
                                <span className="font-bold text-[#237A3B] text-xs">
                                  ₹{c.rate}
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

              {/* ========================================================== */}
              {/* SECTION 3: DELIVERY INSTRUCTIONS (NORMAL PRODUCTS ONLY) */}
              {/* ========================================================== */}
              {isNormalOnly && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>Delivery Instructions / Notes (Optional)</span>
                  </h3>
                  <div>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Call before delivery, leave with apartment security, or gate code..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ========================================================== */}
              {/* HAMPER CUSTOMIZATION: PHOTOS/VIDEOS & GREETING CARD */}
              {/* ONLY DISPLAYED WHEN THE CART HAS HAMPER ITEMS */}
              {/* ========================================================== */}
              {hasHampers && (
                <>
                  {/* Mixed Cart Clarification Banner */}
                  {isMixedCart && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-200/80 flex items-start gap-3">
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-purple-900 block">
                          Hamper Keepsake Personalization (For Hamper Items Only)
                        </span>
                        <p className="text-gray-600 leading-relaxed">
                          The greeting message and photos below apply exclusively to your gift hamper(s):{' '}
                          <strong className="text-purple-800">
                            {hamperItems.map((h) => h.name).join(', ')}
                          </strong>
                          . Standard healthcare items ({normalItems.map((n) => n.name).join(', ')}) will be shipped in standard packaging.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Multiple Hampers Selector Tabs */}
                  {hamperItems.length > 1 && (
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
                        Select Hamper to Personalize ({hamperItems.length} hampers in cart):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {hamperItems.map((hItm, hIdx) => {
                          const isSelected = selectedHamperTabId === hItm.id;
                          const hMediaCount = hamperMediaMap[hItm.id]?.length || 0;
                          const hasMsg = Boolean(hamperNotes[hItm.id]?.trim());

                          return (
                            <button
                              key={hItm.id}
                              type="button"
                              onClick={() => setSelectedHamperTabId(hItm.id)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#237A3B] text-white shadow-md'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>Gift #{hIdx + 1}: {hItm.name}</span>
                              {(hMediaCount > 0 || hasMsg) && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#237A3B] text-white'}`}>
                                  ✓ Custom
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION: SHARE PHOTOS & VIDEOS ON WHATSAPP */}
                  <WhatsAppMediaSection
                    mediaList={
                      hamperItems.length > 1
                        ? (hamperMediaMap[selectedHamperTabId] || [])
                        : whatsappMedia
                    }
                    onMediaChange={(newMedia) => {
                      if (hamperItems.length > 1) {
                        setHamperMediaMap((prev) => ({
                          ...prev,
                          [selectedHamperTabId]: newMedia,
                        }));
                      } else {
                        setWhatsappMedia(newMedia);
                      }
                    }}
                    sectionNumber={3}
                  />

                  {/* SECTION: PERSONAL GREETING MESSAGE FOR PHYSICAL CARD */}
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#237A3B] text-white text-xs flex items-center justify-center font-bold">
                          4
                        </span>
                        <span>
                          {hamperItems.length > 1
                            ? `Personal Greeting Message — for ${hamperItems.find((h) => h.id === selectedHamperTabId)?.name || 'Hamper'}`
                            : 'Personal Greeting Message for Physical Card (Optional)'}
                        </span>
                      </h3>
                      <span className="text-[10px] font-bold text-[#237A3B] bg-[#F1FAF3] px-2.5 py-1 rounded-full border border-[#8BCF9B]/40">
                        💌 Printed on Gift Card
                      </span>
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={
                          hamperItems.length > 1
                            ? (hamperNotes[selectedHamperTabId] || '')
                            : personalizationNote
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (hamperItems.length > 1) {
                            setHamperNotes((prev) => ({
                              ...prev,
                              [selectedHamperTabId]: val,
                            }));
                          } else {
                            setPersonalizationNote(val);
                          }
                        }}
                        placeholder="Write a heartfelt message to be printed inside the keepsake greeting card (e.g. Wishing you good health and joy! Miss you Mum & Dad ❤️)..."
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none font-serif italic"
                      />
                      <span className="text-[11px] text-gray-400 block mt-1">
                        This personal note will be formatted and printed inside the signature Nest Care physical greeting card placed inside the hamper box.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Order Summary & CTA (5 cols) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-5">
                <h3 className="font-bold text-base text-gray-900 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <span>
                    {isNormalOnly
                      ? `Order Summary (${items.length} items)`
                      : `Care Package Summary (${items.length} items)`}
                  </span>
                  {hasHampers && normalItems.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Mixed Order
                    </span>
                  )}
                </h3>

                {/* Items Preview */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {items.map((itm) => {
                    const isHamper = isHamperItem(itm);
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
                        <div className="truncate max-w-[210px] space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 block truncate">{itm.name}</span>
                            {isHamper ? (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Hamper
                              </span>
                            ) : (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                Product
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 block">Qty: {itm.quantity}</span>

                          {/* Hamper-specific summary decorations */}
                          {isHamper && (
                            <>
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
                            </>
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
                    <span>Doorstep Courier Delivery</span>
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

                {/* Standard Secure Gateway Payment Button */}
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  className="w-full py-4 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isPlacingOrder
                      ? 'Confirming Order...'
                      : `Proceed to Pay ${formatPrice(total)}`}
                  </span>
                </button>

                {/* Continue on WhatsApp Button - ONLY SHOWN FOR HAMPER ORDERS */}
                {hasHampers && (
                  <>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-3 text-gray-400 text-[10px] uppercase font-bold tracking-wider">or</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleContinueOnWhatsApp}
                      className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 fill-current" />
                      <span>Continue on WhatsApp</span>
                    </button>
                  </>
                )}

                <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#237A3B]" />
                  <span>Verified gateway transaction with real-time delivery tracking</span>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* WhatsApp Continue Confirmation Modal (for Hamper flows) */}
      {hasHampers && (
        <WhatsAppContinueModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          onConfirmOpenWhatsApp={handleOpenWhatsAppUrl}
          mediaList={
            hamperItems.length > 1
              ? Object.values(hamperMediaMap).flat()
              : whatsappMedia
          }
          businessPhone={businessWhatsAppNumber}
        />
      )}

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
