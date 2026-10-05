import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Gift, Package, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { getProductImageUrl, getHamperImageUrl, getBoxImageUrl } from '../../utils/imageUrl';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    subtotal,
    discount,
    shippingFee,
    total,
    appliedCoupon,
    isCartDrawerOpen,
    closeCartDrawer,
    updateItemQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { formatPrice, countryConfig } = useCountryCurrency();

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplyingCoupon(true);
    setCouponMessage(null);
    const result = await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);

    if (result.success) {
      setCouponMessage({ text: result.message, isError: false });
      setCouponInput('');
    } else {
      setCouponMessage({ text: result.message, isError: true });
    }
  };

  const handleCheckout = () => {
    closeCartDrawer();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCartDrawer}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F1FAF3]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#237A3B]" />
                  <h3 className="font-semibold text-gray-900 text-base">Your Healthcare Cart</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#8BCF9B]/40 text-[#237A3B] text-xs font-bold">
                    {itemCount}
                  </span>
                </div>
                <button
                  onClick={closeCartDrawer}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
                  aria-label="Close cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#F1FAF3] flex items-center justify-center text-[#8BCF9B]">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h4 className="font-semibold text-gray-800 text-base">Your cart is empty</h4>
                    <p className="text-xs text-gray-500 max-w-xs">
                      Explore our healthcare monitors, essential test strips, or curated wellness hampers.
                    </p>
                    <button
                      onClick={() => {
                        closeCartDrawer();
                        navigate('/shop');
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#237A3B] text-white rounded-xl text-xs font-semibold hover:bg-[#1c6330] transition-colors"
                    >
                      Shop Healthcare Products <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3.5 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-white shadow-xs"
                    >
                      {/* Item Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {item.itemType === 'CUSTOM_HAMPER' ? (
                          item.snapshot?.box?.image || item.customHamperData?.box?.images?.[0] ? (
                            <img
                              src={getBoxImageUrl(item.snapshot?.box?.image || item.customHamperData?.box?.images?.[0])}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#F1FAF3] flex items-center justify-center text-[#237A3B]">
                              <Gift className="w-6 h-6" />
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

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs text-gray-900 line-clamp-1">{item.name}</h4>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.itemType === 'CUSTOM_HAMPER' && (
                          <div className="text-[11px] text-gray-500 mt-0.5 space-y-0.5">
                            {(item.snapshot?.box?.name || item.customHamperData?.box?.name) && (
                              <p className="text-[#237A3B] font-medium">
                                📦 {item.snapshot?.box?.name || item.customHamperData?.box?.name}
                              </p>
                            )}
                            {item.snapshot?.breakdown ? (
                              <p>{item.snapshot.breakdown.length} configured items</p>
                            ) : item.customHamperData?.items ? (
                              <p>{item.customHamperData.items.length} configured items</p>
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
                            <div className="mt-1.5 p-1.5 rounded-lg bg-[#F8FCF9] border border-[#8BCF9B]/40 text-[10px] space-y-1">
                              {photos.length > 0 && (
                                <div className="flex items-center gap-1.5">
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
                                  <span className="font-bold text-[#237A3B]">
                                    {photos.length} photo{photos.length > 1 ? 's' : ''} attached
                                  </span>
                                </div>
                              )}
                              {msg && (
                                <p className="text-gray-600 italic line-clamp-1">
                                  💌 "{msg}"
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between mt-2.5">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-gray-500 hover:text-gray-800"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-semibold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-gray-500 hover:text-gray-800"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Item Price */}
                          <span className="font-bold text-xs text-[#237A3B]">
                            {formatPrice(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Checkout Section */}
              {items.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50 p-6 space-y-4">
                  {/* Coupon Code Box */}
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1FAF3] border border-[#8BCF9B] text-xs">
                        <div className="flex items-center gap-2 text-[#237A3B] font-semibold">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Coupon {appliedCoupon.code} applied!</span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-xs text-red-600 hover:underline font-medium"
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
                          className="flex-1 px-3 py-2 text-xs uppercase bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isApplyingCoupon || !couponInput.trim()}
                          className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors"
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
                  <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-[#237A3B]">
                        <span>Coupon Discount</span>
                        <span className="font-semibold">-{formatPrice(discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Estimated Shipping ({countryConfig.name})</span>
                      <span className="font-semibold text-gray-900">
                        {shippingFee === 0 ? (
                          <span className="text-[#237A3B] font-bold">FREE</span>
                        ) : (
                          formatPrice(shippingFee)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
                      <span>Total ({countryConfig.currency})</span>
                      <span className="text-base text-[#237A3B]">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Actions: View Cart & Checkout Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        closeCartDrawer();
                        navigate('/cart');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-3 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-xs"
                    >
                      <ShoppingBag className="w-4 h-4 text-gray-600" />
                      <span>View Cart</span>
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all"
                    >
                      <span>Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
