import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight, FolderTree, Package, Layers, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ProductCard } from '../components/product/ProductCard';
import { Category, Product } from '../types';
import { categoriesApi, productsApi } from '../services/api';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '@/constants';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Cached Category metadata
  const { data: category, isLoading: isCategoryLoading } = useQuery<Category | null>({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) return null;
      try {
        const res = await categoriesApi.getBySlug(slug);
        if (res.data?.success && res.data.data) {
          return res.data.data;
        }
      } catch {}

      const findCat = (items: any[]): any => {
        for (const itm of items) {
          if (itm.slug === slug) return itm;
          if (itm.children) {
            const found = findCat(itm.children);
            if (found) return found;
          }
        }
        return null;
      };
      return findCat(INITIAL_CATEGORIES);
    },
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });

  // Infinite query for products in this category
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isProductsLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['category-products', slug],
    queryFn: async ({ pageParam }) => {
      const params: any = {
        categorySlug: slug,
        limit: 20,
      };
      if (pageParam) {
        params.cursor = pageParam;
      }

      try {
        const res = await productsApi.list(params);
        if (res.data?.success && res.data.data) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }

      const mockProducts = INITIAL_PRODUCTS.filter(
        (p) => p.category?.slug === slug || p.tags?.includes(slug || '')
      );
      return {
        products: mockProducts.length > 0 ? mockProducts : INITIAL_PRODUCTS.slice(0, 8),
        nextCursor: null,
        hasMore: false,
        pagination: { total: mockProducts.length || 8 },
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.hasMore === false || !lastPage.nextCursor) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
  });

  // Flatten and deduplicate products
  const products = useMemo(() => {
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

  const totalProducts = data?.pages?.[0]?.pagination?.total ?? products.length;

  // IntersectionObserver for continuous infinite scroll
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

  if (isCategoryLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        <div className="w-8 h-8 border-3 border-[#8BCF9B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading healthcare catalog...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Category Not Found</h2>
        <p className="text-xs text-gray-500">
          The healthcare category you are looking for may have moved or been updated.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-semibold rounded-xl shadow-xs"
        >
          Browse All Products <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // Build breadcrumb trail
  const breadcrumbItems: { label: string; url?: string }[] = [{ label: 'Shop', url: '/shop' }];
  if (category.parent) {
    if (category.parent.parent) {
      breadcrumbItems.push({
        label: category.parent.parent.name,
        url: `/category/${category.parent.parent.slug}`,
      });
    }
    breadcrumbItems.push({
      label: category.parent.name,
      url: `/category/${category.parent.slug}`,
    });
  }
  breadcrumbItems.push({ label: category.name });

  const hasChildren = category.children && category.children.length > 0;

  return (
    <>
      <SEO
        title={`${category.name} | Healthcare Category | Nest Care Connect`}
        description={category.description || `Browse ${category.name} products on Nest Care Connect.`}
      />

      <div className="bg-gray-50 min-h-screen py-4 sm:py-8 pb-28 lg:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbItems} />

          {/* Category Banner */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" /> Category
              </span>
              <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>

            {category.image && (
              <img
                src={category.image}
                alt={category.name}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border border-gray-100 shadow-xs flex-shrink-0"
              />
            )}
          </div>

          {/* Subcategories Grid (if any) */}
          {hasChildren && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#237A3B]" />
                <h3 className="font-bold text-sm sm:text-base text-gray-900">Explore Subcategories</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                {category.children!.map((subCat) => (
                  <Link
                    key={subCat.id}
                    to={`/category/${subCat.slug}`}
                    className="group p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#8BCF9B] shadow-xs hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-1">
                      <h4 className="font-semibold text-xs text-gray-900 group-hover:text-[#237A3B] transition-colors truncate">
                        {subCat.name}
                      </h4>
                      {subCat.description && (
                        <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {subCat.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#237A3B] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products in this category (EXACTLY 2 COLUMNS ON MOBILE) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#237A3B]" /> Products in {category.name}
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                {isProductsLoading ? 'Loading...' : `${totalProducts} product${totalProducts === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Skeleton Loading State */}
            {isProductsLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
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
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="bg-white rounded-3xl border border-red-100 p-8 text-center space-y-3 shadow-xs">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <h3 className="font-bold text-sm text-gray-900">Couldn't load category products</h3>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isProductsLoading && !isError && products.length === 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3 shadow-xs">
                <Package className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="font-bold text-sm text-gray-800">No products in this category yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  We are constantly expanding our catalog. Please explore other categories or check back soon.
                </p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#237A3B] text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Explore All Products
                </Link>
              </div>
            )}

            {/* 2-Column Mobile Infinite Scroll Grid */}
            {!isProductsLoading && products.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Sentinel for IntersectionObserver */}
                <div ref={loadMoreRef} className="h-4 w-full" />

                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-[#237A3B] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-gray-500">
                      Loading more products...
                    </span>
                  </div>
                )}

                {/* End of results message */}
                {!hasNextPage && products.length > 0 && (
                  <div className="py-6 text-center border-t border-gray-100">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>You've reached the end.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
