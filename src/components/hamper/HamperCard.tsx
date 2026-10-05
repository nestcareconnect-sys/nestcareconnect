import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, ArrowRight, CheckCircle2, Check } from 'lucide-react';
import { Hamper } from '../../types';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getHamperImageUrl } from '../../utils/imageUrl';

interface HamperCardProps {
  hamper: Hamper;
}

const HamperCardComponent: React.FC<HamperCardProps> = ({ hamper }) => {
  const { formatPrice, calculateHamperPrice } = useCountryCurrency();
  const { addHamperToCart } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const price = calculateHamperPrice(hamper);

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdding) return;

      setIsAdding(true);
      addHamperToCart(hamper, 1);

      setTimeout(() => {
        setIsAdding(false);
      }, 500);
    },
    [isAdding, addHamperToCart, hamper]
  );

  const badgeColor =
    hamper.hamperType === 'PREMIUM_PLUS'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : hamper.hamperType === 'PREMIUM'
      ? 'bg-[#E3F5E8] text-[#237A3B] border-[#8BCF9B]'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  const typeLabel =
    hamper.hamperType === 'PREMIUM_PLUS'
      ? 'Premium Plus Care'
      : hamper.hamperType === 'PREMIUM'
      ? 'Premium Shield'
      : 'Essential Care';

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B]/60 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Hamper Badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeColor}`}>
          {typeLabel}
        </span>
      </div>

      {/* Image Thumbnail */}
      <Link
        to={`/hampers/${hamper.slug}`}
        className="block relative aspect-4/3 bg-[#F9FAFB] overflow-hidden"
      >
        <img
          src={getHamperImageUrl(hamper.images?.[0], hamper.updatedAt)}
          alt={hamper.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <Link
            to={`/hampers/${hamper.slug}`}
            className="block font-bold text-base text-gray-900 group-hover:text-[#237A3B] transition-colors leading-snug mb-1"
          >
            {hamper.name}
          </Link>

          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {hamper.shortDescription || hamper.description}
          </p>

          {/* Item count preview */}
          {hamper.items && hamper.items.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#237A3B]" />
              <span>Includes {hamper.items.length} verified health products</span>
            </div>
          )}
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Care Package From
            </div>
            <div className="font-extrabold text-base sm:text-lg text-[#237A3B]">
              {formatPrice(price)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/hampers/${hamper.slug}`}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 transition-colors"
            >
              Details
            </Link>

            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isAdding
                  ? 'bg-[#1c6330] text-white'
                  : 'bg-[#237A3B] hover:bg-[#1c6330] text-white'
              }`}
            >
              {isAdding ? (
                <>
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <span>Add</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HamperCard = React.memo(HamperCardComponent);
