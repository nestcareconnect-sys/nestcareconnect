import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Coupon, DiscountType, CountryCode } from '../../types';
import { couponsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { INITIAL_COUPONS } from '@/constants';

export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: '10',
    minOrderValueINR: '1000',
    maxDiscountINR: '500',
    usageLimit: '1000',
    applicableCountries: ['IN', 'AE', 'US'] as CountryCode[],
    active: true,
  });

  const loadCoupons = () => {
    setIsLoading(true);
    couponsApi
      .getAdminCoupons()
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setCoupons(res.data.data);
        } else {
          setCoupons(INITIAL_COUPONS as any);
        }
      })
      .catch(() => {
        setCoupons(INITIAL_COUPONS as any);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleOpenAdd = () => {
    setEditingCouponId(null);
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minOrderValueINR: '1000',
      maxDiscountINR: '500',
      usageLimit: '1000',
      applicableCountries: ['IN', 'AE', 'US'],
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete coupon code?')) return;
    try {
      await couponsApi.delete(id);
      showToast('Coupon deleted.', 'info');
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete coupon.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountValue) return;

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      minOrderValueINR: parseFloat(formData.minOrderValueINR || '0'),
      maxDiscountINR: formData.maxDiscountINR ? parseFloat(formData.maxDiscountINR) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      applicableCountries: formData.applicableCountries,
      active: formData.active,
    };

    try {
      if (editingCouponId) {
        await couponsApi.update(editingCouponId, payload);
        showToast('Coupon updated.', 'success');
      } else {
        await couponsApi.create(payload);
        showToast('Coupon created.', 'success');
      }
      setIsModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save coupon.', 'error');
    }
  };

  return (
    <>
      <SEO title="Coupons & Promotional Codes | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Coupons & Discounts
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Create percentage or flat discount coupon codes with country restrictions.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon Code</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Min. Order (INR)</th>
                <th className="p-4">Valid Countries</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70">
                  <td className="p-4 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="p-4 font-bold text-[#237A3B]">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                  </td>
                  <td className="p-4">₹{c.minOrderValueINR}</td>
                  <td className="p-4 font-semibold">{c.applicableCountries?.join(', ')}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create New Coupon</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. HEALTHCARE15"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discountValue: e.target.value }))}
                    placeholder="10"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Min Order Value (INR)</label>
                  <input
                    type="number"
                    value={formData.minOrderValueINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minOrderValueINR: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Max Discount Cap (INR)</label>
                  <input
                    type="number"
                    value={formData.maxDiscountINR}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxDiscountINR: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
