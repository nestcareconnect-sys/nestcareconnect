import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, Check } from 'lucide-react';
import { Category } from '../../types';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';

interface FiltersState {
  categorySlug: string;
  brand: string;
  inStock: boolean;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

interface ProductFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersState;
  onFilterChange: (key: keyof FiltersState, value: any) => void;
  onReset: () => void;
  categories: Category[];
  brands: string[];
}

export const ProductFiltersDrawer: React.FC<ProductFiltersDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  categories,
  brands,
}) => {
  const { countryConfig } = useCountryCurrency();

  const filterContent = (
    <div className="space-y-6">
      {/* Sort By */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
          Sort By
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange('sortBy', e.target.value)}
          className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none text-gray-800"
        >
          <option value="newest">Newest Arrivals</option>
          <option value="featured">Featured / Popular</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Alphabetical: A-Z</option>
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
          Categories
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onFilterChange('categorySlug', '')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
              filters.categorySlug === ''
                ? 'bg-[#F1FAF3] text-[#237A3B] font-bold border border-[#8BCF9B]/40'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>All Categories</span>
            {filters.categorySlug === '' && <Check className="w-3.5 h-3.5 text-[#237A3B]" />}
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange('categorySlug', cat.slug)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                filters.categorySlug === cat.slug
                  ? 'bg-[#F1FAF3] text-[#237A3B] font-bold border border-[#8BCF9B]/40'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{cat.name}</span>
              {filters.categorySlug === cat.slug && <Check className="w-3.5 h-3.5 text-[#237A3B]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
            Brands
          </label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <button
              onClick={() => onFilterChange('brand', '')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                filters.brand === ''
                  ? 'bg-[#F1FAF3] text-[#237A3B] font-bold border border-[#8BCF9B]/40'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>All Brands</span>
              {filters.brand === '' && <Check className="w-3.5 h-3.5 text-[#237A3B]" />}
            </button>

            {brands.map((b) => (
              <button
                key={b}
                onClick={() => onFilterChange('brand', b)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                  filters.brand === b
                    ? 'bg-[#F1FAF3] text-[#237A3B] font-bold border border-[#8BCF9B]/40'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{b}</span>
                {filters.brand === b && <Check className="w-3.5 h-3.5 text-[#237A3B]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
          Price Range ({countryConfig.currency})
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
          <span className="text-gray-400 text-xs">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
        </div>
      </div>

      {/* In Stock Only */}
      <div className="pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onFilterChange('inStock', e.target.checked)}
            className="w-4 h-4 rounded text-[#237A3B] focus:ring-[#8BCF9B] border-gray-300"
          />
          <span>In Stock Items Only</span>
        </label>
      </div>

      {/* Reset Filter Button */}
      <div className="pt-3">
        <button
          onClick={onReset}
          className="w-full py-2 px-3 border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 p-5 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#237A3B]" /> Filters
            </h3>
          </div>
          {filterContent}
        </div>
      </aside>

      {/* Mobile Bottom Sheet Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-sm bg-white shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F1FAF3]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#237A3B]" />
                    <h3 className="font-semibold text-gray-900 text-sm">Filter Catalog</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">{filterContent}</div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-[#237A3B] text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
