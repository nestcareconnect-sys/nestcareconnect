import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { productsApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { INITIAL_PRODUCTS } from '@/constants';

export const FeaturedProducts: React.FC = () => {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      try {
        const res = await productsApi.getAll({ featured: 'true', limit: '8' });
        if (res.data?.success && res.data.data?.products?.length > 0) {
          return res.data.data.products;
        }
      } catch {}
      return INITIAL_PRODUCTS.filter((p) => p.featured).slice(0, 8);
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-14 bg-[#F1FAF3]/50 border-y border-[#8BCF9B]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#237A3B]" /> Verified Medical Essentials
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              Featured Healthcare Products
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237A3B] hover:text-[#1c6330] hover:underline"
          >
            Explore Full Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
