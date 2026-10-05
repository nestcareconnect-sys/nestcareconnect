import { useQuery } from '@tanstack/react-query';
import {
  categoriesApi,
  hampersApi,
  heroSlidesApi,
  boxesApi,
  productsApi,
} from '../services/api';
import { Category, Hamper, HeroSlide, HamperBox, Product } from '../types';
import { INITIAL_CATEGORIES, INITIAL_HAMPERS, INITIAL_HERO_SLIDES, INITIAL_HAMPER_BOXES, INITIAL_PRODUCTS } from '@/constants';

/**
 * Fetch and cache category hierarchy
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await categoriesApi.getTree();
        if (res.data?.success && res.data.data?.length) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
      return INITIAL_CATEGORIES;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache all curated hampers
 */
export function useHampers() {
  return useQuery<Hamper[]>({
    queryKey: ['hampers'],
    queryFn: async () => {
      try {
        const res = await hampersApi.getAll();
        if (res.data?.success && res.data.data?.length) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
      return INITIAL_HAMPERS as any;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache active hero banner slides
 */
export function useHeroSlides() {
  return useQuery<HeroSlide[]>({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      try {
        const res = await heroSlidesApi.getActive();
        if (res.data?.success && res.data.data?.length) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
      return INITIAL_HERO_SLIDES as any;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache available hamper boxes
 */
export function useHamperBoxes() {
  return useQuery<HamperBox[]>({
    queryKey: ['hamper-boxes'],
    queryFn: async () => {
      try {
        const res = await boxesApi.getAll();
        if (res.data?.success && res.data.data?.length) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
      return INITIAL_HAMPER_BOXES as any;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch single product details with related products and reviews
 */
export function useProductBySlug(slug?: string) {
  return useQuery<{ product: Product; relatedProducts: Product[] }>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      try {
        const res = await productsApi.getBySlug(slug);
        if (res.data?.success && res.data.data) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
      const found = INITIAL_PRODUCTS.find((p) => p.slug === slug);
      if (found) {
        return { product: found, relatedProducts: [] };
      }
      throw new Error('Product not found');
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}
