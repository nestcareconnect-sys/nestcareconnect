import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  Maximize2,
  Box,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { HamperBox, Status } from '../../types';
import { boxesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { getBoxImageUrl } from '../../utils/imageUrl';
import { INITIAL_HAMPER_BOXES } from '@/constants';

export const AdminBoxesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [boxes, setBoxes] = useState<HamperBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    size: 'Medium',
    color: 'Forest Green',
    material: 'Luxury Rigid Board',
    dimensions: '28 × 22 × 12 cm',
    length: '28',
    width: '22',
    height: '12',
    capacity: '10',
    maxWeight: '4.5',
    basePriceINR: '399',
    compareAtPriceINR: '549',
    stock: '50',
    status: 'ACTIVE' as Status,
    sortOrder: '0',
    isRecommended: false,
    images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80'],
    countryPriceAE: '20',
    countryPriceUS: '5',
  });

  const loadData = () => {
    setIsLoading(true);
    boxesApi
      .getAll({ includeInactive: true })
      .then((res) => {
        if (res.data?.success && res.data.data?.length) {
          setBoxes(res.data.data);
        } else {
          setBoxes(INITIAL_HAMPER_BOXES);
        }
      })
      .catch(() => {
        setBoxes(INITIAL_HAMPER_BOXES);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBoxId(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      size: 'Medium',
      color: 'Forest Green',
      material: 'Eco-Friendly Rigid Kraft Board',
      dimensions: '28 × 22 × 12 cm',
      length: '28',
      width: '22',
      height: '12',
      capacity: '10',
      maxWeight: '4.5',
      basePriceINR: '399',
      compareAtPriceINR: '549',
      stock: '50',
      status: 'ACTIVE',
      sortOrder: (boxes.length + 1).toString(),
      isRecommended: false,
      images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80'],
      countryPriceAE: '20',
      countryPriceUS: '5',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (box: HamperBox) => {
    setEditingBoxId(box.id);
    const aePrice = box.countryPrices?.find((cp) => cp.country === 'AE')?.fixedPrice?.toString() || '';
    const usPrice = box.countryPrices?.find((cp) => cp.country === 'US')?.fixedPrice?.toString() || '';

    setFormData({
      name: box.name,
      slug: box.slug,
      description: box.description || '',
      size: box.size || 'Medium',
      color: box.color || 'Green',
      material: box.material || 'Rigid Board',
      dimensions: box.dimensions || '',
      length: box.length?.toString() || '',
      width: box.width?.toString() || '',
      height: box.height?.toString() || '',
      capacity: box.capacity?.toString() || '10',
      maxWeight: box.maxWeight?.toString() || '',
      basePriceINR: box.basePriceINR.toString(),
      compareAtPriceINR: box.compareAtPriceINR?.toString() || '',
      stock: box.stock.toString(),
      status: box.status,
      sortOrder: box.sortOrder.toString(),
      isRecommended: box.isRecommended,
      images: box.images && box.images.length > 0 ? box.images : [''],
      countryPriceAE: aePrice,
      countryPriceUS: usPrice,
    });
    setIsModalOpen(true);
  };

  const handleDeleteBox = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this hamper box? Custom hampers requiring this box may be affected.')) return;
    try {
      await boxesApi.delete(id);
      showToast('Hamper box deleted.', 'info');
      setBoxes((prev) => prev.filter((b) => b.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['hamper-boxes'] });
      await queryClient.invalidateQueries({ queryKey: ['boxes'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete hamper box.', 'error');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.basePriceINR || !formData.capacity) {
      showToast('Name, Base INR price, and Item Capacity are required.', 'error');
      return;
    }

    const payload: any = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: formData.description,
      size: formData.size,
      color: formData.color,
      material: formData.material,
      dimensions: formData.dimensions || `${formData.length} × ${formData.width} × ${formData.height} cm`,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      capacity: parseInt(formData.capacity, 10),
      maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : null,
      basePriceINR: parseFloat(formData.basePriceINR),
      compareAtPriceINR: formData.compareAtPriceINR ? parseFloat(formData.compareAtPriceINR) : null,
      stock: parseInt(formData.stock || '0', 10),
      status: formData.status,
      sortOrder: parseInt(formData.sortOrder || '0', 10),
      isRecommended: formData.isRecommended,
      images: formData.images.filter(Boolean),
      countryPrices: [
        ...(formData.countryPriceAE ? [{ country: 'AE', currency: 'AED', fixedPrice: parseFloat(formData.countryPriceAE) }] : []),
        ...(formData.countryPriceUS ? [{ country: 'US', currency: 'USD', fixedPrice: parseFloat(formData.countryPriceUS) }] : []),
      ],
    };

    try {
      if (editingBoxId) {
        await boxesApi.update(editingBoxId, payload);
        showToast('Hamper box updated successfully.', 'success');
      } else {
        await boxesApi.create(payload);
        showToast('Hamper box created successfully.', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['hamper-boxes'] });
      await queryClient.invalidateQueries({ queryKey: ['boxes'] });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save hamper box.', 'error');
    }
  };

  return (
    <>
      <SEO title="Hamper Box Packaging Management | Admin" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-[#237A3B]">
                <Box className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Hamper Boxes Management
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure mandatory packaging boxes, physical capacity limits, colors, materials, and international currency pricing.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Box</span>
          </button>
        </div>

        {/* Info Callout */}
        <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/50 flex items-start gap-3 text-xs text-[#237A3B]">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Business Rule:</strong> Every customized hamper assembled by a customer <em>must</em> have a box selected before it can be added to the cart. The system validates that the selected items do not exceed the box's item capacity.
          </div>
        </div>

        {/* Boxes Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4">Hamper Box</th>
                  <th className="p-4">Size & Colour</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Base Price (INR)</th>
                  <th className="p-4">Country Overrides</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {boxes.map((b) => {
                  const ae = b.countryPrices?.find((cp) => cp.country === 'AE')?.fixedPrice;
                  const us = b.countryPrices?.find((cp) => cp.country === 'US')?.fixedPrice;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.images?.[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=100&q=80'}
                            alt={b.name}
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 block truncate max-w-[200px]">
                                {b.name}
                              </span>
                              {b.isRecommended && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#237A3B] text-white text-[9px] font-extrabold uppercase">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {b.material} • {b.dimensions || 'Standard'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] inline-block">
                            {b.size}
                          </span>
                          <span className="text-gray-500 block text-[11px] font-medium">{b.color}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[11px] inline-block">
                            Up to {b.capacity} items
                          </span>
                          {b.maxWeight && (
                            <span className="text-gray-400 block text-[10px]">Max {b.maxWeight} kg</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-bold text-gray-900 text-sm">
                        ₹{b.basePriceINR.toLocaleString()}
                        {b.compareAtPriceINR && (
                          <span className="text-[11px] text-gray-400 line-through block font-normal">
                            ₹{b.compareAtPriceINR.toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5 text-[11px]">
                          {ae ? <span className="text-gray-700 block font-medium">🇦🇪 AED {ae}</span> : <span className="text-gray-400 block">🇦🇪 Auto-Converted</span>}
                          {us ? <span className="text-gray-700 block font-medium">🇺🇸 USD ${us}</span> : <span className="text-gray-400 block">🇺🇸 Auto-Converted</span>}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            b.stock > 10
                              ? 'bg-emerald-50 text-emerald-700'
                              : b.stock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {b.stock} units
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'ACTIVE'
                              ? 'bg-[#F1FAF3] text-[#237A3B]'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#237A3B] hover:bg-[#F1FAF3] transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBox(b.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Box Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            <div className="p-6 bg-[#237A3B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-[#8BCF9B]" />
                <h3 className="font-bold text-base">
                  {editingBoxId ? 'Edit Hamper Packaging Box' : 'Add New Hamper Packaging Box'}
                </h3>
              </div>
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
                  <label className="block font-semibold text-gray-700 mb-1">Box Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Premium Magnetic Box"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="premium-magnetic-box"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] lowercase font-mono"
                  />
                </div>
              </div>

              {/* Size, Color, Material */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Size Classification *</label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="Small">Small (1-5 items)</option>
                    <option value="Medium">Medium (6-10 items)</option>
                    <option value="Large">Large (11-15 items)</option>
                    <option value="Extra Large">Extra Large (16-25 items)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Color / Theme *</label>
                  <input
                    type="text"
                    required
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="e.g. Light Green / White / Gold"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Material Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.material}
                    onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g. Magnetic Rigid Luxury Box"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Capacity, Price, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Max Item Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                    placeholder="10"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-[#237A3B]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Max products box can fit</span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Base Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={formData.basePriceINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, basePriceINR: e.target.value }))}
                    placeholder="399"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="50"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Dimensions (L x W x H) */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="font-bold text-gray-800 block text-xs">Dimensions & Weight Specifications</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Length (cm)</label>
                    <input
                      type="number"
                      value={formData.length}
                      onChange={(e) => setFormData((prev) => ({ ...prev, length: e.target.value }))}
                      placeholder="28"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Width (cm)</label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
                      placeholder="22"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Height (cm)</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
                      placeholder="12"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Max Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.maxWeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxWeight: e.target.value }))}
                      placeholder="4.5"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Country Price Overrides */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="font-bold text-gray-800 block text-xs">
                  International Country Fixed Price Overrides (Optional)
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
                      placeholder="e.g. 20"
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
                      placeholder="e.g. 5"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Box Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.images[0] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, images: [e.target.value, prev.images[1], prev.images[2]].filter(Boolean) }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Box Packaging Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Eco-friendly rigid kraft box with signature Forest Green ribbon and protective cushioning..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              {/* Status & Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isRecommended}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isRecommended: e.target.checked }))}
                      className="rounded text-[#237A3B] focus:ring-[#8BCF9B]"
                    />
                    <span>⭐ Mark as Recommended Box</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.status === 'ACTIVE'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' }))}
                      className="rounded text-[#237A3B] focus:ring-[#8BCF9B]"
                    />
                    <span>Active for Custom Hampers</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Save Hamper Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
