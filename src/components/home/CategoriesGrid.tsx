import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Category } from '../../types';
import { useCategories } from '../../hooks/useQueries';
import { INITIAL_CATEGORIES } from '@/constants';

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'diabetes-care': 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80',
  'blood-pressure-care': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
  'personal-care': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80',
  'wellness-nutrition': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
  healthcare: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
};

export const CategoriesGrid: React.FC = () => {
  const { data: rawCategories = INITIAL_CATEGORIES, isLoading } = useCategories();

  const categories = useMemo(() => {
    const flatList: Category[] = [];
    rawCategories.forEach((root) => {
      if (root.children && root.children.length > 0) {
        root.children.forEach((c) => flatList.push(c));
      } else {
        flatList.push(root);
      }
    });
    return flatList.slice(0, 4);
  }, [rawCategories]);

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40">
              Targeted Care Solutions
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              Browse Healthcare Categories
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237A3B] hover:text-[#1c6330] hover:underline"
          >
            View All Categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const bgImage =
              category.image ||
              CATEGORY_FALLBACK_IMAGES[category.slug] ||
              CATEGORY_FALLBACK_IMAGES['healthcare'];

            return (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 hover:shadow-lg transition-all duration-300 flex flex-col h-64"
              >
                {/* Image background with overlay */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={bgImage}
                    alt={category.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-900/40 to-transparent" />
                </div>

                {/* Text Content */}
                <div className="relative mt-auto p-5 space-y-1.5 text-white">
                  <h3 className="text-lg font-bold group-hover:text-[#8BCF9B] transition-colors leading-snug">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                      {category.description}
                    </p>
                  )}
                  <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-[#8BCF9B] group-hover:translate-x-1 transition-transform">
                    <span>Explore Solutions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
