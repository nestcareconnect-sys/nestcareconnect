import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { productsApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { INITIAL_PRODUCTS } from '../../constants';

export const AddCareSection: React.FC = () => {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', 'medical-care-preview'],
    queryFn: async () => {
      try {
        const res = await productsApi.getAll({
          categorySlug: 'medical-care',
          limit: '4',
        });
        if (res.data?.success && res.data.data?.products?.length > 0) {
          return res.data.data.products;
        }
      } catch {}
      return INITIAL_PRODUCTS.filter(
        (p) =>
          p.categoryId?.includes('medical') ||
          p.categoryId?.includes('bp') ||
          p.categoryId?.includes('diabetes') ||
          p.categoryId?.includes('personal')
      ).slice(0, 4);
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-14 sm:py-16 bg-gray-50/50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-2.5">
              <Activity className="w-3.5 h-3.5 text-[#237A3B]" />
              <span>🩺 ADD CARE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1F2937] tracking-tight">
              Medical, Mobility & Personal-Care Products
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Practical little extras, thoughtfully selected to add comfort, safety, and health monitoring for your parents.
            </p>
          </div>

          <Link
            to="/category/medical-care"
            className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-xl bg-white hover:bg-[#F1FAF3] text-[#237A3B] text-xs sm:text-sm font-bold border border-gray-200 hover:border-[#8BCF9B] transition-all shadow-xs"
          >
            <span>Shop Care Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
