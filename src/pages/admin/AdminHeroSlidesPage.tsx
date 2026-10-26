import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  GripVertical,
  Eye,
  Check,
  ExternalLink,
  Link as LinkIcon,
  Search,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Globe,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { HeroSlide, Product, Hamper, Category, HeroSlideLinkType } from '../../types';
import { heroSlidesApi, productsApi, hampersApi, categoriesApi, uploadApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

interface SelectableItem {
  id: string;
  name: string;
  type: 'PRODUCT' | 'HAMPER';
  subType: string;
  slug: string;
  url: string;
  image?: string;
  price?: number;
}

export const AdminHeroSlidesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reference data for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectableProducts, setSelectableProducts] = useState<SelectableItem[]>([]);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [previewSlide, setPreviewSlide] = useState<HeroSlide | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    badge: string;
    buttonText: string;
    linkType: HeroSlideLinkType;
    destinationUrl: string;
    linkedProductId: string;
    linkedCategoryId: string;
    desktopImage: string;
    mobileImage: string;
    displayOrder: number;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    title: '',
    description: '',
    badge: 'Worldwide Care Delivery',
    buttonText: 'Explore Hampers',
    linkType: 'CUSTOM',
    destinationUrl: '/hampers',
    linkedProductId: '',
    linkedCategoryId: '',
    desktopImage: '',
    mobileImage: '',
    displayOrder: 1,
    status: 'ACTIVE',
  });

  // Upload & validation states
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [desktopDimensions, setDesktopDimensions] = useState<string | null>(null);
  const [mobileDimensions, setMobileDimensions] = useState<string | null>(null);
  const [manualDesktopUrl, setManualDesktopUrl] = useState(false);
  const [manualMobileUrl, setManualMobileUrl] = useState(false);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Product search dropdown state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Drag and drop state
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);

  // Fetch all slides for admin
  const loadSlides = async () => {
    setIsLoading(true);
    try {
      const res = await heroSlidesApi.getAdminAll();
      if (res.data?.success && res.data.data) {
        setSlides(res.data.data);
      } else {
        setSlides([]);
      }
    } catch {
      // Fallback
      heroSlidesApi
        .getAll()
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setSlides(res.data.data);
          }
        })
        .catch(() => {
          setSlides([]);
        });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch selectable reference products, hampers & categories
  const loadReferences = async () => {
    setIsLoadingReferences(true);
    try {
      const [pRes, hRes, cRes] = await Promise.all([
        productsApi.list({ limit: 100 }).catch(() => ({ data: { success: false, data: { products: [] } } })),
        hampersApi.list().catch(() => ({ data: { success: false, data: [] } })),
        categoriesApi.getTree(true).catch(() => ({ data: { success: false, data: [] } })),
      ]);

      const items: SelectableItem[] = [];

      // Add normal & hamper products from Product table
      const rawProducts: Product[] = pRes.data?.data?.products || [];
      rawProducts.forEach((p) => {
        const isHamperProd = p.productType === 'hamper';
        items.push({
          id: p.id,
          name: p.name,
          type: 'PRODUCT',
          subType: isHamperProd ? 'Product Hamper' : 'Normal Product',
          slug: p.slug,
          url: `/product/${p.slug}`,
          image: p.images?.[0] || '',
          price: p.basePriceINR,
        });
      });

      // Add curated hampers from Hamper table
      const rawHampers: Hamper[] = Array.isArray(hRes.data?.data) ? hRes.data.data : [];
      rawHampers.forEach((h) => {
        items.push({
          id: h.id,
          name: h.name,
          type: 'HAMPER',
          subType: 'Curated Hamper',
          slug: h.slug,
          url: `/hampers/${h.slug}`,
          image: h.images?.[0] || '',
          price: h.fixedPriceINR || h.startingPriceINR || undefined,
        });
      });

      setSelectableProducts(items);

      // Flatten categories for dropdown
      const rawCategories: Category[] = Array.isArray(cRes.data?.data) ? cRes.data.data : [];
      const flatCategories: Category[] = [];
      const traverse = (catList: Category[]) => {
        catList.forEach((c) => {
          flatCategories.push(c);
          if (c.children && c.children.length > 0) {
            traverse(c.children);
          }
        });
      };
      traverse(rawCategories);
      setCategories(flatCategories);
    } catch {
      // Ignored
    } finally {
      setIsLoadingReferences(false);
    }
  };

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    if (isModalOpen && selectableProducts.length === 0) {
      loadReferences();
    }
  }, [isModalOpen, selectableProducts.length]);

  // Validate image file format and dimensions
  const validateAndGetDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedFormats.includes(file.type.toLowerCase())) {
        reject(new Error('Unsupported file format. Please upload JPG, PNG, or WEBP only.'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Image file is too large. Maximum allowed size is 5MB.'));
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read image dimensions.'));
      };
      img.src = objectUrl;
    });
  };

  // Upload handler for Desktop Image
  const handleDesktopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingDesktop(true);
      const dimensions = await validateAndGetDimensions(file);
      setDesktopDimensions(`${dimensions.width} × ${dimensions.height} px (${(file.size / 1024).toFixed(0)} KB)`);

      if (dimensions.width < 600) {
        showToast('Image width is below 600px. High-resolution (1920×800) is recommended for desktop.', 'info');
      }

      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await uploadApi.uploadSingle(uploadData);

      if (res.data?.success && res.data.data?.url) {
        const uploadedUrl = res.data.data.url;
        setFormData((prev) => ({ ...prev, desktopImage: uploadedUrl }));
        showToast('Desktop banner uploaded successfully.', 'success');
      } else {
        throw new Error('Upload failed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload desktop image.', 'error');
    } finally {
      setIsUploadingDesktop(false);
      if (desktopFileInputRef.current) desktopFileInputRef.current.value = '';
    }
  };

  // Upload handler for Mobile Image
  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMobile(true);
      const dimensions = await validateAndGetDimensions(file);
      setMobileDimensions(`${dimensions.width} × ${dimensions.height} px (${(file.size / 1024).toFixed(0)} KB)`);

      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await uploadApi.uploadSingle(uploadData);

      if (res.data?.success && res.data.data?.url) {
        const uploadedUrl = res.data.data.url;
        setFormData((prev) => ({ ...prev, mobileImage: uploadedUrl }));
        showToast('Mobile banner uploaded successfully.', 'success');
      } else {
        throw new Error('Upload failed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload mobile image.', 'error');
    } finally {
      setIsUploadingMobile(false);
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
    }
  };

  // Open modal to add a new banner
  const handleOpenAdd = () => {
    setEditingSlideId(null);
    setDesktopDimensions(null);
    setMobileDimensions(null);
    setProductSearchQuery('');
    setFormData({
      title: '',
      description: '',
      badge: 'Certified Medical Care',
      buttonText: 'Shop Now',
      linkType: 'CUSTOM',
      destinationUrl: '/shop',
      linkedProductId: '',
      linkedCategoryId: '',
      desktopImage: '',
      mobileImage: '',
      displayOrder: slides.length + 1,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Open modal to edit existing banner
  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setDesktopDimensions(null);
    setMobileDimensions(null);
    setProductSearchQuery('');

    const destUrl = slide.destinationUrl || slide.ctaUrl || '';
    const initialLinkType = (slide.linkType as HeroSlideLinkType) || (destUrl ? 'CUSTOM' : 'NONE');

    setFormData({
      title: slide.title || '',
      description: slide.description || slide.subtitle || '',
      badge: slide.badge || '',
      buttonText: slide.buttonText || slide.ctaText || '',
      linkType: initialLinkType,
      destinationUrl: destUrl,
      linkedProductId: slide.linkedProductId || '',
      linkedCategoryId: slide.linkedCategoryId || '',
      desktopImage: slide.desktopImage || slide.bannerImageUrl || '',
      mobileImage: slide.mobileImage || slide.mobileImageUrl || '',
      displayOrder: slide.displayOrder,
      status: slide.status as 'ACTIVE' | 'INACTIVE',
    });
    setIsModalOpen(true);
  };

  // Delete banner
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this hero slider banner?')) return;
    try {
      await heroSlidesApi.delete(id);
      showToast('Hero slide deleted successfully.', 'info');
      setSlides((prev) => prev.filter((s) => s.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete slide.', 'error');
    }
  };

  // Quick toggle active/inactive status
  const handleToggleStatus = async (slide: HeroSlide) => {
    const newStatus = slide.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? { ...s, status: newStatus as any } : s))
      );
      await heroSlidesApi.toggleStatus(slide.id, newStatus);
      showToast(`Banner ${newStatus === 'ACTIVE' ? 'activated' : 'disabled'}.`, 'success');
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update banner status.', 'error');
      loadSlides();
    }
  };

  // Reorder banners (Move Up/Down or Drag)
  const handleMoveSlide = async (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, moved);

    const reorderedWithDisplay = newSlides.map((s, idx) => ({
      ...s,
      displayOrder: idx + 1,
    }));

    setSlides(reorderedWithDisplay);

    try {
      const orderIds = reorderedWithDisplay.map((s) => s.id);
      await heroSlidesApi.reorder(orderIds);
      showToast('Banner order updated.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    } catch {
      showToast('Failed to save new order.', 'error');
      loadSlides();
    }
  };

  // HTML5 Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedSlideIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedSlideIndex === null || draggedSlideIndex === dropIndex) return;

    const newSlides = [...slides];
    const [dragged] = newSlides.splice(draggedSlideIndex, 1);
    newSlides.splice(dropIndex, 0, dragged);

    const reorderedWithDisplay = newSlides.map((s, idx) => ({
      ...s,
      displayOrder: idx + 1,
    }));

    setSlides(reorderedWithDisplay);
    setDraggedSlideIndex(null);

    try {
      const orderIds = reorderedWithDisplay.map((s) => s.id);
      await heroSlidesApi.reorder(orderIds);
      showToast('Banner order rearranged.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    } catch {
      showToast('Failed to save new banner order.', 'error');
      loadSlides();
    }
  };

  // Link Type selections
  const handleSelectLinkType = (type: HeroSlideLinkType) => {
    setFormData((prev) => {
      let dest = prev.destinationUrl;
      let prodId = prev.linkedProductId;
      let catId = prev.linkedCategoryId;

      if (type === 'NONE') {
        dest = '';
        prodId = '';
        catId = '';
      } else if (type === 'CATEGORY') {
        prodId = '';
        if (categories.length > 0 && !catId) {
          catId = categories[0].id;
          dest = `/category/${categories[0].slug}`;
        }
      } else if (type === 'PRODUCT') {
        catId = '';
        if (selectableProducts.length > 0 && !prodId) {
          prodId = selectableProducts[0].id;
          dest = selectableProducts[0].url;
        }
      } else if (type === 'CUSTOM') {
        prodId = '';
        catId = '';
      }

      return {
        ...prev,
        linkType: type,
        destinationUrl: dest,
        linkedProductId: prodId,
        linkedCategoryId: catId,
      };
    });
  };

  // Product Selection
  const handleSelectProduct = (item: SelectableItem) => {
    setFormData((prev) => ({
      ...prev,
      linkedProductId: item.id,
      destinationUrl: item.url,
    }));
    setIsProductDropdownOpen(false);
    setProductSearchQuery('');
  };

  // Category Selection
  const handleSelectCategory = (categoryId: string) => {
    const selected = categories.find((c) => c.id === categoryId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        linkedCategoryId: selected.id,
        destinationUrl: `/category/${selected.slug}`,
      }));
    }
  };

  // Save Banner Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.desktopImage.trim()) {
      showToast('Please upload or provide a Desktop Banner image.', 'error');
      return;
    }

    try {
      const payload = {
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        subtitle: formData.description.trim() || null,
        badge: formData.badge.trim() || null,
        buttonText: formData.buttonText.trim() || null,
        ctaText: formData.buttonText.trim() || null,
        linkType: formData.linkType,
        destinationUrl: formData.linkType === 'NONE' ? null : formData.destinationUrl.trim() || null,
        ctaUrl: formData.linkType === 'NONE' ? '' : formData.destinationUrl.trim() || '',
        desktopImage: formData.desktopImage.trim(),
        bannerImageUrl: formData.desktopImage.trim(),
        mobileImage: formData.mobileImage.trim() || null,
        mobileImageUrl: formData.mobileImage.trim() || null,
        linkedProductId: formData.linkType === 'PRODUCT' ? formData.linkedProductId || null : null,
        linkedCategoryId: formData.linkType === 'CATEGORY' ? formData.linkedCategoryId || null : null,
        displayOrder: formData.displayOrder,
        status: formData.status,
      };

      if (editingSlideId) {
        await heroSlidesApi.update(editingSlideId, payload);
        showToast('Hero banner updated successfully.', 'success');
      } else {
        await heroSlidesApi.create(payload);
        showToast('Hero banner created successfully.', 'success');
      }

      await queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      setIsModalOpen(false);
      loadSlides();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save hero banner.', 'error');
    }
  };

  // Find linked product item name if present
  const currentSelectedProduct = selectableProducts.find(
    (p) => p.id === formData.linkedProductId || p.url === formData.destinationUrl
  );

  const filteredProducts = selectableProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.subType.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <>
      <SEO title="Hero Banner Slides Management | Admin Panel" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Homepage Hero Slider</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#8BCF9B]/20 text-[#237A3B] font-bold border border-[#8BCF9B]/40">
                {slides.length} {slides.length === 1 ? 'Banner' : 'Banners'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Manage all hero slider banners dynamically. Upload desktop and optional mobile images, configure links to any product, hamper, category, or custom URL, and drag to reorder.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#237A3B] hover:bg-[#1b5e2d] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Banner</span>
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-950">Dynamic Homepage Integration</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Only banners marked <strong>Enabled</strong> will appear on the homepage hero slider. Banners are displayed in the exact order shown below. Drag banners using the handle or use the Up/Down arrows to change sequence.
            </p>
          </div>
        </div>

        {/* Banners List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-2xs">
            <Loader2 className="w-8 h-8 text-[#237A3B] animate-spin mb-3" />
            <p className="text-xs text-gray-500">Loading hero slider banners...</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-gray-800">No Hero Banners Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Add your first slider banner to display on the storefront homepage.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Banner</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, index) => {
              const desktopImg = slide.desktopImage || slide.bannerImageUrl || '';
              const mobileImg = slide.mobileImage || slide.mobileImageUrl;
              const hasLink = slide.linkType !== 'NONE' && (slide.destinationUrl || slide.ctaUrl);
              const destUrl = slide.destinationUrl || slide.ctaUrl || '';

              return (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`bg-white rounded-3xl border ${
                    slide.status === 'ACTIVE' ? 'border-gray-200 shadow-xs' : 'border-gray-200 bg-gray-50/60 opacity-80'
                  } transition-all duration-200 overflow-hidden hover:shadow-md flex flex-col md:flex-row items-stretch`}
                >
                  {/* Drag Handle & Order */}
                  <div className="hidden md:flex items-center px-4 bg-gray-50 border-r border-gray-100 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Thumbnail / Image Preview */}
                  <div className="relative w-full md:w-64 h-44 md:h-auto bg-gray-950 shrink-0 overflow-hidden group">
                    <img
                      src={desktopImg}
                      alt={slide.title || 'Banner'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs">
                        #{slide.displayOrder}
                      </span>
                      {slide.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-[#8BCF9B] text-[#1F2937] text-[10px] font-bold">
                          {slide.badge}
                        </span>
                      )}
                    </div>

                    {mobileImg && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                        <Smartphone className="w-3 h-3 text-[#8BCF9B]" />
                        <span>Mobile Image Uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between text-xs space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900 leading-snug">
                            {slide.title || <span className="text-gray-400 italic">No Title (Image Only)</span>}
                          </h3>
                          {(slide.description || slide.subtitle) && (
                            <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">
                              {slide.description || slide.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slide.status === 'ACTIVE'}
                              onChange={() => handleToggleStatus(slide)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#237A3B]"></div>
                          </label>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              slide.status === 'ACTIVE' ? 'text-[#237A3B]' : 'text-gray-400'
                            }`}
                          >
                            {slide.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      {/* Link Info */}
                      <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-500">Link:</span>
                          {hasLink ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[#237A3B] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              {slide.linkType === 'PRODUCT' && <ShoppingBag className="w-3 h-3" />}
                              {slide.linkType === 'CATEGORY' && <Tag className="w-3 h-3" />}
                              {slide.linkType === 'CUSTOM' && <Globe className="w-3 h-3" />}
                              <span>{destUrl}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No link configured</span>
                          )}
                        </div>

                        {(slide.buttonText || slide.ctaText) && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <span>Button:</span>
                            <strong className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                              {slide.buttonText || slide.ctaText}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions & Ordering Controls */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Move Up / Down Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveSlide(index, 'UP')}
                          title="Move banner up in order"
                          className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === slides.length - 1}
                          onClick={() => handleMoveSlide(index, 'DOWN')}
                          title="Move banner down in order"
                          className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-gray-400 pl-1">Order #{slide.displayOrder}</span>
                      </div>

                      {/* Preview, Edit, Delete */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSlide(slide);
                            setPreviewMode('desktop');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(slide)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#237A3B] bg-emerald-50 hover:bg-emerald-100 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(slide.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT BANNER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            <div className="px-6 py-4 bg-[#237A3B] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingSlideId ? 'Edit Hero Slider Banner' : 'Create New Hero Banner'}
                </h3>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Configure slider image, destination link, and optional promotional copy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[82vh] overflow-y-auto">
              {/* 1. DESKTOP IMAGE UPLOAD */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <Monitor className="w-4 h-4 text-[#237A3B]" />
                    <span>Desktop Banner Image *</span>
                    <span className="text-[10px] text-gray-500 font-normal">(Required, recommended 1920×800)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualDesktopUrl((prev) => !prev)}
                    className="text-[11px] text-[#237A3B] hover:underline cursor-pointer font-semibold"
                  >
                    {manualDesktopUrl ? 'Switch to Upload File' : 'Paste Direct URL'}
                  </button>
                </div>

                {manualDesktopUrl ? (
                  <div>
                    <input
                      type="url"
                      required
                      value={formData.desktopImage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, desktopImage: e.target.value }))}
                      placeholder="https://images.unsplash.com/... or /uploads/..."
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-[#8BCF9B]"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={desktopFileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleDesktopImageUpload}
                      className="hidden"
                    />

                    {formData.desktopImage ? (
                      <div className="space-y-2">
                        <div className="relative aspect-16/7 bg-gray-900 rounded-xl overflow-hidden border border-gray-200">
                          <img
                            src={formData.desktopImage}
                            alt="Desktop Preview"
                            className="w-full h-full object-cover"
                          />
                          {desktopDimensions && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono">
                              {desktopDimensions}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => desktopFileInputRef.current?.click()}
                            disabled={isUploadingDesktop}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingDesktop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#237A3B]" />}
                            <span>Replace Image</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, desktopImage: '' }));
                              setDesktopDimensions(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => desktopFileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-[#237A3B] bg-white rounded-2xl p-6 text-center cursor-pointer transition-colors"
                      >
                        {isUploadingDesktop ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-7 h-7 text-[#237A3B] animate-spin mb-2" />
                            <p className="text-gray-600 font-semibold">Uploading Desktop Image...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-7 h-7 text-gray-400 mb-2" />
                            <p className="font-bold text-gray-800">Click to upload Desktop Banner Image</p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Supports JPG, PNG, WEBP (Max 5MB)
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. MOBILE IMAGE UPLOAD (OPTIONAL) */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-[#237A3B]" />
                    <span>Mobile Banner Image</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-semibold">
                      Optional (Fallback to Desktop Image)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualMobileUrl((prev) => !prev)}
                    className="text-[11px] text-[#237A3B] hover:underline cursor-pointer font-semibold"
                  >
                    {manualMobileUrl ? 'Switch to Upload File' : 'Paste Direct URL'}
                  </button>
                </div>

                {manualMobileUrl ? (
                  <div>
                    <input
                      type="url"
                      value={formData.mobileImage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mobileImage: e.target.value }))}
                      placeholder="Optional mobile image URL (e.g. 800×1000 portrait)"
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-[#8BCF9B]"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={mobileFileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleMobileImageUpload}
                      className="hidden"
                    />

                    {formData.mobileImage ? (
                      <div className="space-y-2">
                        <div className="relative w-44 aspect-3/4 bg-gray-900 rounded-xl overflow-hidden border border-gray-200">
                          <img
                            src={formData.mobileImage}
                            alt="Mobile Preview"
                            className="w-full h-full object-cover"
                          />
                          {mobileDimensions && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-mono">
                              {mobileDimensions}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => mobileFileInputRef.current?.click()}
                            disabled={isUploadingMobile}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingMobile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#237A3B]" />}
                            <span>Replace Mobile Image</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, mobileImage: '' }));
                              setMobileDimensions(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => mobileFileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-[#237A3B] bg-white rounded-2xl p-4 text-center cursor-pointer transition-colors"
                      >
                        {isUploadingMobile ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-6 h-6 text-[#237A3B] animate-spin mb-1" />
                            <p className="text-gray-600 font-semibold">Uploading Mobile Image...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Smartphone className="w-6 h-6 text-gray-400 mb-1" />
                            <p className="font-bold text-gray-700">Click to upload Mobile-Optimized Portrait Image (Optional)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Recommended 800×1000. If left empty, desktop image is used on mobile.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. BANNER LINK CONFIGURATION */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-900 text-xs">
                    Banner Click Link Destination
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Make banner clickable & route to any page
                  </span>
                </div>

                {/* Link Type Option Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PRODUCT', label: 'Link to Product / Hamper', icon: ShoppingBag },
                    { id: 'CATEGORY', label: 'Link to Category', icon: Tag },
                    { id: 'CUSTOM', label: 'Custom URL', icon: Globe },
                    { id: 'NONE', label: 'No Link (Display Only)', icon: X },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = formData.linkType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectLinkType(opt.id as HeroSlideLinkType)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#237A3B] text-white border-[#237A3B] font-bold shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 font-medium'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        <span className="text-[11px] leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* OPTION 1: LINK TO PRODUCT / HAMPER */}
                {formData.linkType === 'PRODUCT' && (
                  <div className="space-y-2 pt-1">
                    <label className="block font-semibold text-gray-800 text-[11px]">
                      Search and Select Any Normal Product or Hamper
                    </label>

                    {currentSelectedProduct ? (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {currentSelectedProduct.image ? (
                            <img
                              src={currentSelectedProduct.image}
                              alt={currentSelectedProduct.name}
                              className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-[#237A3B] shrink-0">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 truncate">{currentSelectedProduct.name}</span>
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-[#237A3B]">
                                {currentSelectedProduct.subType}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono block mt-0.5">
                              URL: {formData.destinationUrl}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsProductDropdownOpen(true)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs cursor-pointer shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Type to search any normal product or hamper..."
                            value={productSearchQuery}
                            onFocus={() => setIsProductDropdownOpen(true)}
                            onChange={(e) => {
                              setProductSearchQuery(e.target.value);
                              setIsProductDropdownOpen(true);
                            }}
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-[#8BCF9B]"
                          />
                        </div>

                        {isProductDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-1 divide-y divide-gray-50">
                            {filteredProducts.length === 0 ? (
                              <div className="p-3 text-center text-gray-400 text-xs">
                                No matching products or hampers found.
                              </div>
                            ) : (
                              filteredProducts.slice(0, 30).map((item) => (
                                <button
                                  key={`${item.type}-${item.id}`}
                                  type="button"
                                  onClick={() => handleSelectProduct(item)}
                                  className="w-full p-2 hover:bg-gray-50 rounded-lg flex items-center justify-between text-left gap-2 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-8 h-8 rounded-md object-cover border border-gray-200 shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                      <p className="text-[10px] text-gray-400 font-mono">{item.url}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 block">
                                      {item.subType}
                                    </span>
                                    {item.price && (
                                      <span className="text-[10px] text-gray-700 font-semibold block mt-0.5">
                                        ₹{item.price}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OPTION 2: LINK TO CATEGORY */}
                {formData.linkType === 'CATEGORY' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-semibold text-gray-800 text-[11px]">
                      Select Product Category
                    </label>
                    <select
                      value={formData.linkedCategoryId || ''}
                      onChange={(e) => handleSelectCategory(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-[#8BCF9B] font-medium"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} (/category/{cat.slug})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Target URL: {formData.destinationUrl || '/category/...'}
                    </p>
                  </div>
                )}

                {/* OPTION 3: CUSTOM URL */}
                {formData.linkType === 'CUSTOM' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-semibold text-gray-800 text-[11px]">
                      Enter Custom Internal or External URL
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.destinationUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, destinationUrl: e.target.value }))}
                      placeholder="e.g. /shop, /hampers, /custom-hamper, or https://example.com"
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-[#8BCF9B] font-mono text-xs"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-gray-400">Quick suggestions:</span>
                      {['/shop', '/hampers', '/custom-hamper', '/order-tracking', '/about'].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, destinationUrl: quick }))}
                          className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[10px] font-mono hover:bg-gray-100 cursor-pointer"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* OPTION 4: NO LINK */}
                {formData.linkType === 'NONE' && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-gray-500 text-[11px]">
                    Banner will be displayed as a non-clickable presentation graphic.
                  </div>
                )}
              </div>

              {/* 4. OPTIONAL TITLE, DESCRIPTION, BUTTON TEXT & BADGE */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-900 text-xs">
                    Promotional Overlay Content
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-semibold">
                    Optional
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Banner Title (Optional Heading)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Caring for Loved Ones, Across Continents"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Banner Description (Optional Promotional Message)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short, evocative message highlighting express international care delivery..."
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData((prev) => ({ ...prev, buttonText: e.target.value }))}
                      placeholder="e.g. Shop Now, Explore Hampers, View Product"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Top Badge Pill (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                      placeholder="e.g. Worldwide Care Delivery"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                    />
                  </div>
                </div>
              </div>

              {/* 5. DISPLAY ORDER & STATUS */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] font-bold"
                  >
                    <option value="ACTIVE">Active (Enabled on Homepage)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1b5e2d] text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingSlideId ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm">Banner Live Storefront Preview</h3>
                <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewMode === 'desktop' ? 'bg-[#237A3B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (16:9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewMode === 'mobile' ? 'bg-[#237A3B] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile Portrait</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-gray-100 flex items-center justify-center">
              {/* Preview Container */}
              <div
                className={`relative overflow-hidden bg-gray-950 rounded-2xl shadow-xl transition-all duration-300 ${
                  previewMode === 'desktop' ? 'w-full aspect-16/8' : 'w-80 h-[520px]'
                }`}
              >
                <img
                  src={
                    (previewMode === 'mobile' && (previewSlide.mobileImage || previewSlide.mobileImageUrl)
                      ? previewSlide.mobileImage || previewSlide.mobileImageUrl || previewSlide.desktopImage
                      : previewSlide.desktopImage || previewSlide.bannerImageUrl) || ''
                  }
                  alt={previewSlide.title || 'Preview'}
                  className="w-full h-full object-cover"
                />

                {(previewSlide.title || previewSlide.description || previewSlide.subtitle || previewSlide.badge) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/50 to-transparent" />
                    <div className="absolute inset-0 max-w-xl p-6 sm:p-10 flex flex-col justify-center space-y-3">
                      {previewSlide.badge && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#8BCF9B]/20 border border-[#8BCF9B]/40 text-[#8BCF9B] text-[10px] font-semibold w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{previewSlide.badge}</span>
                        </div>
                      )}

                      {previewSlide.title && (
                        <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
                          {previewSlide.title}
                        </h2>
                      )}

                      {(previewSlide.description || previewSlide.subtitle) && (
                        <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 max-w-md">
                          {previewSlide.description || previewSlide.subtitle}
                        </p>
                      )}

                      {(previewSlide.buttonText || previewSlide.ctaText) && (
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8BCF9B] text-[#1F2937] font-extrabold text-xs shadow-md">
                            <span>{previewSlide.buttonText || previewSlide.ctaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#237A3B]" />
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Link: <strong>{previewSlide.destinationUrl || previewSlide.ctaUrl || 'None (Unclickable)'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="px-4 py-1.5 bg-gray-900 text-white rounded-xl font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
