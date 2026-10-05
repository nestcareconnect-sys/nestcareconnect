import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Package,
  AlertCircle,
  Search,
  X,
  ArrowUpDown,
  Check,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  Activity,
  Heart,
  Baby,
  PartyPopper,
  UserCheck,
  Gift,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ProductCard } from '../components/product/ProductCard';
import { ProductFiltersDrawer } from '../components/product/ProductFiltersDrawer';
import { Product, Category } from '../types';
import { productsApi } from '../services/api';
import { useCategories } from '../hooks/useQueries';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '@/constants';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Parameters State
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || searchParams.get('sortBy') || 'newest';
  const currentSearch = searchParams.get('search') || searchParams.get('q') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentTag = searchParams.get('tag') || '';
  const currentType = searchParams.get('type') || '';

  // Local Search Input state for debouncing
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);

  const { data: rawCategories = INITIAL_CATEGORIES } = useCategories();

  const categories = useMemo(() => {
    const flat: Category[] = [];
    rawCategories.forEach((r) => {
      flat.push(r);
      if (r.children) r.children.forEach((c) => flat.push(c));
    });
    return flat;
  }, [rawCategories]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Debounced search update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (searchInput.trim()) {
              next.set('search', searchInput.trim());
            } else {
              next.delete('search');
            }
            return next;
          },
          { replace: true }
        );
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, setSearchParams]);

  // Filter params object for React Query key & request
  const filterParams = useMemo(
    () => ({
      categorySlug: currentCategory,
      sortBy: currentSort,
      search: currentSearch,
      brand: currentBrand,
      inStock: currentInStock,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice,
      tag: currentTag,
      isAddOn: currentType === 'addon' ? 'true' : undefined,
    }),
    [
      currentCategory,
      currentSort,
      currentSearch,
      currentBrand,
      currentInStock,
      currentMinPrice,
      currentMaxPrice,
      currentTag,
      currentType,
    ]
  );

  // TanStack React Query v5 Infinite Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['products', filterParams],
    queryFn: async ({ pageParam }) => {
      const params: any = {
        limit: 20,
        sortBy: filterParams.sortBy,
      };

      if (pageParam) {
        params.cursor = pageParam;
      }
      if (filterParams.categorySlug) params.categorySlug = filterParams.categorySlug;
      if (filterParams.brand) params.brand = filterParams.brand;
      if (filterParams.inStock) params.inStock = 'true';
      if (filterParams.minPrice) params.minPrice = filterParams.minPrice;
      if (filterParams.maxPrice) params.maxPrice = filterParams.maxPrice;
      if (filterParams.search) params.search = filterParams.search;
      if (filterParams.isAddOn) params.isAddOn = filterParams.isAddOn;
      if (filterParams.tag) params.tag = filterParams.tag;

      try {
        const res = await productsApi.list(params);
        if (res.data?.success && res.data.data) {
          // Extract brands if available
          if (res.data.data.products?.length) {
            const fetchedBrands = Array.from(
              new Set(
                res.data.data.products
                  .map((p) => p.brand)
                  .filter((b): b is string => Boolean(b))
              )
            );
            if (fetchedBrands.length > 0) {
              setBrands((prev) => Array.from(new Set([...prev, ...fetchedBrands])));
            }
          }
          return res.data.data;
        }
      } catch {
        // Fallback to local filtering of constants for seamless testing
      }

      // Mock / Offline Fallback filtering
      let mockList = [...INITIAL_PRODUCTS];
      if (filterParams.categorySlug) {
        mockList = mockList.filter(
          (p) =>
            p.category?.slug === filterParams.categorySlug ||
            p.tags?.includes(filterParams.categorySlug)
        );
      }
      if (filterParams.search) {
        const q = filterParams.search.toLowerCase();
        mockList = mockList.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q)
        );
      }
      if (filterParams.brand) {
        mockList = mockList.filter((p) => p.brand === filterParams.brand);
      }
      if (filterParams.inStock) {
        mockList = mockList.filter((p) => p.stock > 0);
      }
      if (filterParams.sortBy === 'price-low' || filterParams.sortBy === 'price_asc') {
        mockList.sort((a, b) => a.basePriceINR - b.basePriceINR);
      } else if (filterParams.sortBy === 'price-high' || filterParams.sortBy === 'price_desc') {
        mockList.sort((a, b) => b.basePriceINR - a.basePriceINR);
      }

      return {
        products: mockList,
        nextCursor: null,
        hasMore: false,
        pagination: { total: mockList.length },
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.hasMore === false || !lastPage.nextCursor) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Flatten products list and deduplicate by ID
  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const list: Product[] = [];
    for (const page of data.pages) {
      if (page?.products) {
        for (const prod of page.products) {
          if (!seen.has(prod.id)) {
            seen.add(prod.id);
            list.push(prod);
          }
        }
      }
    }
    return list;
  }, [data]);

  const totalCount = data?.pages?.[0]?.pagination?.total ?? allProducts.length;

  // IntersectionObserver for Infinite Scrolling (triggers 600px before reaching bottom)
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '600px 0px',
        threshold: 0.1,
      }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Update URL Filters Handler
  const handleUpdateFilter = useCallback(
    (key: string, value: any) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === '' || value === false || value === undefined || value === null) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleResetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput('');
  }, [setSearchParams]);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count++;
    if (currentBrand) count++;
    if (currentInStock) count++;
    if (currentMinPrice || currentMaxPrice) count++;
    if (currentSearch) count++;
    if (currentTag) count++;
    if (currentType) count++;
    return count;
  }, [
    currentCategory,
    currentBrand,
    currentInStock,
    currentMinPrice,
    currentMaxPrice,
    currentSearch,
    currentTag,
    currentType,
  ]);

  // Quick Category Pills Data
  const categoryPills = [
    { label: 'All Products', slug: '', icon: '🛍️' },
    { label: 'Medical Care', slug: 'medical-care', icon: '🩺' },
    { label: 'For Mum', slug: 'for-mum', icon: '👩' },
    { label: 'For Dad', slug: 'for-dad', icon: '👨' },
    { label: 'Wedding', slug: 'wedding', icon: '💍' },
    { label: 'Anniversary', slug: 'anniversary', icon: '❤️' },
    { label: 'New Mum & Baby', slug: 'new-mum-baby', icon: '👶' },
    { label: 'Celebrations', slug: 'celebrations', icon: '🎉' },
    { label: 'Gifts', slug: 'gifts', tag: 'gift', icon: '🎁' },
    { label: 'Add-ons', slug: 'addons', type: 'addon', icon: '✨' },
  ];

  // Sort Options
  const sortOptions = [
    { label: 'Newest Arrivals', value: 'newest' },
    { label: 'Featured / Popular', value: 'popular' },
    { label: 'Price: Low to High', value: 'price-low' },
    { label: 'Price: High to Low', value: 'price-high' },
    { label: 'Alphabetical: A-Z', value: 'name_asc' },
  ];

  const currentSortLabel =
    sortOptions.find((s) => s.value === currentSort)?.label || 'Newest Arrivals';

  return (
    <>
      <SEO
        title="Shop Healthcare & Wellness Products | Nest Care Connect"
        description="Browse certified blood glucose meters, BP monitors, adult diapers, Ayurvedic skincare, and traditional essentials for loved ones in India, UAE, and USA."
      />

      <div className="bg-gray-50 min-h-screen py-4 sm:py-8 pb-28 lg:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          {/* Breadcrumbs */}
          <Breadcrumbs items={[{ label: 'Shop Healthcare Products' }]} />

          {/* ========================================================================= */}
          {/* 1. CLEAN SHOP HEADER                                                      */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  Healthcare & Care Products
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Care products and thoughtful essentials for the people who matter.
                </p>
              </div>

              {/* Product count */}
              <div className="text-xs font-semibold text-[#237A3B] bg-[#F1FAF3] px-3 py-1.5 rounded-xl border border-[#8BCF9B]/30 self-start md:self-auto flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>
                  {isLoading ? 'Loading...' : `${totalCount} product${totalCount === 1 ? '' : 's'}`}
                </span>
              </div>
            </div>

            {/* Search Field */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products, monitors, or care items..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-[#8BCF9B] focus:bg-white transition-colors"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {categoryPills.map((pill) => {
                const isSelected =
                  pill.type === 'addon'
                    ? currentType === 'addon'
                    : pill.tag
                    ? currentTag === pill.tag
                    : currentCategory === pill.slug;

                return (
                  <button
                    key={pill.label}
                    onClick={() => {
                      if (pill.type === 'addon') {
                        handleUpdateFilter('type', 'addon');
                        handleUpdateFilter('category', '');
                        handleUpdateFilter('tag', '');
                      } else if (pill.tag) {
                        handleUpdateFilter('tag', pill.tag);
                        handleUpdateFilter('category', '');
                        handleUpdateFilter('type', '');
                      } else {
                        handleUpdateFilter('category', pill.slug);
                        handleUpdateFilter('tag', '');
                        handleUpdateFilter('type', '');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 shadow-2xs ${
                      isSelected
                        ? 'bg-[#237A3B] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-[#F1FAF3] text-gray-700 hover:text-[#237A3B] border border-transparent'
                    }`}
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Filter & Sort Bar */}
            <div className="flex lg:hidden items-center justify-between gap-2 pt-2 border-t border-gray-100">
              {/* Filter Button with active count */}
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  activeFiltersCount > 0
                    ? 'bg-[#F1FAF3] text-[#237A3B] border-[#8BCF9B]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-[#237A3B]" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#237A3B] text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Button */}
              <button
                onClick={() => setIsMobileSortOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold border border-gray-200 transition-all truncate"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#237A3B]" />
                <span className="truncate">{currentSortLabel}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MAIN LAYOUT: DESKTOP FILTERS SIDEBAR + 2-COLUMN MOBILE PRODUCT GRID    */}
          {/* ========================================================================= */}
          <div className="flex gap-6 items-start">
            {/* Desktop Filters Sidebar */}
            <ProductFiltersDrawer
              isOpen={isMobileFiltersOpen}
              onClose={() => setIsMobileFiltersOpen(false)}
              filters={{
                categorySlug: currentCategory,
                brand: currentBrand,
                inStock: currentInStock,
                minPrice: currentMinPrice,
                maxPrice: currentMaxPrice,
                sortBy: currentSort,
              }}
              onFilterChange={(key, val) => handleUpdateFilter(key === 'categorySlug' ? 'category' : key, val)}
              onReset={handleResetFilters}
              categories={categories}
              brands={brands}
            />

            {/* Products Content Area */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Initial Loading Skeleton (EXACTLY 2 COLUMNS ON MOBILE) */}
              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div
                      key={n}
                      className="bg-white rounded-2xl border border-gray-100 p-2.5 sm:p-3.5 space-y-3 animate-pulse"
                    >
                      <div className="aspect-square bg-gray-100 rounded-xl w-full" />
                      <div className="space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                      <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                        <div className="h-4 bg-gray-100 rounded w-1/3" />
                        <div className="h-7 w-12 bg-gray-100 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Initial Error State */}
              {isError && (
                <div className="bg-white rounded-3xl border border-red-100 p-10 text-center space-y-3 shadow-xs">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <h3 className="font-bold text-base text-gray-900">Couldn't load healthcare catalog</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Please check your connection and try loading again.
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1c6330] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && allProducts.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-4 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Package className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900">No products found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      No healthcare products matched your active filters or search terms.
                    </p>
                  </div>
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1c6330] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}

              {/* ===================================================================== */}
              {/* 3. MOBILE EXACTLY 2 PRODUCTS PER ROW INFINITE SCROLL GRID             */}
              {/* ===================================================================== */}
              {!isLoading && allProducts.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {allProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Sentinel Element for IntersectionObserver */}
                  <div ref={loadMoreRef} className="h-4 w-full" />

                  {/* Loading More Indicator at Bottom */}
                  {isFetchingNextPage && (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#237A3B] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-gray-500">
                        Loading more products...
                      </span>
                    </div>
                  )}

                  {/* End of Products Message */}
                  {!hasNextPage && allProducts.length > 0 && (
                    <div className="py-8 text-center border-t border-gray-100">
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-xs font-semibold">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>You've reached the end.</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Showing all {allProducts.length} available products.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE SORT BOTTOM SHEET                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMobileSortOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSortOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 space-y-4 z-10"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />

              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-[#237A3B]" /> Sort Products By
                </h3>
                <button
                  onClick={() => setIsMobileSortOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {sortOptions.map((opt) => {
                  const isSelected = currentSort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        handleUpdateFilter('sort', opt.value);
                        setIsMobileSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold text-left transition-all ${
                        isSelected
                          ? 'bg-[#F1FAF3] text-[#237A3B] border border-[#8BCF9B]/40 shadow-xs'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#237A3B] stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
