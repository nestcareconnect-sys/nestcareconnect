import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Gift, Check, Package, Video, Camera, MessageSquare, Heart } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Hamper, Product, HamperType, PricingType, RecipientType, OccasionType } from '../../types';
import { hampersApi, productsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { getHamperImageUrl } from '../../utils/imageUrl';
import { INITIAL_HAMPERS, INITIAL_PRODUCTS } from '@/constants';

export const AdminHampersPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [hampers, setHampers] = useState<Hamper[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHamperId, setEditingHamperId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    hamperType: 'NORMAL' as HamperType,
    description: '',
    shortDescription: '',
    images: ['https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80'],
    pricingType: 'FIXED' as PricingType,
    fixedPriceINR: '2999',
    stock: '50',
    status: 'ACTIVE',
    items: [] as { productId: string; quantity: number }[],
    allowCustomMessage: true,
    allowPhotos: true,
    allowPhotoUpload: true,
    maxPhotos: 3,
    photoRequired: false,
    photoInstructions: 'Add a special photo of your family to make your gift even more meaningful.',
    photoCardEnabled: true,
    allowVideoQR: true,
    recipientTypes: ['PARENTS'] as RecipientType[],
    occasions: ['ANNIVERSARY'] as OccasionType[],
    countryPriceAE: '',
    countryPriceUS: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([hampersApi.list(), productsApi.list({ limit: 50 })])
      .then(([hRes, pRes]) => {
        if (hRes.data?.success && hRes.data.data) {
          setHampers(hRes.data.data);
        } else {
          setHampers(INITIAL_HAMPERS as any);
        }

        if (pRes.data?.success && pRes.data.data?.products) {
          setAllProducts(pRes.data.data.products);
        } else {
          setAllProducts(INITIAL_PRODUCTS as any);
        }
      })
      .catch(() => {
        setHampers(INITIAL_HAMPERS as any);
        setAllProducts(INITIAL_PRODUCTS as any);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingHamperId(null);
    setFormData({
      name: '',
      slug: '',
      hamperType: 'NORMAL',
      description: '',
      shortDescription: '',
      images: ['https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80'],
      pricingType: 'FIXED',
      fixedPriceINR: '2999',
      stock: '50',
      status: 'ACTIVE',
      items: allProducts.slice(0, 3).map((p) => ({ productId: p.id, quantity: 1 })),
      allowCustomMessage: true,
      allowPhotos: true,
      allowPhotoUpload: true,
      maxPhotos: 3,
      photoRequired: false,
      photoInstructions: 'Add a special photo of your family to make your gift even more meaningful.',
      photoCardEnabled: true,
      allowVideoQR: true,
      recipientTypes: ['PARENTS'],
      occasions: ['ANNIVERSARY'],
      countryPriceAE: '',
      countryPriceUS: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (hamper: Hamper) => {
    setEditingHamperId(hamper.id);
    const ae = hamper.countryPrices?.find((cp) => cp.country === 'AE')?.fixedPrice?.toString() || '';
    const us = hamper.countryPrices?.find((cp) => cp.country === 'US')?.fixedPrice?.toString() || '';

    const allowUpload = hamper.allowPhotoUpload ?? hamper.allowPhotos ?? true;

    setFormData({
      name: hamper.name,
      slug: hamper.slug,
      hamperType: (hamper.hamperType || 'NORMAL') as HamperType,
      description: hamper.description,
      shortDescription: hamper.shortDescription || '',
      images: hamper.images && hamper.images.length > 0 ? hamper.images : [''],
      pricingType: hamper.pricingType,
      fixedPriceINR: hamper.fixedPriceINR?.toString() || '',
      stock: hamper.stock.toString(),
      status: hamper.status,
      items: hamper.items?.map((itm) => ({ productId: itm.productId, quantity: itm.quantity })) || [],
      allowCustomMessage: hamper.allowCustomMessage ?? true,
      allowPhotos: allowUpload,
      allowPhotoUpload: allowUpload,
      maxPhotos: hamper.maxPhotos || 3,
      photoRequired: hamper.photoRequired ?? false,
      photoInstructions: hamper.photoInstructions || 'Add a special photo of your family to make your gift even more meaningful.',
      photoCardEnabled: hamper.photoCardEnabled ?? true,
      allowVideoQR: hamper.allowVideoQR ?? true,
      recipientTypes: hamper.recipientTypes || ['PARENTS'],
      occasions: hamper.occasions || ['ANNIVERSARY'],
      countryPriceAE: ae,
      countryPriceUS: us,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this hamper?')) return;
    try {
      await hampersApi.delete(id);
      showToast('Hamper deleted.', 'info');
      setHampers((prev) => prev.filter((h) => h.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['hampers'] });
      await queryClient.invalidateQueries({ queryKey: ['hamper'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete hamper.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const payload: any = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      hamperType: formData.hamperType,
      description: formData.description,
      shortDescription: formData.shortDescription,
      images: formData.images.filter(Boolean),
      pricingType: formData.pricingType,
      fixedPriceINR: formData.fixedPriceINR ? parseFloat(formData.fixedPriceINR) : null,
      stock: parseInt(formData.stock || '50', 10),
      items: formData.items,
      allowCustomMessage: formData.allowCustomMessage,
      allowPhotos: formData.allowPhotoUpload,
      allowPhotoUpload: formData.allowPhotoUpload,
      maxPhotos: Number(formData.maxPhotos || 3),
      photoRequired: formData.photoRequired,
      photoInstructions: formData.photoInstructions.trim() || undefined,
      photoCardEnabled: formData.photoCardEnabled,
      allowVideoQR: formData.allowVideoQR,
      recipientType: formData.recipientTypes?.[0] || 'PARENTS',
      occasion: formData.occasions?.[0] || 'ANNIVERSARY',
      recipientTypes: formData.recipientTypes,
      occasions: formData.occasions,
      countryPrices: [
        ...(formData.countryPriceAE ? [{ country: 'AE', currency: 'AED', fixedPrice: parseFloat(formData.countryPriceAE) }] : []),
        ...(formData.countryPriceUS ? [{ country: 'US', currency: 'USD', fixedPrice: parseFloat(formData.countryPriceUS) }] : []),
      ],
    };

    try {
      if (editingHamperId) {
        await hampersApi.update(editingHamperId, payload);
        showToast('Hamper updated successfully.', 'success');
      } else {
        await hampersApi.create(payload);
        showToast('Hamper created successfully.', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['hampers'] });
      await queryClient.invalidateQueries({ queryKey: ['hamper'] });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Unable to update hamper.', 'error');
    }
  };

  return (
    <>
      <SEO title="Hamper Management & Personalization | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Curated Hampers & Personalisation Hub
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Configure Essential, Premium, Anniversary, and Signature hampers with dynamic QR video and photo options.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Hamper</span>
          </button>
        </div>

        {/* Hampers Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4">Hamper Name & Type</th>
                  <th className="p-4">Pricing</th>
                  <th className="p-4">Personalisation & Video</th>
                  <th className="p-4">Products Included</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {hampers.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={h.images?.[0] || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=100&q=80'}
                          alt={h.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-gray-900 block">{h.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#F1FAF3] text-[#237A3B] text-[10px] font-bold inline-block mt-0.5">
                            {h.hamperType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {h.fixedPriceINR ? `₹${h.fixedPriceINR.toLocaleString()}` : 'Calculated'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {h.allowVideoQR && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <Video className="w-3 h-3" /> QR Video
                          </span>
                        )}
                        {h.allowPhotos && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                            <Camera className="w-3 h-3" /> Photos (1-{h.maxPhotos || 3})
                          </span>
                        )}
                        {h.allowCustomMessage && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                            <MessageSquare className="w-3 h-3" /> Message
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 font-medium">
                        {h.items?.length || 0} product(s)
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        {h.stock} ready
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#237A3B] hover:bg-[#F1FAF3]"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingHamperId ? 'Edit Healthcare Hamper' : 'Create Healthcare Hamper'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Hamper Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Essential Care Hamper"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Hamper Type *</label>
                  <select
                    value={formData.hamperType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hamperType: e.target.value as HamperType }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <option value="NORMAL">Normal (Essential Care)</option>
                    <option value="PREMIUM">Premium (Care / Anniversary)</option>
                    <option value="PREMIUM_PLUS">Signature / Luxury</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Pricing Model</label>
                  <select
                    value={formData.pricingType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pricingType: e.target.value as PricingType }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <option value="FIXED">Fixed Hamper Price</option>
                    <option value="CALCULATED">Calculated Dynamically from Products</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fixed Price (INR)</label>
                  <input
                    type="number"
                    value={formData.fixedPriceINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fixedPriceINR: e.target.value }))}
                    placeholder="4999"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock Boxes</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="50"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Personalization Settings */}
              <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[#8BCF9B]/30">
                  <span className="font-bold text-xs text-[#237A3B] uppercase tracking-wider block">
                    Personalization & Keepsake Settings
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold">Config-driven</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.allowPhotoUpload}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          allowPhotoUpload: e.target.checked,
                          allowPhotos: e.target.checked,
                        }))
                      }
                      className="rounded text-[#237A3B]"
                    />
                    <span className="font-bold text-gray-800">Allow Customer Photo Upload</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.photoRequired}
                      disabled={!formData.allowPhotoUpload}
                      onChange={(e) => setFormData((prev) => ({ ...prev, photoRequired: e.target.checked }))}
                      className="rounded text-[#237A3B]"
                    />
                    <span className="font-bold text-gray-800">Require Photo Upload</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.photoCardEnabled}
                      onChange={(e) => setFormData((prev) => ({ ...prev, photoCardEnabled: e.target.checked }))}
                      className="rounded text-[#237A3B]"
                    />
                    <span className="font-bold text-gray-800">Enable Keepsake Greeting Card</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.allowCustomMessage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, allowCustomMessage: e.target.checked }))}
                      className="rounded text-[#237A3B]"
                    />
                    <span className="font-bold text-gray-800">Enable 50-Word Personal Note</span>
                  </label>
                </div>

                {formData.allowPhotoUpload && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Maximum Photos</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxPhotos}
                        onChange={(e) => setFormData((prev) => ({ ...prev, maxPhotos: parseInt(e.target.value || '1', 10) }))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-gray-700 mb-1">Photo Instructions for Customer</label>
                      <input
                        type="text"
                        value={formData.photoInstructions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, photoInstructions: e.target.value }))}
                        placeholder="e.g. Add a special photo of your family to make your gift even more meaningful."
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.allowVideoQR}
                      onChange={(e) => setFormData((prev) => ({ ...prev, allowVideoQR: e.target.checked }))}
                      className="rounded text-[#237A3B]"
                    />
                    <span className="font-bold text-gray-800">Enable Video Greeting & QR Card</span>
                  </label>
                </div>
              </div>

              {/* Items Picker for Hamper */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-xs">
                  Products Included in this Hamper
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allProducts.map((prod) => {
                    const itemEntry = formData.items.find((i) => i.productId === prod.id);
                    const isChecked = !!itemEntry;

                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200"
                      >
                        <label className="flex items-center gap-2 cursor-pointer truncate max-w-[280px]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  items: [...prev.items, { productId: prod.id, quantity: 1 }],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  items: prev.items.filter((i) => i.productId !== prod.id),
                                }));
                              }
                            }}
                            className="rounded text-[#237A3B]"
                          />
                          <span className="font-semibold text-gray-900 truncate">{prod.name}</span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-[11px]">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={itemEntry.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value || '1', 10);
                                setFormData((prev) => ({
                                  ...prev,
                                  items: prev.items.map((i) =>
                                    i.productId === prod.id ? { ...i, quantity: q } : i
                                  ),
                                }));
                              }}
                              className="w-14 p-1 text-center bg-gray-50 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Hamper Image URL</label>
                <input
                  type="url"
                  value={formData.images[0] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, images: [e.target.value] }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Full hamper description and intended care usage..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
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
                  Save Hamper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

