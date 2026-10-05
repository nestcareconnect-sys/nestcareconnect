import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Product, Category, CountryCode, CurrencyCode } from '../../types';
import { productsApi, categoriesApi, uploadApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { getProductImageUrl } from '../../utils/imageUrl';
import { INITIAL_PRODUCTS } from '@/constants';

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
    status: 'ACTIVE',
    featured: false,
    tags: '',
    countryPriceAE: '',
    countryPriceUS: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([productsApi.list({ limit: 50 }), categoriesApi.getTree()])
      .then(([prodRes, catRes]) => {
        if (prodRes.data?.success && prodRes.data.data?.products) {
          setProducts(prodRes.data.data.products);
        } else {
          setProducts(INITIAL_PRODUCTS as any);
        }

        if (catRes.data?.success && catRes.data.data) {
          const flat: Category[] = [];
          catRes.data.data.forEach((r) => {
            flat.push(r);
            if (r.children) r.children.forEach((c) => flat.push(c));
          });
          setCategories(flat);
        }
      })
      .catch(() => {
        setProducts(INITIAL_PRODUCTS as any);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

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
      weight: '0.5',
      status: 'ACTIVE',
      featured: false,
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
      weight: product.weight?.toString() || '',
      status: product.status,
      featured: product.featured,
      tags: product.tags?.join(', ') || '',
      countryPriceAE: aePrice,
      countryPriceUS: usPrice,
    });
    setIsModalOpen(true);
  };

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
      weight: formData.weight ? parseFloat(formData.weight) : null,
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product title, brand, or SKU..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-gray-800"
          />
          <span className="text-xs text-gray-400">{filteredProducts.length} items</span>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Base Price (INR)</th>
                  <th className="p-4">Country Overrides</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredProducts.map((p) => {
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
                })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
