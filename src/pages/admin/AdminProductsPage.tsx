import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  Package,
  Upload,
  Loader2,
  Truck,
  Scale,
  Box,
  Info,
  HelpCircle,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Product, Category, CountryCode, CurrencyCode } from '../../types';
import { productsApi, categoriesApi, uploadApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductImageUrl } from '../../utils/imageUrl';
import {
  calculateProductShippingDetails,
  hasCompleteShippingDetails,
  WeightUnit,
  DimensionUnit,
} from '../../utils/shippingCalculation';

export const AdminProductsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    description: '',
    shortDescription: '',
    images: [''],
    basePriceINR: '',
    compareAtPriceINR: '',
    stock: '50',
    categoryId: '',
    brand: 'Nest Care Connect',
    unit: '1 Unit',
    weight: '0.5',
    weightUnit: 'kg' as WeightUnit,
    length: '20',
    width: '15',
    height: '10',
    dimensionUnit: 'cm' as DimensionUnit,
    status: 'ACTIVE',
    featured: false,
    productType: 'normal' as 'normal' | 'hamper',
    tags: '',
    countryPriceAE: '',
    countryPriceUS: '',
  });

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'NORMAL' | 'HAMPER'>('ALL');

  const {
    data: queryProducts,
    isLoading: isProductsQueryLoading,
    isFetching: isProductsFetching,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const prodRes = await productsApi.list({ limit: 100 });
      if (prodRes.data?.success && prodRes.data.data?.products) {
        return prodRes.data.data.products;
      }
      throw new Error((prodRes.data as any)?.message || 'Failed to retrieve products from database.');
    },
    staleTime: 60000,
  });

  const { data: queryCategories } = useQuery({
    queryKey: ['admin-categories-flat'],
    queryFn: async () => {
      const catRes = await categoriesApi.getTree();
      if (catRes.data?.success && catRes.data.data) {
        const flat: Category[] = [];
        catRes.data.data.forEach((r) => {
          flat.push(r);
          if (r.children) r.children.forEach((c) => flat.push(c));
        });
        return flat;
      }
      return [];
    },
    staleTime: 5 * 60000,
  });

  const isCatalogLoading = isProductsQueryLoading || (isLoading && products.length === 0);

  useEffect(() => {
    if (queryProducts) {
      setProducts(queryProducts);
      setIsLoading(false);
    } else if (isProductsError) {
      setIsLoading(false);
    }
  }, [queryProducts, isProductsError]);

  useEffect(() => {
    if (queryCategories) {
      setCategories(queryCategories);
    }
  }, [queryCategories]);

  const loadData = () => {
    refetchProducts();
  };

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      slug: '',
      sku: `NCC-PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      description: '',
      shortDescription: '',
      images: ['https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'],
      basePriceINR: '',
      compareAtPriceINR: '',
      stock: '50',
      categoryId: categories[0]?.id || '',
      brand: 'Nest Care Connect',
      unit: '1 Unit',
      weight: '500',
      weightUnit: 'g',
      length: '20',
      width: '15',
      height: '10',
      dimensionUnit: 'cm',
      status: 'ACTIVE',
      featured: false,
      productType: 'normal',
      tags: 'healthcare, testing',
      countryPriceAE: '',
      countryPriceUS: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    const aePrice = product.countryPrices?.find((cp) => cp.country === 'AE')?.fixedPrice?.toString() || '';
    const usPrice = product.countryPrices?.find((cp) => cp.country === 'US')?.fixedPrice?.toString() || '';

    const pWeightUnit = (product.weightUnit || 'kg') as WeightUnit;
    const pDimUnit = (product.dimensionUnit || 'cm') as DimensionUnit;

    // Format weight according to selected unit
    let displayWeight = '';
    if (product.weight !== null && product.weight !== undefined) {
      if (pWeightUnit === 'g') {
        displayWeight = Math.round(product.weight * 1000).toString();
      } else {
        displayWeight = product.weight.toString();
      }
    }

    const pLength = (product.length || product.packageLength)?.toString() || '';
    const pWidth = (product.width || product.packageWidth)?.toString() || '';
    const pHeight = (product.height || product.packageHeight)?.toString() || '';

    setFormData({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      shortDescription: product.shortDescription || '',
      images: product.images && product.images.length > 0 ? product.images : [''],
      basePriceINR: product.basePriceINR.toString(),
      compareAtPriceINR: product.compareAtPriceINR?.toString() || '',
      stock: product.stock.toString(),
      categoryId: product.categoryId || '',
      brand: product.brand || '',
      unit: product.unit || '',
      weight: displayWeight,
      weightUnit: pWeightUnit,
      length: pLength,
      width: pWidth,
      height: pHeight,
      dimensionUnit: pDimUnit,
      status: product.status,
      featured: product.featured,
      productType: (product.productType || 'normal') as 'normal' | 'hamper',
      tags: product.tags?.join(', ') || '',
      countryPriceAE: aePrice,
      countryPriceUS: usPrice,
    });
    setIsModalOpen(true);
  };

  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    if (formData.weight) {
      const val = parseFloat(formData.weight);
      if (!isNaN(val) && val > 0) {
        if (formData.weightUnit === 'kg' && newUnit === 'g') {
          setFormData((prev) => ({ ...prev, weight: (val * 1000).toString(), weightUnit: newUnit }));
          return;
        } else if (formData.weightUnit === 'g' && newUnit === 'kg') {
          setFormData((prev) => ({ ...prev, weight: (val / 1000).toString(), weightUnit: newUnit }));
          return;
        }
      }
    }
    setFormData((prev) => ({ ...prev, weightUnit: newUnit }));
  };

  const handleDimensionUnitChange = (newUnit: DimensionUnit) => {
    if (formData.length || formData.width || formData.height) {
      const l = parseFloat(formData.length);
      const w = parseFloat(formData.width);
      const h = parseFloat(formData.height);
      if (formData.dimensionUnit === 'cm' && newUnit === 'in') {
        setFormData((prev) => ({
          ...prev,
          length: !isNaN(l) ? (Math.round((l / 2.54) * 100) / 100).toString() : prev.length,
          width: !isNaN(w) ? (Math.round((w / 2.54) * 100) / 100).toString() : prev.width,
          height: !isNaN(h) ? (Math.round((h / 2.54) * 100) / 100).toString() : prev.height,
          dimensionUnit: newUnit,
        }));
        return;
      } else if (formData.dimensionUnit === 'in' && newUnit === 'cm') {
        setFormData((prev) => ({
          ...prev,
          length: !isNaN(l) ? (Math.round(l * 2.54 * 100) / 100).toString() : prev.length,
          width: !isNaN(w) ? (Math.round(w * 2.54 * 100) / 100).toString() : prev.width,
          height: !isNaN(h) ? (Math.round(h * 2.54 * 100) / 100).toString() : prev.height,
          dimensionUnit: newUnit,
        }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, dimensionUnit: newUnit }));
  };

  // Live real-time derived volumetric and chargeable weight calculation
  const liveShipping = useMemo(() => {
    const w = parseFloat(formData.weight) || 0;
    const l = parseFloat(formData.length) || 0;
    const wth = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;

    return calculateProductShippingDetails({
      weight: w,
      weightUnit: formData.weightUnit,
      length: l,
      width: wth,
      height: h,
      dimensionUnit: formData.dimensionUnit,
    });
  }, [formData.weight, formData.weightUnit, formData.length, formData.width, formData.height, formData.dimensionUnit]);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be under 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const res = await uploadApi.uploadSingle(uploadFormData);
      if (res.data?.success && res.data.data?.url) {
        setFormData((prev) => ({
          ...prev,
          images: [res.data.data.url, ...prev.images.slice(1)],
        }));
        showToast('Image uploaded successfully with unique versioned key!', 'success');
      } else {
        showToast('Failed to upload image.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error uploading image file.', 'error');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(id);
      showToast('Product deleted.', 'info');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['category-products'] });
      await queryClient.invalidateQueries({ queryKey: ['product'] });
      await queryClient.invalidateQueries({ queryKey: ['hampers'] });
      await queryClient.invalidateQueries({ queryKey: ['hamper'] });
      await queryClient.invalidateQueries({ queryKey: ['custom-hamper-config'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete product.', 'error');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.basePriceINR) {
      showToast('Name, SKU, and Base INR price are required.', 'error');
      return;
    }

    if (formData.weight) {
      const w = parseFloat(formData.weight);
      if (isNaN(w) || w <= 0) {
        showToast('Product weight must be a positive number greater than zero.', 'error');
        return;
      }
    }

    if (formData.length || formData.width || formData.height) {
      const l = parseFloat(formData.length);
      const w = parseFloat(formData.width);
      const h = parseFloat(formData.height);
      if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
        showToast('Package Length, Width, and Height must all be positive numbers greater than zero.', 'error');
        return;
      }
    }

    const payload: any = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      sku: formData.sku,
      description: formData.description,
      shortDescription: formData.shortDescription,
      images: formData.images.filter(Boolean),
      basePriceINR: parseFloat(formData.basePriceINR),
      compareAtPriceINR: formData.compareAtPriceINR ? parseFloat(formData.compareAtPriceINR) : null,
      stock: parseInt(formData.stock || '0', 10),
      categoryId: formData.categoryId || null,
      brand: formData.brand,
      unit: formData.unit,
      productType: formData.productType,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      weightUnit: formData.weightUnit,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      dimensionUnit: formData.dimensionUnit,
      status: formData.status,
      featured: formData.featured,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      countryPrices: [
        ...(formData.countryPriceAE ? [{ country: 'AE', currency: 'AED', fixedPrice: parseFloat(formData.countryPriceAE) }] : []),
        ...(formData.countryPriceUS ? [{ country: 'US', currency: 'USD', fixedPrice: parseFloat(formData.countryPriceUS) }] : []),
      ],
    };

    try {
      let savedProduct: Product | null = null;
      if (editingProductId) {
        const res = await productsApi.update(editingProductId, payload);
        savedProduct = res.data?.data;
        showToast('Product updated successfully.', 'success');
      } else {
        const res = await productsApi.create(payload);
        savedProduct = res.data?.data;
        showToast('Product created successfully.', 'success');
      }

      if (savedProduct) {
        queryClient.setQueryData(['product', savedProduct.slug], (old: any) => {
          if (!old) return old;
          return { ...old, product: savedProduct };
        });
        queryClient.setQueryData(['product', savedProduct.id], (old: any) => {
          if (!old) return old;
          return { ...old, product: savedProduct };
        });
      }

      // Invalidate all product queries so homepage, shop, details refetch instantly
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['category-products'] });
      await queryClient.invalidateQueries({ queryKey: ['product'] });
      await queryClient.invalidateQueries({ queryKey: ['hampers'] });
      await queryClient.invalidateQueries({ queryKey: ['hamper'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      await queryClient.invalidateQueries({ queryKey: ['custom-hamper-config'] });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save product.', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === 'NORMAL') return (p.productType || 'normal') === 'normal';
    if (typeFilter === 'HAMPER') return p.productType === 'hamper';
    return true;
  });

  return (
    <>
      <SEO title="Product Catalog Management | Admin" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Product Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Configure items, stock levels, images, and country-specific pricing overrides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchProducts()}
              disabled={isProductsQueryLoading || isProductsFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh product list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProductsQueryLoading || isProductsFetching ? 'animate-spin text-[#237A3B]' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-400 ml-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product title, brand, or SKU..."
              className="flex-1 text-xs bg-transparent border-none outline-none text-gray-800"
            />
            {isProductsFetching && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#237A3B] font-medium animate-pulse mr-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                typeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All {isCatalogLoading ? '(...)' : `(${products.length})`}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NORMAL')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'NORMAL' ? 'bg-white text-[#237A3B] shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>Normal {isCatalogLoading ? '(...)' : `(${products.filter((p) => (p.productType || 'normal') === 'normal').length})`}</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('HAMPER')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'HAMPER' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Gift className="w-3 h-3 text-purple-600" />
              <span>Hampers {isCatalogLoading ? '(...)' : `(${products.filter((p) => p.productType === 'hamper').length})`}</span>
            </button>
          </div>

          <span className="text-xs text-gray-400">
            {isCatalogLoading ? 'Loading catalog...' : `${filteredProducts.length} items`}
          </span>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Base Price (INR)</th>
                  <th className="p-4">Country Overrides</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Shipping & Package</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {isCatalogLoading ? (
                  <tr>
                    <td colSpan={9} className="py-20 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#237A3B] flex items-center justify-center shadow-2xs">
                          <Loader2 className="w-6 h-6 animate-spin text-[#237A3B]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Loading healthcare products...</p>
                          <p className="text-xs text-gray-500 mt-0.5">Fetching catalog items, stock levels, and country pricing</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : isProductsError ? (
                  <tr>
                    <td colSpan={9} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Unable to load products</p>
                          <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                            {(productsError as any)?.response?.data?.message ||
                              (productsError as any)?.message ||
                              'A network or server error occurred while retrieving the product catalog.'}
                          </p>
                        </div>
                        <button
                          onClick={() => refetchProducts()}
                          className="mt-1 px-4 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">No products found matching current filters.</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {searchQuery || typeFilter !== 'ALL'
                              ? 'Try adjusting your search terms or clearing active filters.'
                              : 'No healthcare items or gift hampers have been added to the catalog yet.'}
                          </p>
                        </div>
                        {(searchQuery || typeFilter !== 'ALL') && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setTypeFilter('ALL');
                            }}
                            className="mt-1 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                  const ae = p.countryPrices?.find((cp) => cp.country === 'AE')?.fixedPrice;
                  const us = p.countryPrices?.find((cp) => cp.country === 'US')?.fixedPrice;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImageUrl(p.images?.[0], p.updatedAt)}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                          />
                          <div>
                            <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {p.brand || 'Nest Certified'} • {p.unit}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {p.productType === 'hamper' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                            <Gift className="w-3 h-3 text-purple-600" />
                            <span>Hamper</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                            <Package className="w-3 h-3 text-slate-500" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-medium text-gray-600">{p.sku}</td>
                      <td className="p-4 font-bold text-gray-900">₹{p.basePriceINR.toLocaleString()}</td>
                      <td className="p-4">
                        <div className="space-y-0.5 text-[11px]">
                          {ae ? <span className="text-gray-700 block">🇦🇪 AED {ae}</span> : <span className="text-gray-400 block">🇦🇪 Auto-Converted</span>}
                          {us ? <span className="text-gray-700 block">🇺🇸 USD ${us}</span> : <span className="text-gray-400 block">🇺🇸 Auto-Converted</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            p.stock > 10
                              ? 'bg-emerald-50 text-emerald-700'
                              : p.stock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const hasLen = (p.length || p.packageLength) && (p.length || p.packageLength)! > 0;
                          const hasWeight = (p.weight || p.packageWeight) && (p.weight || p.packageWeight)! > 0;
                          if (hasLen && hasWeight) {
                            const l = p.length || p.packageLength;
                            const w = p.width || p.packageWidth;
                            const h = p.height || p.packageHeight;
                            const chg = p.chargeableWeight || Math.max(p.weight || 0, ((l || 0) * (w || 0) * (h || 0)) / 5000);
                            return (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                                  <Truck className="w-3 h-3 text-emerald-600" />
                                  <span>{chg.toFixed(2)} kg billable</span>
                                </span>
                                <span className="block text-[10px] text-gray-500 font-mono">
                                  {l}×{w}×{h}cm ({p.weight}kg act)
                                </span>
                              </div>
                            );
                          }
                          if (hasWeight) {
                            return (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px]" title="Dimensions missing - required for volumetric courier rating">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span>Needs Dimensions</span>
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  Act Weight: {p.weight} kg
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[10px]" title="Weight and dimensions missing">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Incomplete</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-[10px] font-bold">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#237A3B] hover:bg-[#F1FAF3]"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            <div className="p-6 bg-[#237A3B] text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProductId ? 'Edit Healthcare Product' : 'Add New Healthcare Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Omron Blood Pressure Monitor"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Product Type *</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, productType: e.target.value as 'normal' | 'hamper' }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] font-semibold text-gray-800"
                  >
                    <option value="normal">Normal Product (Standard Checkout)</option>
                    <option value="hamper">Hamper (Customized Checkout)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="NCC-GLU-001"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Base Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.basePriceINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, basePriceINR: e.target.value }))}
                    placeholder="1499"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Compare Price (INR)</label>
                  <input
                    type="number"
                    value={formData.compareAtPriceINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, compareAtPriceINR: e.target.value }))}
                    placeholder="1999"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="50"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>
              </div>

              {/* Country Price Overrides */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-xs">
                  Country Fixed Price Overrides (Optional - defaults to exchange rate if empty)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      🇦🇪 UAE Price Override (AED)
                    </label>
                    <input
                      type="number"
                      value={formData.countryPriceAE}
                      onChange={(e) => setFormData((prev) => ({ ...prev, countryPriceAE: e.target.value }))}
                      placeholder="e.g. 65"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      🇺🇸 USA Price Override (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.countryPriceUS}
                      onChange={(e) => setFormData((prev) => ({ ...prev, countryPriceUS: e.target.value }))}
                      placeholder="e.g. 19.99"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Category, Brand, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    placeholder="Omron / AccuCheck"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="1 Device / Pack of 50"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Shipping & Package Details Section */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#237A3B] text-white flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">Shipping & Package Details</h4>
                      <p className="text-[11px] text-gray-500">
                        Physical weight and dimensions for NimbusPost courier calculation and volumetric billing.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-md border border-emerald-200 text-emerald-800 font-semibold">
                    Divisor: 5000 (IATA/Nimbus)
                  </span>
                </div>

                {/* Actual Product Weight */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 text-xs">
                    Product Weight <span className="text-gray-400 font-normal">(Actual net physical weight)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Scale className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.weight}
                        onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                        placeholder={formData.weightUnit === 'g' ? 'e.g. 500' : 'e.g. 0.5'}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-medium"
                      />
                    </div>
                    <select
                      value={formData.weightUnit}
                      onChange={(e) => handleWeightUnitChange(e.target.value as WeightUnit)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-semibold text-gray-700"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </div>

                {/* Product Package Dimensions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-700 text-xs">
                      Package Dimensions <span className="text-gray-400 font-normal">(Length × Width × Height)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">Unit:</span>
                      <select
                        value={formData.dimensionUnit}
                        onChange={(e) => handleDimensionUnitChange(e.target.value as DimensionUnit)}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-lg outline-none text-[11px] font-semibold text-gray-700"
                      >
                        <option value="cm">Centimeters (cm)</option>
                        <option value="in">Inches (in)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-0.5">Length ({formData.dimensionUnit})</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.length}
                        onChange={(e) => setFormData((prev) => ({ ...prev, length: e.target.value }))}
                        placeholder="Length"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-0.5">Width ({formData.dimensionUnit})</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.width}
                        onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
                        placeholder="Width"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-medium"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-0.5">Height ({formData.dimensionUnit})</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formData.height}
                        onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
                        placeholder="Height"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Automatic Calculated Volumetric & Chargeable Weight Display */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center sm:text-left">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                        Actual Weight
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {liveShipping.weightKg > 0 ? `${liveShipping.weightKg.toFixed(3)} kg` : '—'}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {formData.weight ? `(${formData.weight} ${formData.weightUnit})` : 'Not entered'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                        Volumetric Weight
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {liveShipping.volumetricWeightKg > 0 ? `${liveShipping.volumetricWeightKg.toFixed(3)} kg` : '—'}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        (L×W×H ÷ 5000)
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border ${
                      liveShipping.chargeableWeightKg > 0
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-emerald-800">
                        Chargeable Weight
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        {liveShipping.chargeableWeightKg > 0 ? `${liveShipping.chargeableWeightKg.toFixed(3)} kg` : '—'}
                      </span>
                      <span className="block text-[10px] text-emerald-600 font-medium">
                        Max(Actual, Volumetric)
                      </span>
                    </div>
                  </div>

                  {liveShipping.chargeableWeightKg > 0 && (
                    <div className="flex items-start gap-1.5 pt-1 text-[11px] text-gray-600">
                      <Info className="w-3.5 h-3.5 text-[#237A3B] flex-shrink-0 mt-0.5" />
                      <span>
                        {liveShipping.volumetricWeightKg > liveShipping.weightKg ? (
                          <>
                            <strong className="text-amber-800">Volumetric weight governs:</strong> Package dimensions exceed actual density. NimbusPost and couriers will bill this product at <strong>{liveShipping.volumetricWeightKg.toFixed(3)} kg</strong>.
                          </>
                        ) : liveShipping.weightKg > liveShipping.volumetricWeightKg ? (
                          <>
                            <strong className="text-emerald-800">Actual weight governs:</strong> Dense item. NimbusPost and couriers will bill this product at <strong>{liveShipping.weightKg.toFixed(3)} kg</strong>.
                          </>
                        ) : (
                          <>
                            Actual and volumetric weight are equal at <strong>{liveShipping.chargeableWeightKg.toFixed(3)} kg</strong>.
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload & URL */}
              <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <label className="block font-semibold text-gray-700">Product Image</label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center relative shadow-xs">
                    {formData.images[0] ? (
                      <img
                        src={getProductImageUrl(formData.images[0])}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-semibold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#237A3B]" />}
                        <span>{isUploadingImage ? 'Uploading Image...' : 'Upload Image File'}</span>
                      </button>
                      <span className="text-[11px] text-gray-400">JPG, PNG, WEBP (Max 5MB)</span>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={formData.images[0] || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, images: [e.target.value] }))}
                        placeholder="Or enter direct image URL (e.g. /uploads/... or https://...)"
                        className="w-full p-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Accurate 4-second glucose meter with memory"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Clinical Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Comprehensive description of product, intended medical usage, and warranty..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
