import { useQuery } from '@tanstack/react-query';
import {
  categoriesApi,
  hampersApi,
  heroSlidesApi,
  boxesApi,
  productsApi,
} from '../services/api';
import { Category, Hamper, HeroSlide, HamperBox, Product } from '../types';

/**
 * Fetch and cache category hierarchy from database
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.getTree();
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache all curated hampers from database
 */
export function useHampers() {
  return useQuery<Hamper[]>({
    queryKey: ['hampers'],
    queryFn: async () => {
      const res = await hampersApi.getAll();
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache active hero banner slides from database
 */
export function useHeroSlides() {
  return useQuery<HeroSlide[]>({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const res = await heroSlidesApi.getActive();
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch and cache available hamper boxes from database
 */
export function useHamperBoxes() {
  return useQuery<HamperBox[]>({
    queryKey: ['hamper-boxes'],
    queryFn: async () => {
      const res = await boxesApi.getAll();
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch single product details with related products and reviews from database
 */
export function useProductBySlug(slug?: string) {
  return useQuery<{ product: Product; relatedProducts: Product[] }>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const res = await productsApi.getBySlug(slug);
      if (res.data?.success && res.data.data?.product) {
        return res.data.data;
      }
      throw new Error(`Product with slug '${slug}' not found.`);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}
