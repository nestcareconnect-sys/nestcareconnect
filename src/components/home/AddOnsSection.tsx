import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Plus, Check, Heart, Shield, Gift, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { getProductImageUrl } from '../../utils/imageUrl';
import { INITIAL_PRODUCTS } from '../../constants';

export const AddOnsSection: React.FC = () => {
  const { formatPrice, calculateProductPrice } = useCountryCurrency();
  const { addProductToCart } = useCart();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'PERSONAL_CARE' | 'MEDICAL_MOBILITY' | 'GIFT_LIFESTYLE'>('GIFT_LIFESTYLE');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const { data: allAddOns = [] } = useQuery<Product[]>({
    queryKey: ['products', 'addons'],
    queryFn: async () => {
      try {
        const res = await productsApi.getAll({ isAddOn: 'true', limit: '30' });
        if (res.data?.success && res.data.data?.products?.length > 0) {
          return res.data.data.products;
        }
      } catch {}
      return INITIAL_PRODUCTS.filter((p) => p.isAddOn);
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentAddOns = allAddOns.filter((p) => p.addOnCategory === activeTab);

  const handleQuickAdd = async (product: Product) => {
    try {
      await addProductToCart(product, 1);
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      showToast(`${product.name} added to cart!`, 'success');
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    } catch (err: any) {
      showToast(err.message || 'Failed to add item to cart.', 'error');
    }
  };

  return (
    <section className="py-14 sm:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#237A3B]" />
              <span>🧴 PERSONALISE YOUR HAMPER</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1F2937] tracking-tight">
              Curated Add-Ons for Any Gift Box
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Add individual tokens of affection — from handcrafted brass Diyas to Kerala Kasavu attire and elder-friendly dining accessories.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('GIFT_LIFESTYLE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'GIFT_LIFESTYLE'
                  ? 'bg-white text-[#237A3B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎁 Gift & Lifestyle
            </button>
            <button
              onClick={() => setActiveTab('PERSONAL_CARE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'PERSONAL_CARE'
                  ? 'bg-white text-[#237A3B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🧴 Personal Care
            </button>
            <button
              onClick={() => setActiveTab('MEDICAL_MOBILITY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'MEDICAL_MOBILITY'
                  ? 'bg-white text-[#237A3B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🩺 Medical & Mobility
            </button>
          </div>
        </div>

        {/* Add-ons List Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {currentAddOns.map((item) => {
            const { price } = calculateProductPrice(item);
            const isAdded = !!addedIds[item.id];

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between bg-white rounded-2xl border border-gray-200/80 p-3.5 hover:border-[#8BCF9B] hover:shadow-md transition-all"
              >
                <div>
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-50 mb-3 relative">
                    <img
                      src={getProductImageUrl(item.images?.[0], item.updatedAt)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-gray-700 px-2 py-0.5 rounded-md border border-gray-100">
                      Add-on
                    </div>
                  </div>

                  <Link to={`/product/${item.slug}`}>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#237A3B] transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{item.shortDescription || item.unit}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-extrabold text-[#237A3B]">
                    {formatPrice(price)}
                  </div>

                  <button
                    onClick={() => handleQuickAdd(item)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      isAdded
                        ? 'bg-[#237A3B] text-white'
                        : 'bg-[#F1FAF3] text-[#237A3B] hover:bg-[#E3F5E8] border border-[#8BCF9B]/50'
                    }`}
                    title="Add this add-on to cart"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info link */}
        <div className="mt-8 text-center">
          <Link
            to="/custom-hamper"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#237A3B] hover:underline"
          >
            <span>Want to build an entire bespoke care box with custom add-ons?</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
