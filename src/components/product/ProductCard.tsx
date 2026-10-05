import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';

import { getProductImageUrl } from '../../utils/imageUrl';

interface ProductCardProps {
  product: Product;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({ product }) => {
  const { formatPrice, calculateProductPrice } = useCountryCurrency();
  const { addProductToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const { price, compareAtPrice } = calculateProductPrice(product);
  const isWishlisted = isInWishlist(product.id);
  const inStock = product.stock > 0;

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!inStock || isAdding) return;

      setIsAdding(true);
      addProductToCart(product, 1);

      setTimeout(() => {
        setIsAdding(false);
      }, 500);
    },
    [inStock, isAdding, addProductToCart, product]
  );

  const handleWishlistToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(product);
      showToast(
        isWishlisted ? 'Removed from saved items' : 'Saved to wishlist!',
        'info'
      );
    },
    [toggleWishlist, product, isWishlisted, showToast]
  );

  const discountPercentage =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const thumbnail = getProductImageUrl(product.images?.[0], product.updatedAt);

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B]/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Top Badges & Actions */}
      <div className="relative">
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isWishlisted
              ? 'bg-red-50 text-red-500 shadow-xs'
              : 'bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 shadow-2xs'
          }`}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-[#237A3B] text-white text-[9px] sm:text-[10px] font-bold tracking-tight shadow-xs">
            {discountPercentage}% OFF
          </span>
        )}

        {/* Image Thumbnail Container */}
        <Link
          to={`/product/${product.slug}`}
          className="block relative aspect-square bg-[#F9FAFB] overflow-hidden p-2 flex items-center justify-center"
        >
          <img
            src={thumbnail}
            alt={product.name}
            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>

      {/* Card Details */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Brand & Stock / Unit */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 mb-0.5">
            <span className="font-semibold text-gray-500 truncate max-w-[90px] sm:max-w-[130px]">
              {product.brand || 'Nest Care'}
            </span>
            {product.unit ? (
              <span className="truncate max-w-[60px] text-gray-400">{product.unit}</span>
            ) : !inStock ? (
              <span className="text-red-500 font-semibold">Out of Stock</span>
            ) : null}
          </div>

          {/* Product Title (Consistent 2-line height) */}
          <Link
            to={`/product/${product.slug}`}
            className="block font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-[#237A3B] transition-colors line-clamp-2 leading-snug min-h-[32px] sm:min-h-[36px]"
          >
            {product.name}
          </Link>
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 sm:gap-2">
          <div className="min-w-0">
            <div className="font-extrabold text-xs sm:text-sm md:text-base text-[#237A3B] truncate">
              {formatPrice(price)}
            </div>
            {compareAtPrice && compareAtPrice > price && (
              <div className="text-[10px] sm:text-[11px] text-gray-400 line-through truncate -mt-0.5">
                {formatPrice(compareAtPrice)}
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || isAdding}
            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 cursor-pointer ${
              isAdding
                ? 'bg-[#237A3B] text-white shadow-xs'
                : inStock
                ? 'bg-[#F1FAF3] hover:bg-[#237A3B] text-[#237A3B] hover:text-white border border-[#8BCF9B]/50 shadow-2xs active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={inStock ? 'Add to Cart' : 'Out of Stock'}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdding ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] hidden sm:inline font-bold">
              {isAdding ? 'Added' : inStock ? 'Add' : 'Sold Out'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductCard = React.memo(ProductCardComponent);
