import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Star,
  Sparkles,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ImageGallery } from '../components/product/ImageGallery';
import { ProductCard } from '../components/product/ProductCard';
import { Product, Review } from '../types';
import { productsApi, reviewsApi } from '../services/api';
import { useCountryCurrency } from '../context/CountryCurrencyContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useProductBySlug } from '../hooks/useQueries';
import { INITIAL_PRODUCTS } from '@/constants';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { formatPrice, calculateProductPrice, countryConfig } = useCountryCurrency();
  const { addProductToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useProductBySlug(slug);
  const product = data?.product || null;
  const relatedProducts = data?.relatedProducts || [];

  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Sync reviews when product data is loaded
  useEffect(() => {
    if (product?.reviews) {
      setReviews(product.reviews);
    }
  }, [product?.reviews]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        <div className="w-8 h-8 border-3 border-[#8BCF9B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Product Not Found</h2>
        <p className="text-xs text-gray-500">The product you are looking for may be unavailable.</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const { price, compareAtPrice } = calculateProductPrice(product);
  const isWishlisted = isInWishlist(product.id);
  const inStock = product.stock > 0;

  const handleAddToCart = async () => {
    if (!inStock) return;
    await addProductToCart(product, quantity);
    showToast(`${quantity} × ${product.name} added to cart!`, 'success');
  };

  const handleBuyNow = async () => {
    if (!inStock) return;
    await addProductToCart(product, quantity);
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    if (!isAuthenticated) {
      showToast('Please sign in to submit a verified product review.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await reviewsApi.create({
        productId: product.id,
        rating,
        comment: comment.trim(),
      });

      if (res.data?.success) {
        showToast('Thank you! Your review was submitted.', 'success');
        setReviews((prev) => [res.data.data, ...prev]);
        setComment('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Shop', url: '/shop' },
    ...(product.category
      ? [{ label: product.category.name, url: `/category/${product.category.slug}` }]
      : []),
    { label: product.name },
  ];

  const specs = (product.specifications as Record<string, string>) || {};

  return (
    <>
      <SEO
        title={`${product.name} | Buy Online`}
        description={product.shortDescription || product.description}
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbItems} />

          {/* Product Primary Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Gallery (6 cols) */}
            <div className="lg:col-span-6">
              <ImageGallery images={product.images} productName={product.name} updatedAt={product.updatedAt} />
            </div>

            {/* Product Meta & Actions (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Brand & SKU */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-3">
                  <span className="font-bold text-[#237A3B] uppercase tracking-wider">
                    {product.brand || 'Nest Care Certified'}
                  </span>
                  <span className="font-mono text-gray-400">SKU: {product.sku}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                  {product.name}
                </h1>

                {/* Short Info */}
                {product.shortDescription && (
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {product.shortDescription}
                  </p>
                )}

                {/* Pricing Box */}
                <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#237A3B]">
                    {formatPrice(price)}
                  </span>
                  {compareAtPrice && compareAtPrice > price && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(compareAtPrice)}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-semibold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                    Inclusive of Taxes ({countryConfig.currency})
                  </span>
                </div>

                {/* Stock & Fulfillment Badge */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  {inStock ? (
                    <div className="flex items-center gap-1.5 text-[#237A3B]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>In Stock ({product.stock} units ready to ship)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Currently Out of Stock</span>
                    </div>
                  )}

                  {product.unit && (
                    <span className="text-gray-500">• Unit: {product.unit}</span>
                  )}
                </div>
              </div>

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-xs font-bold text-gray-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      disabled={quantity >= product.stock}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isWishlisted
                        ? 'border-red-200 bg-red-50 text-red-500'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-red-500'
                    }`}
                    title="Save to Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#F1FAF3] hover:bg-[#E3F5E8] text-[#237A3B] font-bold text-xs sm:text-sm rounded-xl border border-[#8BCF9B] transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="w-full py-3.5 px-4 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>

                {/* Trust mini banner */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>100% Genuine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>Direct Delivery</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-[#237A3B] flex-shrink-0" />
                    <span>Safe Return</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Technical Specifications */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
            <h3 className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-3">
              Description & Specifications
            </h3>

            <div className="prose prose-sm max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed">
              <p>{product.description}</p>
            </div>

            {Object.keys(specs).length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-3">
                  Technical Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between text-xs"
                    >
                      <span className="font-medium text-gray-500">{key}</span>
                      <span className="font-bold text-gray-900">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs space-y-6">
            <h3 className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Customer Reviews & Feedback ({reviews.length})</span>
            </h3>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-gray-500">
                No reviews yet. Be the first to share your experience with this medical item.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{rev.userName}</span>
                      <div className="flex items-center text-amber-500 text-xs">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Write a Review */}
            <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">Write a Review</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:text-amber-500"
                    >
                      <Star
                        className={`w-4 h-4 ${star <= rating ? 'fill-amber-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share clinical accuracy, ease of use, or delivery feedback..."
                className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
              />

              <button
                type="submit"
                disabled={isSubmittingReview || !comment.trim()}
                className="px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                Submit Review
              </button>
            </form>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Similar Healthcare Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
