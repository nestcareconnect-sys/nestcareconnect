import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { HeroSlide } from '../../types';
import { heroSlidesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { INITIAL_HERO_SLIDES } from '@/constants';

export const AdminHeroSlidesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [slides, setSlides] = useState<HeroSlide[]>(INITIAL_HERO_SLIDES as any);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge: 'Worldwide Care Delivery',
    ctaText: 'Explore Hampers',
    ctaUrl: '/hampers',
    desktopImage: '',
    mobileImage: '',
    displayOrder: 1,
    status: 'ACTIVE',
  });

  const loadSlides = () => {
    setIsLoading(true);
    heroSlidesApi
      .getAll()
      .then((res) => {
        if (res.data?.success && res.data.data?.length > 0) {
          setSlides(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSlides();
  }, []);

  const handleOpenAdd = () => {
    setEditingSlideId(null);
    setFormData({
      title: '',
      subtitle: '',
      badge: 'Certified Medical Care',
      ctaText: 'Shop Now',
      ctaUrl: '/shop',
      desktopImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1920&q=85',
      mobileImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&h=1000&q=85',
      displayOrder: slides.length + 1,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      badge: slide.badge || '',
      ctaText: slide.ctaText,
      ctaUrl: slide.ctaUrl,
      desktopImage: slide.desktopImage,
      mobileImage: slide.mobileImage,
      displayOrder: slide.displayOrder,
      status: slide.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete slide?')) return;
    try {
      await heroSlidesApi.delete(id);
      showToast('Slide deleted.', 'info');
      setSlides((prev) => prev.filter((s) => s.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete slide.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.desktopImage || !formData.mobileImage) {
      showToast('Title and both Desktop & Mobile images are required.', 'error');
      return;
    }

    try {
      if (editingSlideId) {
        await heroSlidesApi.update(editingSlideId, formData);
        showToast('Hero slide updated.', 'success');
      } else {
        await heroSlidesApi.create(formData);
        showToast('Hero slide created.', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      setIsModalOpen(false);
      loadSlides();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save slide.', 'error');
    }
  };

  return (
    <>
      <SEO title="Hero Banner Slides Management | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Homepage Hero Slides
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage responsive hero banners with dedicated desktop landscape and mobile portrait images.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slide</span>
          </button>
        </div>

        {/* Slides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-16/9 bg-gray-900 overflow-hidden">
                <img
                  src={slide.desktopImage}
                  alt={slide.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    Order #{slide.displayOrder}
                  </span>
                  {slide.badge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8BCF9B] text-[#237A3B] text-[10px] font-bold">
                      {slide.badge}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{slide.title}</h3>
                  <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">{slide.subtitle}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-gray-500">
                    CTA: <strong>{slide.ctaText}</strong> ({slide.ctaUrl})
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(slide)}
                      className="p-1.5 text-gray-500 hover:text-[#237A3B] rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            <div className="p-5 bg-[#237A3B] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSlideId ? 'Edit Hero Banner Slide' : 'Add Hero Banner Slide'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Slide Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Caring for Loved Ones, Across Continents"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Subtitle Description</label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Short, powerful sentence communicating certified devices and fast delivery..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Top Badge Pill</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="Worldwide Care Delivery"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value, 10) }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="Explore Hampers"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">CTA Destination URL</label>
                  <input
                    type="text"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                    placeholder="/hampers"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Dedicated Images: Desktop Landscape & Mobile Portrait */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-bold">
                  <Monitor className="w-4 h-4 text-[#237A3B]" />
                  <span>Desktop Landscape Image (1920×800) *</span>
                </div>
                <input
                  type="url"
                  required
                  value={formData.desktopImage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, desktopImage: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                />

                <div className="flex items-center gap-2 text-gray-800 font-bold pt-2">
                  <Smartphone className="w-4 h-4 text-[#237A3B]" />
                  <span>Mobile Portrait Image (800×1000) *</span>
                </div>
                <input
                  type="url"
                  required
                  value={formData.mobileImage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobileImage: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#237A3B] text-white font-bold rounded-xl shadow-md"
                >
                  Save Hero Slide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
