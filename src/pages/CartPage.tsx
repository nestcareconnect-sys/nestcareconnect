import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Gift,
  Tag,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useCart } from '../context/CartContext';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { getProductImageUrl, getHamperImageUrl, getBoxImageUrl } from '../utils/imageUrl';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    subtotal,
    discount,
    shippingFee,
    total,
    appliedCoupon,
    updateItemQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { formatPrice, countryConfig } = useCountryCurrency();

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplying(true);
    setCouponMessage(null);
    const res = await applyCoupon(couponInput.trim());
    setIsApplying(false);

    if (res.success) {
      setCouponMessage({ text: res.message, isError: false });
      setCouponInput('');
    } else {
      setCouponMessage({ text: res.message, isError: true });
    }
  };

  return (
    <>
      <SEO
        title="Shopping Cart | Nest Care Connect"
        description="Review items, apply coupons, and checkout securely."
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Breadcrumbs items={[{ label: 'Shopping Cart' }]} />

          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Shopping Cart</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {itemCount} item(s) • Delivering to {countryConfig.name} ({countryConfig.currency})
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-gray-100 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Your Cart is Currently Empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Discover clinically tested monitors, strips, diapers, or personalized health hampers for family members.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  to="/shop"
                  className="px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
                >
                  Shop Products
                </Link>
                <Link
                  to="/hampers"
                  className="px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl"
                >
                  Explore Hampers
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Items List (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {item.itemType === 'CUSTOM_HAMPER' ? (
                          item.snapshot?.box?.image || item.customHamperData?.box?.images?.[0] ? (
                            <img
                              src={getBoxImageUrl(item.snapshot?.box?.image || item.customHamperData?.box?.images?.[0])}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#F1FAF3] flex items-center justify-center text-[#237A3B]">
                              <Gift className="w-7 h-7" />
                            </div>
                          )
                        ) : item.itemType === 'HAMPER' ? (
                          <img
                            src={getHamperImageUrl(item.snapshot?.image)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getProductImageUrl(item.snapshot?.image)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          {item.itemType.replace('_', ' ')}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                        {item.itemType === 'CUSTOM_HAMPER' && (
                          <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                            {(item.snapshot?.box?.name || item.customHamperData?.box?.name) && (
                              <p className="text-[#237A3B] font-medium">
                                📦 {item.snapshot?.box?.name || item.customHamperData?.box?.name}
                              </p>
                            )}
                            {item.snapshot?.breakdown ? (
                              <p>{item.snapshot.breakdown.length} items configured</p>
                            ) : item.customHamperData?.items ? (
                              <p>{item.customHamperData.items.length} items configured</p>
                            ) : null}
                          </div>
                        )}

                        {/* Personalization Info (Photos & Message) */}
                        {(() => {
                          const pers =
                            item.personalization ||
                            item.snapshot?.personalization ||
                            item.customHamperData?.personalization;
                          const photos: string[] = pers?.photos || pers?.attachedPhotos || [];
                          const msg = pers?.customMessage || pers?.message;

                          if (!pers && photos.length === 0 && !msg) return null;

                          return (
                            <div className="mt-1.5 p-2 rounded-xl bg-[#F8FCF9] border border-[#8BCF9B]/40 text-xs space-y-1">
                              {photos.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {photos.slice(0, 3).map((pUrl, pIdx) => (
                                      <img
                                        key={pIdx}
                                        src={pUrl}
                                        alt="Thumbnail"
                                        className="inline-block w-5 h-5 rounded-full ring-1 ring-white object-cover shadow-2xs"
                                      />
                                    ))}
                                  </div>
                                  <span className="font-bold text-[#237A3B] text-[11px]">
                                    {photos.length} photo{photos.length > 1 ? 's' : ''} attached
                                  </span>
                                </div>
                              )}
                              {msg && (
                                <p className="text-gray-600 text-[11px] italic line-clamp-1">
                                  💌 "{msg}"
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        <span className="text-xs font-semibold text-[#237A3B] block mt-1">
                          Unit: {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total price for item */}
                      <div className="text-right min-w-[90px]">
                        <span className="font-extrabold text-sm text-gray-900">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary & Coupon Card (4 cols) */}
              <div className="lg:col-span-4 sticky top-24 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
                  <h3 className="font-bold text-base text-gray-900 pb-3 border-b border-gray-100">
                    Order Summary
                  </h3>

                  {/* Coupon form */}
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1FAF3] border border-[#8BCF9B] text-xs">
                        <div className="flex items-center gap-2 text-[#237A3B] font-semibold">
                          <Tag className="w-4 h-4" />
                          <span>{appliedCoupon.code} applied!</span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Coupon code (e.g. WELCOME10)"
                          className="flex-1 px-3 py-2 text-xs uppercase bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isApplying || !couponInput.trim()}
                          className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {couponMessage && (
                      <p
                        className={`text-[11px] mt-1.5 ${
                          couponMessage.isError ? 'text-red-600' : 'text-[#237A3B] font-medium'
                        }`}
                      >
                        {couponMessage.text}
                      </p>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-[#237A3B]">
                        <span>Discount</span>
                        <span className="font-bold">-{formatPrice(discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping ({countryConfig.name})</span>
                      <span className="font-semibold text-gray-900">
                        {shippingFee === 0 ? (
                          <span className="text-[#237A3B] font-bold">FREE</span>
                        ) : (
                          formatPrice(shippingFee)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-3">
                      <span>Total</span>
                      <span className="text-lg text-[#237A3B]">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#237A3B]" />
                    <span>Calculated with live country exchange & shipping rates</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
