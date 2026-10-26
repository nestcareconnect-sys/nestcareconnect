import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Gift,
  ShoppingBag,
  CheckCircle2,
  ShieldCheck,
  Package,
  ArrowRight,
  QrCode,
  Plus,
  Check,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ImageGallery } from '../components/product/ImageGallery';
import { Hamper, Product } from '../types';
import { hampersApi, productsApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '@tanstack/react-query';
export const HamperDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { formatPrice, calculateHamperPrice, calculateProductPrice, countryConfig } = useCountryCurrency();
  const { addHamperToCart } = useCart();
  const { showToast } = useToast();

  const { data: hamperData, isLoading } = useQuery({
    queryKey: ['hamper', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const res = await hampersApi.getBySlug(slug);
      if (res.data?.success && res.data.data) {
        return {
          hamper: res.data.data,
          eligibleAddOns: res.data.data.eligibleAddOns || [],
        };
      }
      throw new Error('Hamper not found');
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  const hamper = hamperData?.hamper || null;
  const eligibleAddOns = hamperData?.eligibleAddOns || [];

  // Hamper variant and add-ons states
  const [recipientVariant, setRecipientVariant] = useState<'Elderly Care' | 'Pregnancy & New Mum Care'>('Elderly Care');
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        <div className="w-8 h-8 border-3 border-[#8BCF9B] border-t-[#237A3B] rounded-full animate-spin mx-auto mb-3" />
        Loading hamper details...
      </div>
    );
  }

  if (!hamper) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Hamper Not Found</h2>
        <button
          onClick={() => navigate('/hampers')}
          className="px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
        >
          Explore All Hampers
        </button>
      </div>
    );
  }

  const basePrice = calculateHamperPrice(hamper);

  // Calculate selected add-ons cost
  const addOnsTotal = Object.entries(selectedAddOns).reduce((acc, [prodId, qty]) => {
    const prod = eligibleAddOns.find((p) => p.id === prodId);
    if (prod && qty > 0) {
      const { price } = calculateProductPrice(prod);
      return acc + price * qty;
    }
    return acc;
  }, 0);

  const totalPrice = basePrice + addOnsTotal;

  const toggleAddOn = (product: Product) => {
    setSelectedAddOns((prev) => {
      const current = prev[product.id] || 0;
      if (current > 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: 1 };
    });
  };

  const preparePersonalizationData = () => {
    const selectedAddOnsList = Object.entries(selectedAddOns).map(([prodId, qty]) => {
      const prod = eligibleAddOns.find((p) => p.id === prodId);
      return {
        productId: prodId,
        name: prod?.name || 'Add-on',
        unitPriceINR: prod?.basePriceINR || 0,
        unitPrice: prod ? calculateProductPrice(prod).price : 0,
        quantity: qty,
      };
    });

    const hasVariant = hamper.id === 'hamper-essential-care' && Boolean(recipientVariant);
    const hasAddOns = selectedAddOnsList.length > 0;
    const hasVideo = hamper.allowVideoQR;

    if (!hasVariant && !hasAddOns && !hasVideo) {
      return undefined;
    }

    return {
      recipientVariant: hamper.id === 'hamper-essential-care' ? recipientVariant : undefined,
      selectedAddOns: selectedAddOnsList.length > 0 ? selectedAddOnsList : undefined,
      videoStatus: hamper.allowVideoQR ? ('VIDEO_REQUIRED' as const) : undefined,
    };
  };

  const handleAddToCart = async () => {
    const personalization = preparePersonalizationData();

    try {
      await addHamperToCart(hamper, 1, personalization);
    } catch (err: any) {
      showToast(err.message || 'Failed to add hamper to cart.', 'error');
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/checkout');
  };

  const breadcrumbs = [
    { label: 'Hampers', url: '/hampers' },
    { label: hamper.name },
  ];

  return (
    <>
      <SEO
        title={`${hamper.name} | Send Love Home | Nest Care Connect`}
        description={hamper.shortDescription || hamper.description}
      />

      <div className="bg-gray-50/70 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hamper Main Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Gallery (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <ImageGallery images={hamper.images} productName={hamper.name} />

              {/* Video QR Card Callout Banner */}
              {hamper.allowVideoQR && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F1FAF3] to-[#E3F5E8] border border-[#8BCF9B] flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#237A3B] text-white flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">
                      Includes Special Video QR Greeting Card
                    </span>
                    <span className="text-[11px] text-gray-600 block">
                      Parents scan the physical card to watch your private family video message online.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Meta & Personalisation (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#E3F5E8] border border-[#8BCF9B] text-[#237A3B] text-xs font-bold inline-block uppercase">
                    {hamper.hamperType.replace('_', ' ')} EDITION
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">
                    Delivery to {countryConfig.name} ({countryConfig.currency})
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                  {hamper.name}
                </h1>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {hamper.description}
                </p>

                {/* Price Box */}
                <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-500 block">Total Hamper Price</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#237A3B]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                  {addOnsTotal > 0 && (
                    <span className="text-xs text-gray-500 font-semibold">
                      (Includes {formatPrice(addOnsTotal)} in Add-ons)
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Recipient Variant Toggle (For Essential Care Hamper) */}
              {hamper.id === 'hamper-essential-care' && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Select Recipient Focus:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipientVariant('Elderly Care')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        recipientVariant === 'Elderly Care'
                          ? 'bg-[#237A3B] text-white border-[#237A3B] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      👴 Elderly Parents Care
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientVariant('Pregnancy & New Mum Care')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        recipientVariant === 'Pregnancy & New Mum Care'
                          ? 'bg-[#237A3B] text-white border-[#237A3B] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      👶 Pregnancy & New Mum
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#F1FAF3] hover:bg-[#E3F5E8] text-[#237A3B] font-bold text-xs sm:text-sm rounded-xl border border-[#8BCF9B] transition-colors shadow-2xs cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleBuyNow}
                    className="w-full py-3.5 px-4 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Send Love Now
                  </button>
                </div>

                <Link
                  to="/custom-hamper"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#237A3B] bg-gray-50 hover:bg-[#F1FAF3] rounded-xl border border-gray-200 transition-colors"
                >
                  <span>Looking to build a 100% custom hamper from scratch?</span>
                </Link>

                {/* Trust mini features banner */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>100% Genuine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>Direct Delivery</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>Signature Box</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Included Products List */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
            <h3 className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#237A3B]" />
              <span>What's Included in this Healthcare & Gifting Hamper</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {hamper.items && hamper.items.length > 0 ? (
                hamper.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#8BCF9B]/30 text-[#237A3B] font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {item.quantity}×
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-xs text-gray-900 block truncate">
                        {item.product?.name || `Product #${item.productId}`}
                      </span>
                      {item.product?.unit && (
                        <span className="text-[11px] text-gray-500">{item.product.unit}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">Curated certified items included.</p>
              )}
            </div>
          </div>

          {/* Optional Add-ons interactive picker for this Hamper */}
          {eligibleAddOns.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <span>Add Special Touches to this Hamper</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Enhance your gift with traditional Kerala attire, brass diyas, Ayurvedic skincare, or extra snacks.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {eligibleAddOns.map((addon) => {
                  const isSelected = !!selectedAddOns[addon.id];
                  const { price: addonPrice } = calculateProductPrice(addon);

                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddOn(addon)}
                      className={`cursor-pointer rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-[#237A3B] bg-[#F1FAF3] ring-2 ring-[#8BCF9B]/50'
                          : 'border-gray-200 hover:border-[#8BCF9B] bg-white'
                      }`}
                    >
                      <div>
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-50 mb-2 relative">
                          <img src={addon.images[0]} alt={addon.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-[#237A3B] text-white p-1 rounded-full">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-gray-900 line-clamp-2">{addon.name}</h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-[#237A3B]">{formatPrice(addonPrice)}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-[#237A3B] text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : '+ Add'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
