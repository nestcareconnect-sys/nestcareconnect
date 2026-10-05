import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Heart,
  Camera,
  MessageSquare,
  Upload,
  Eye,
  Info,
  X,
  Check,
  QrCode,
  Box as BoxIcon,
  Search,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { Product, HamperBox, CustomHamperConfig } from '../../types';
import { customHamperApi, boxesApi } from '../../services/api';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { INITIAL_PRODUCTS, INITIAL_HAMPER_BOXES } from '../../constants';
import { PersonalizationPhotoUpload } from './PersonalizationPhotoUpload';

// Pre-defined Recipient Options
const RECIPIENT_OPTIONS = [
  { id: 'Parents (Mum & Dad)', label: 'Parents (Mum & Dad)', icon: '👨‍👩‍👧', desc: 'Comprehensive senior care & festive love' },
  { id: 'Mother / Mum', label: 'Mother / Mum', icon: '👩', desc: 'Ayurvedic wellness, comfort & apparel' },
  { id: 'Father / Dad', label: 'Father / Dad', icon: '👨', desc: 'Kerala Kasavu mundu, monitors & snacks' },
  { id: 'Pregnancy & New Mum', label: 'Pregnancy & New Mum', icon: '🤰', desc: 'Gentle organic care & mother nutrition' },
  { id: 'Grandparents', label: 'Grandparents', icon: '👵', desc: 'Mobility aids, soft fabrics & health tests' },
  { id: 'Couple / Anniversary', label: 'Couple / Anniversary', icon: '💑', desc: 'Celebration treats, dry fruits & gifts' },
  { id: 'Family & Loved Ones', label: 'Family & Loved Ones', icon: '🏡', desc: 'Thoughtful curated care for relatives' },
];

// Pre-defined Occasion Options
const OCCASION_OPTIONS = [
  { id: 'Sending Love Across the Miles', label: 'Sending Love Across the Miles', icon: '💌' },
  { id: 'Senior Health & Medical Care', label: 'Senior Health & Medical Care', icon: '🩺' },
  { id: 'Wedding Anniversary Celebration', label: 'Wedding Anniversary Celebration', icon: '💍' },
  { id: 'New Baby & Mum Welcome', label: 'New Baby & Mum Welcome', icon: '👶' },
  { id: 'Post-Hospitalization Recovery', label: 'Post-Hospitalization Recovery', icon: '🏥' },
  { id: 'Birthday & Festival', label: 'Birthday & Festival', icon: '🎂' },
];

// Suggested Greeting Prompts
const MESSAGE_PROMPTS = [
  'Wishing you good health, joy, and long life! Miss you both so much Mum & Dad  ',
  'Sending love and warm hugs from across the miles. Take good care of your health!',
  'Happy Anniversary! May you continue to inspire us with your love and togetherness.',
  'Get well soon! We are always by your side and praying for your speedy recovery.',
];

export const CustomHamperBuilder: React.FC = () => {
  const { country, currency, formatPrice, calculateProductPrice, calculateBoxPrice } = useCountryCurrency();
  const { addCustomHamperToCart } = useCart();
  const { showToast } = useToast();

  // Active Flow Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Data Sources
  const [products, setProducts] = useState<Product[]>([]);
  const [boxes, setBoxes] = useState<HamperBox[]>([]);
  const [config, setConfig] = useState<CustomHamperConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // STEP 1: Recipient & Occasion
  const [recipient, setRecipient] = useState<string>('Parents (Mum & Dad)');
  const [occasion, setOccasion] = useState<string>('Sending Love Across the Miles');
  const [hamperTitle, setHamperTitle] = useState<string>('Custom Care Hamper for Parents');

  // STEP 2: Selected Products Map: { [productId]: quantity }
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // STEP 4: Selected Hamper Box (MANDATORY)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [viewingBoxModal, setViewingBoxModal] = useState<HamperBox | null>(null);
  const [activeModalImageIndex, setActiveModalImageIndex] = useState<number>(0);

  // STEP 5: Personalization
  const [personalMessage, setPersonalMessage] = useState<string>(
    'With love and wishes for your good health and happiness from your children across the miles!'
  );
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80',
  ]);
  const [includeVideoQR, setIncludeVideoQR] = useState<boolean>(true);

  // UI state
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Fetch Config, Products & Hamper Boxes
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      customHamperApi.getConfig().catch(() => null),
      boxesApi.getAll({ country, currency }).catch(() => null),
    ])
      .then(([configRes, boxesRes]) => {
        if (configRes?.data?.success && configRes.data.data) {
          setConfig(configRes.data.data.config);
          setProducts(configRes.data.data.products);
        } else {
          setProducts(INITIAL_PRODUCTS as any);
        }

        if (boxesRes?.data?.success && Array.isArray(boxesRes.data.data) && boxesRes.data.data.length > 0) {
          setBoxes(boxesRes.data.data);
        } else {
          setBoxes(INITIAL_HAMPER_BOXES as any);
        }
      })
      .finally(() => setIsLoading(false));
  }, [country, currency]);

  // Update hamper title when recipient changes if title is default
  const handleSelectRecipient = (rec: string) => {
    setRecipient(rec);
    setHamperTitle(`Custom Care Hamper for ${rec}`);
  };

  // Product Quantity Modifiers
  const handleSetQuantity = (productId: string, qty: number) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (qty <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = qty;
      }
      return updated;
    });
  };

  const handlePhotoUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (uploadedPhotos.length >= 3) {
        showToast('Maximum 3 photos allowed for keepsake card & video greeting.', 'info');
        return;
      }
      const fakeUrl = URL.createObjectURL(e.target.files[0]);
      setUploadedPhotos((prev) => [...prev, fakeUrl]);
      showToast('Photo attached successfully for personal keepsake card!', 'success');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Selected Count & Subtotal Computations
  const selectedCount = useMemo(
    () => Object.values(selectedItems).reduce((a, b) => a + b, 0),
    [selectedItems]
  );

  const selectedProductList = useMemo(() => {
    return Object.entries(selectedItems)
      .map(([productId, quantity]) => {
        const prod = products.find((p) => p.id === productId);
        if (!prod) return null;
        const { price } = calculateProductPrice(prod);
        return {
          productId,
          product: prod,
          quantity,
          unitPrice: price,
          totalPrice: price * quantity,
        };
      })
      .filter(Boolean) as {
      productId: string;
      product: Product;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }, [selectedItems, products, calculateProductPrice]);

  const productsSubtotal = useMemo(
    () => selectedProductList.reduce((acc, itm) => acc + itm.totalPrice, 0),
    [selectedProductList]
  );

  // Selected Box Computation
  const selectedBox = useMemo(() => {
    if (!selectedBoxId) return null;
    return boxes.find((b) => b.id === selectedBoxId || b.slug === selectedBoxId) || null;
  }, [boxes, selectedBoxId]);

  const boxPrice = useMemo(() => {
    if (!selectedBox) return 0;
    return calculateBoxPrice(selectedBox);
  }, [selectedBox, calculateBoxPrice]);

  const totalHamperPrice = productsSubtotal + boxPrice;

  const minItems = config?.minItems || 2;
  const maxItems = config?.maxItems || 20;
  const isProductCountValid = selectedCount >= minItems && selectedCount <= maxItems;

  const wordCount = personalMessage.trim().split(/\s+/).filter(Boolean).length;
  const isMessageValid = wordCount <= 50;

  // Capacity Compatibility Check for Boxes
  const isBoxCompatible = (box: HamperBox) => selectedCount <= box.capacity;

  // Auto-invalidation: If products are modified in Step 2 so that selectedCount > selectedBox.capacity,
  // clear selectedBoxId and show warning
  useEffect(() => {
    if (selectedBox && selectedCount > selectedBox.capacity) {
      setSelectedBoxId(null);
      showToast(
        `Your selected box '${selectedBox.name}' holds max ${selectedBox.capacity} items. Please select a larger box.`,
        'info'
      );
    }
  }, [selectedCount, selectedBox, showToast]);

  // Recommended Box Calculation: Best fit for selectedCount
  const recommendedBoxId = useMemo(() => {
    if (selectedCount === 0) {
      return boxes.find((b) => b.isRecommended)?.id || boxes[0]?.id;
    }
    const compatible = boxes
      .filter((b) => b.capacity >= selectedCount && b.status === 'ACTIVE')
      .sort((a, b) => a.capacity - b.capacity);
    return compatible[0]?.id || boxes.find((b) => b.isRecommended)?.id || boxes[0]?.id;
  }, [boxes, selectedCount]);

  // Handle Box Selection
  const handleSelectBox = (box: HamperBox) => {
    if (!isBoxCompatible(box)) {
      showToast(
        `This box only holds ${box.capacity} items. You have ${selectedCount} items selected. Please choose a larger box.`,
        'error'
      );
      return;
    }
    setSelectedBoxId(box.id);
    showToast(`Selected '${box.name}' for your care hamper.`, 'success');
  };

  // Add Customized Hamper to Cart
  const handleAddToCart = async () => {
    if (!selectedBoxId || !selectedBox) {
      showToast('A hamper box is required! Please select a hamper box in Step 4.', 'error');
      setCurrentStep(4);
      return;
    }

    if (!isProductCountValid) {
      showToast(`Please select between ${minItems} and ${maxItems} items for your custom hamper.`, 'error');
      setCurrentStep(2);
      return;
    }

    if (!isMessageValid) {
      showToast('Please limit your personal greeting card message to 50 words.', 'error');
      setCurrentStep(5);
      return;
    }

    setIsAddingToCart(true);
    try {
      await addCustomHamperToCart({
        title: hamperTitle.trim() || `Custom Care Hamper for ${recipient}`,
        recipientType: recipient,
        occasion,
        boxId: selectedBox.id,
        box: selectedBox,
        boxPrice,
        productsSubtotal,
        personalisationPrice: 0,
        totalPrice: totalHamperPrice,
        message: personalMessage,
        items: selectedProductList.map((itm) => ({
          productId: itm.productId,
          product: itm.product,
          quantity: itm.quantity,
          unitPrice: itm.unitPrice,
        })),
        personalization: {
          recipientVariant: recipient,
          customMessage: personalMessage,
          attachedPhotos: uploadedPhotos,
          videoStatus: includeVideoQR ? 'VIDEO_REQUIRED' : 'NOT_REQUIRED',
        },
      });

      setIsSuccessModalOpen(true);
      showToast('Customized care hamper added to cart successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add custom hamper to cart.', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Reset Builder
  const handleResetBuilder = () => {
    setSelectedItems({});
    setSelectedBoxId(null);
    setCurrentStep(1);
    setIsSuccessModalOpen(false);
  };

  // Filter Categories
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((prod) => {
      const catName =
        prod.category?.name ||
        (prod.addOnCategory === 'MEDICAL_MOBILITY'
          ? 'Medical Care'
          : prod.addOnCategory === 'PERSONAL_CARE'
          ? 'Personal Care'
          : 'Gifts & Lifestyle');
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(prod);
    });
    return map;
  }, [products]);

  const categoryNames = useMemo(() => Array.from(categoriesMap.keys()), [categoriesMap]);

  const displayedProducts = useMemo(() => {
    let list = products;
    if (activeCategoryTab !== 'all') {
      list = list.filter((p) => {
        const cat =
          p.category?.name ||
          (p.addOnCategory === 'MEDICAL_MOBILITY'
            ? 'Medical Care'
            : p.addOnCategory === 'PERSONAL_CARE'
            ? 'Personal Care'
            : 'Gifts & Lifestyle');
        return cat === activeCategoryTab;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategoryTab, searchQuery]);

  // Steps Navigation Meta
  const stepsMeta = [
    { num: 1, title: 'Recipient & Occasion', short: 'Recipient' },
    { num: 2, title: 'Select Products', short: 'Products' },
    { num: 3, title: 'Review Products', short: 'Review' },
    { num: 4, title: 'Select Box (Required)', short: 'Box Required' },
    { num: 5, title: 'Personalization', short: 'Message' },
    { num: 6, title: 'Final Review', short: 'Summary' },
  ];

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#237A3B] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-600">Loading Hamper Studio & Products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="bg-radial from-[#237A3B] to-[#144822] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#8BCF9B]/30 relative overflow-hidden">
        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[#8BCF9B] text-xs font-bold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curate a Bespoke Care Package</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Build Your Own Care Hamper
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
            Select essential medical monitors, Ayurvedic skincare, Kerala Kasavu apparel, and gourmet treats. Pair with a mandatory luxury keepsake box and personalized video QR card.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs space-y-2 min-w-[240px] relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Selected Products:</span>
            <span className="font-bold text-[#8BCF9B] px-2 py-0.5 rounded-full bg-white/10">
              {selectedCount} item(s)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Hamper Box:</span>
            <span className={`font-semibold ${selectedBox ? 'text-[#8BCF9B]' : 'text-amber-300'}`}>
              {selectedBox ? selectedBox.name : 'Required in Step 4'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <span className="text-gray-300">Current Total:</span>
            <span className="font-extrabold text-white text-sm">
              {formatPrice(totalHamperPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs">
        <div className="grid grid-cols-6 gap-1 sm:gap-2">
          {stepsMeta.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            const canNavigate = s.num <= currentStep || (s.num === 2 && currentStep >= 1) || (s.num === 3 && selectedCount >= minItems);

            return (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep) {
                    setCurrentStep(s.num as any);
                  } else if (s.num === 2) {
                    setCurrentStep(2);
                  } else if (s.num === 3 && selectedCount >= minItems) {
                    setCurrentStep(3);
                  } else if (s.num === 4 && selectedCount >= minItems) {
                    setCurrentStep(4);
                  } else if (s.num === 5 && selectedBoxId) {
                    setCurrentStep(5);
                  } else if (s.num === 6 && selectedBoxId && isMessageValid) {
                    setCurrentStep(6);
                  }
                }}
                disabled={!canNavigate && !isCompleted}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-[#F1FAF3] border border-[#8BCF9B] text-[#237A3B]'
                    : isCompleted
                    ? 'text-gray-700 hover:bg-gray-50'
                    : 'text-gray-400 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-xs mb-1 transition-all ${
                    isCurrent
                      ? 'bg-[#237A3B] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[#8BCF9B] text-[#144822]'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold line-clamp-1">
                  {s.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Main Step Canvas (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: CHOOSE RECIPIENT & OCCASION */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Step 1: Choose Recipient & Occasion
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tell us who this care package is for to help us tailor packaging and recommendations.
                  </p>
                </div>
              </div>

              {/* Recipient Selection Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Who is this care package for?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RECIPIENT_OPTIONS.map((rec) => {
                    const isSelected = recipient === rec.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleSelectRecipient(rec.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#237A3B] bg-[#F1FAF3] ring-2 ring-[#8BCF9B]/40 shadow-xs'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{rec.icon}</span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-gray-900">{rec.label}</h4>
                          <p className="text-[11px] text-gray-500 line-clamp-1">{rec.desc}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#237A3B] shrink-0 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occasion Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Select Occasion / Gifting Purpose
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {OCCASION_OPTIONS.map((occ) => {
                    const isSelected = occasion === occ.id;
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => setOccasion(occ.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#237A3B] bg-[#F1FAF3] text-[#237A3B] font-bold shadow-xs'
                            : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-lg">{occ.icon}</span>
                        <span className="text-xs font-semibold truncate">{occ.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hamper Custom Name / Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Hamper Title (Printed on outer luxury card)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={hamperTitle}
                    onChange={(e) => setHamperTitle(e.target.value)}
                    placeholder="e.g. Personalized Family Care Hamper"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] focus:bg-white outline-none font-semibold text-gray-800"
                  />
                  <Edit3 className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                </div>
              </div>

              {/* Step 1 Next Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span>Continue to Select Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: SELECT PRODUCTS */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Step Header */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Step 2: Select Products for Your Hamper
                    </h2>
                    <p className="text-xs text-gray-500">
                      Choose at least {minItems} items (monitors, strips, clothing, personal care, or sweets).
                    </p>
                  </div>
                </div>

                {/* Capacity Counter Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 text-xs">
                  <Package className="w-4 h-4 text-[#237A3B]" />
                  <span className="font-bold text-[#237A3B]">
                    {selectedCount} item(s) selected
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-bold text-gray-800">{formatPrice(productsSubtotal)}</span>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search medical monitors, diabetic strips, Kerala mundu, cashews, soaps..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] focus:bg-white outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-gray-400 hover:text-gray-600 absolute right-3 top-2.5"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setActiveCategoryTab('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategoryTab === 'all'
                        ? 'bg-[#237A3B] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Available Items ({products.length})
                  </button>

                  {categoryNames.map((catName) => (
                    <button
                      key={catName}
                      onClick={() => setActiveCategoryTab(catName)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeCategoryTab === catName
                          ? 'bg-[#237A3B] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {catName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedProducts.map((product) => {
                  const { price } = calculateProductPrice(product);
                  const currentQty = selectedItems[product.id] || 0;
                  const isSelected = currentQty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`flex gap-3.5 p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-[#8BCF9B] bg-[#F1FAF3]/90 shadow-xs ring-1 ring-[#8BCF9B]'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs'
                      }`}
                    >
                      {/* Thumbnail */}
                      <img
                        src={
                          product.images?.[0] ||
                          'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={product.name}
                        className="w-20 h-20 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                              {product.category?.name || product.brand || 'Care Item'}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#237A3B] bg-[#8BCF9B]/30 px-1.5 py-0.5 rounded-md">
                                In Hamper ({currentQty})
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-xs text-gray-900 line-clamp-1 leading-snug">
                            {product.name}
                          </h4>
                          <div className="font-extrabold text-xs text-[#237A3B] mt-0.5">
                            {formatPrice(price)}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="pt-2 flex items-center justify-between">
                          {isSelected ? (
                            <div className="flex items-center border border-[#8BCF9B] rounded-lg bg-white shadow-xs">
                              <button
                                onClick={() => handleSetQuantity(product.id, currentQty - 1)}
                                className="p-1 text-gray-600 hover:text-red-500"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-bold text-[#237A3B]">
                                {currentQty}
                              </span>
                              <button
                                onClick={() => {
                                  if (selectedCount < maxItems) {
                                    handleSetQuantity(product.id, currentQty + 1);
                                  } else {
                                    showToast(`Maximum ${maxItems} items per custom hamper.`, 'error');
                                  }
                                }}
                                className="p-1 text-gray-600 hover:text-[#237A3B]"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (selectedCount < maxItems) {
                                  handleSetQuantity(product.id, 1);
                                } else {
                                  showToast(`Maximum ${maxItems} items per custom hamper.`, 'error');
                                }
                              }}
                              className="px-3 py-1.5 bg-[#F1FAF3] hover:bg-[#237A3B] text-[#237A3B] hover:text-white border border-[#8BCF9B]/50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add to Hamper</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step Navigation Bar */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Recipient</span>
                </button>

                <div className="flex items-center gap-3">
                  {!isProductCountValid && (
                    <span className="text-xs text-amber-700 font-semibold hidden sm:inline">
                      Select at least {minItems} products (currently {selectedCount})
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!isProductCountValid}
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <span>Review Products (Step 3)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: REVIEW SELECTED PRODUCTS */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Step 3: Review Selected Products
                    </h2>
                    <p className="text-xs text-gray-500">
                      Confirm your item quantities before selecting the matching packaging box.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-[#F1FAF3] text-[#237A3B] text-xs font-bold rounded-full border border-[#8BCF9B]/40">
                  {selectedCount} Items Total
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {selectedProductList.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          item.product.images?.[0] ||
                          'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover bg-white border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          {item.product.category?.name || item.product.brand || 'Care Item'}
                        </span>
                        <h4 className="font-bold text-xs text-gray-900 truncate">
                          {item.product.name}
                        </h4>
                        <span className="text-[11px] text-[#237A3B] font-semibold">
                          {formatPrice(item.unitPrice)} each
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-2xs">
                        <button
                          onClick={() => handleSetQuantity(item.productId, item.quantity - 1)}
                          className="p-1 text-gray-500 hover:text-red-500"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleSetQuantity(item.productId, item.quantity + 1)}
                          className="p-1 text-gray-500 hover:text-[#237A3B]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right min-w-[70px]">
                        <span className="font-extrabold text-xs text-gray-900 block">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleSetQuantity(item.productId, 0)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal Banner */}
              <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-600 font-semibold block">
                    Products Subtotal ({selectedCount} items)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Hamper packaging box will be calculated in Step 4.
                  </span>
                </div>
                <span className="text-lg font-extrabold text-[#237A3B]">
                  {formatPrice(productsSubtotal)}
                </span>
              </div>

              {/* REQUIRED NOTICE */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <BoxIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Next Step: Select Your Hamper Box (Required)</p>
                  <p className="text-amber-800 leading-relaxed">
                    A customized hamper requires a packaging box. Please proceed to select a compatible keepsake box suited for your {selectedCount} items. (Direct add to cart is disabled until box selection).
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Add More Products</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-3 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span>Continue to Choose Box (Step 4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SELECT HAMPER BOX — REQUIRED */}
          {/* ========================================================= */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>Step 4: Select Hamper Box</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wide">
                        Required
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500">
                      Choose a suitable packaging box that fits your {selectedCount} selected items.
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-gray-400 block font-semibold uppercase">
                    Current Products
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    {selectedCount} item(s) to pack
                  </span>
                </div>
              </div>

              {/* Guide Alert */}
              <div className="p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-center gap-3 text-xs text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-[#237A3B] shrink-0" />
                <span>
                  Every box includes protective silk/velvet lining, honeycomb cushioning, signature ribbon, and a printed personalized keepsake envelope.
                </span>
              </div>

              {/* Hamper Boxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {boxes.map((box) => {
                  const bPrice = calculateBoxPrice(box);
                  const isSelected = selectedBoxId === box.id || selectedBoxId === box.slug;
                  const compatible = isBoxCompatible(box);
                  const isBestFit = box.id === recommendedBoxId;

                  return (
                    <div
                      key={box.id}
                      className={`relative rounded-3xl border p-4 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#237A3B] bg-[#F1FAF3] ring-2 ring-[#8BCF9B] shadow-md'
                          : compatible
                          ? 'border-gray-200 bg-white hover:border-[#8BCF9B] hover:shadow-xs'
                          : 'border-red-200 bg-gray-50/70 opacity-75'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                          {box.size} Box
                        </span>

                        <div className="flex items-center gap-1">
                          {isBestFit && (
                            <span className="px-2 py-0.5 rounded-full bg-[#237A3B] text-white text-[10px] font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Recommended
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8BCF9B] text-[#144822] text-[10px] font-extrabold">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Box Image Preview */}
                      <div className="relative group rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 aspect-4/3 mb-3">
                        <img
                          src={
                            box.images?.[0] ||
                            'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={box.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setViewingBoxModal(box);
                            setActiveModalImageIndex(0);
                          }}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-semibold transition-opacity backdrop-blur-2xs"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Photos & Specs</span>
                        </button>
                      </div>

                      {/* Box Info */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-gray-900">{box.name}</h3>
                          <span className="font-extrabold text-sm text-[#237A3B] shrink-0">
                            {formatPrice(bPrice)}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {box.description || box.material}
                        </p>

                        <div className="pt-1 text-[10px] text-gray-500 space-y-0.5">
                          {box.dimensions && <div>• Dimensions: {box.dimensions}</div>}
                          <div>• Material: {box.material}</div>
                        </div>

                        {/* Capacity Status Badge */}
                        <div className="pt-2">
                          {compatible ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#237A3B]" />
                              <span>
                                Fits {selectedCount} items (Max capacity: {box.capacity})
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>
                                Too small ({selectedCount} selected / Max {box.capacity})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection Action Button */}
                      <div className="pt-2 border-t border-gray-100/60 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectBox(box)}
                          disabled={!compatible}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#237A3B] text-white shadow-xs'
                              : compatible
                              ? 'bg-[#F1FAF3] hover:bg-[#237A3B] text-[#237A3B] hover:text-white border border-[#8BCF9B]/60'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Selected Box</span>
                            </>
                          ) : compatible ? (
                            <span>Select This Box ({formatPrice(bPrice)})</span>
                          ) : (
                            <span>Select Larger Box</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setViewingBoxModal(box);
                            setActiveModalImageIndex(0);
                          }}
                          className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                          title="View box details and photos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Box Confirmation Box */}
              {selectedBox ? (
                <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedBox.images?.[0]}
                      alt={selectedBox.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#8BCF9B]/40 bg-white"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Selected Box</span>
                      <h4 className="font-bold text-xs text-gray-900">{selectedBox.name}</h4>
                      <span className="text-[11px] text-[#237A3B] font-semibold">
                        {selectedBox.size} • Holds up to {selectedBox.capacity} items • {formatPrice(boxPrice)}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#237A3B]" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    Please select one of the compatible hamper boxes above to continue to personalization.
                  </span>
                </div>
              )}

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Products</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedBoxId || !selectedBox}
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-3 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span>Continue to Personalization (Step 5)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: PERSONALIZATION */}
          {/* ========================================================= */}
          {currentStep === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Step 5: Add Personal Touches & Family Love
                    </h2>
                    <p className="text-xs text-gray-500">
                      Personalized greeting card, keepsake photos, and video QR code included for free.
                    </p>
                  </div>
                </div>
              </div>

              {/* 50-Word Personal Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#237A3B]" />
                    <span>Personal Greeting Card Message (Printed in Box)</span>
                  </label>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      wordCount > 50
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-[#237A3B]'
                    }`}
                  >
                    {wordCount}/50 words
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Write a heartwarming message for your parents or loved ones..."
                  className={`w-full px-4 py-3 text-xs bg-gray-50 border rounded-2xl outline-none font-serif italic text-gray-800 transition-colors ${
                    wordCount > 50
                      ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                      : 'border-gray-200 focus:border-[#8BCF9B] focus:bg-white'
                  }`}
                />

                {/* Quick Prompts */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Suggested Message Templates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MESSAGE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPersonalMessage(prompt)}
                        className="text-[11px] text-gray-600 bg-gray-100 hover:bg-[#F1FAF3] hover:text-[#237A3B] px-2.5 py-1 rounded-lg border border-gray-200 transition-colors text-left"
                      >
                        "{prompt.substring(0, 42)}..."
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo Upload (1-3 photos) */}
              <PersonalizationPhotoUpload
                photos={uploadedPhotos}
                onChange={setUploadedPhotos}
                maxPhotos={3}
                instructions="Add up to 3 family photos for high-definition 300 GSM keepsake photo card."
                title="Family Photos for Keepsake Keepsake Frame"
              />

              {/* Video QR Code Option */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVideoQR}
                    onChange={(e) => setIncludeVideoQR(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#237A3B] accent-[#237A3B] rounded"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#237A3B]" />
                      <span>Include Personalized Video QR Greeting Card (Included Free)</span>
                    </span>
                    <p className="text-gray-600 text-[11px]">
                      A unique QR code is printed inside the keepsake box. Recipient can scan it with their phone camera to watch your personal video greeting. You can record or upload the video anytime after checkout.
                    </p>
                  </div>
                </label>
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Box Selection</span>
                </button>

                <button
                  type="button"
                  disabled={!isMessageValid}
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-3 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <span>Continue to Final Review (Step 6)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 6: FINAL HAMPER REVIEW & ADD TO CART */}
          {/* ========================================================= */}
          {currentStep === 6 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#237A3B] text-white flex items-center justify-center font-bold text-sm">
                    6
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Step 6: Final Hamper Review & Confirmation
                    </h2>
                    <p className="text-xs text-gray-500">
                      Check your customized hamper contents, packaging box, and personalization details before adding to cart.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Products Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#237A3B]" />
                    <span>Constituent Healthcare & Gifting Products ({selectedCount} items)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-[#237A3B] font-bold hover:underline"
                  >
                    Edit Products
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedProductList.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product.images?.[0]}
                          alt={item.product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-200"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                          <span className="text-[11px] text-gray-500">
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">{formatPrice(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Box Section */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BoxIcon className="w-4 h-4 text-[#237A3B]" />
                    <span>Selected Luxury Hamper Box (Required)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs text-[#237A3B] font-bold hover:underline"
                  >
                    Change Box
                  </button>
                </div>

                {selectedBox && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B] text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedBox.images?.[0]}
                        alt={selectedBox.name}
                        className="w-14 h-14 rounded-xl object-cover bg-white border border-[#8BCF9B]/40"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900">{selectedBox.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#8BCF9B]/40 text-[#144822] text-[10px] font-bold">
                            {selectedBox.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {selectedBox.material} • {selectedBox.dimensions || 'Custom Fit'}
                        </p>
                        <span className="text-[11px] text-emerald-800 font-semibold">
                          Holds up to {selectedBox.capacity} items • {selectedCount} items packed
                        </span>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-[#237A3B]">
                      {formatPrice(boxPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Personalization Section */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-[#237A3B]" />
                    <span>Personalization & Keepsake Card</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="text-xs text-[#237A3B] font-bold hover:underline"
                  >
                    Edit Message & Photos
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 block font-semibold">Recipient:</span>
                      <span className="font-bold text-gray-900">{recipient}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Occasion:</span>
                      <span className="font-bold text-gray-900">{occasion}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Printed Message:
                    </span>
                    <p className="font-serif italic text-gray-700 bg-white p-3 rounded-xl border border-gray-100">
                      "{personalMessage}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-gray-500 font-medium">
                      Keepsake Photos: <strong className="text-gray-900">{uploadedPhotos.length} attached</strong>
                    </span>
                    <span className="text-emerald-800 font-semibold flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{includeVideoQR ? 'Video QR Card Included' : 'No Video QR'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Transparent Price Breakdown */}
              <div className="p-5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B] space-y-2 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>Products Subtotal ({selectedCount} items)</span>
                  <span className="font-bold text-gray-900">{formatPrice(productsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>{selectedBox?.name || 'Hamper Box'}</span>
                  <span className="font-bold text-gray-900">{formatPrice(boxPrice)}</span>
                </div>
                <div className="flex justify-between text-[#237A3B] font-semibold">
                  <span>Personalization Card, Photos & Video QR</span>
                  <span>FREE / Included</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-[#8BCF9B]/40 pt-3">
                  <span>Total Hamper Value</span>
                  <span className="text-xl text-[#237A3B]">{formatPrice(totalHamperPrice)}</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Personalization</span>
                </button>

                <button
                  type="button"
                  disabled={isAddingToCart || !selectedBoxId}
                  onClick={handleAddToCart}
                  className="flex-1 py-4 bg-[#237A3B] hover:bg-[#1a5b2c] text-white font-extrabold text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 transform active:scale-98"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>{isAddingToCart ? 'Adding to Cart...' : 'Add Customized Hamper to Cart'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Live Studio Summary (4 Cols) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-24">
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#237A3B]" />
                <h3 className="font-bold text-base text-gray-900">YOUR HAMPER</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8BCF9B]/30 text-[#237A3B] text-xs font-bold">
                Step {currentStep}/6
              </span>
            </div>

            {/* Recipient & Occasion Pill */}
            <div className="p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/30 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Recipient</span>
                <span className="font-bold text-emerald-950">{recipient}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Occasion</span>
                <span className="text-gray-700 font-medium truncate max-w-[160px]">{occasion}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#8BCF9B]/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Hamper Box</span>
                <span className={`font-bold ${selectedBox ? 'text-[#237A3B]' : 'text-amber-600'}`}>
                  {selectedBox ? selectedBox.name : 'Not Selected Yet'}
                </span>
              </div>
            </div>

            {/* Selected Items Breakdown List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedProductList.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  No products added yet. Pick at least {minItems} items.
                </div>
              ) : (
                selectedProductList.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="truncate max-w-[160px]">
                      <span className="font-semibold text-gray-900 block truncate">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {formatPrice(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => handleSetQuantity(item.productId, 0)}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Live Pricing Breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Products Subtotal</span>
                <span className="font-bold text-gray-900">{formatPrice(productsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Hamper Box ({selectedBox ? selectedBox.size : 'Required'})</span>
                <span className={`font-bold ${selectedBox ? 'text-gray-900' : 'text-amber-600'}`}>
                  {selectedBox ? formatPrice(boxPrice) : 'Step 4'}
                </span>
              </div>
              <div className="flex justify-between text-[#237A3B] font-semibold text-[11px]">
                <span>Keepsake Card & Video QR</span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total Hamper Price</span>
                <span className="text-base text-[#237A3B]">{formatPrice(totalHamperPrice)}</span>
              </div>
            </div>

            {/* Primary Action Button in Sidebar */}
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) setCurrentStep(2);
                  else if (currentStep === 2 && isProductCountValid) setCurrentStep(3);
                  else if (currentStep === 3) setCurrentStep(4);
                  else if (currentStep === 4 && selectedBoxId) setCurrentStep(5);
                  else if (currentStep === 5 && isMessageValid) setCurrentStep(6);
                }}
                disabled={(currentStep === 2 && !isProductCountValid) || (currentStep === 4 && !selectedBoxId)}
                className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1a5b2c] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart || !selectedBoxId}
                className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1a5b2c] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Hamper to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar (Positioned above the fixed mobile bottom navigation bar) */}
      <div className="lg:hidden fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 bg-white/98 backdrop-blur-md border-t border-[#8BCF9B]/30 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-500 block">
            Step {currentStep}/6 • {selectedCount} items
          </span>
          <span className="font-extrabold text-sm text-[#237A3B]">
            {formatPrice(totalHamperPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 6 ? (
            <button
              onClick={() => {
                if (currentStep === 1) setCurrentStep(2);
                else if (currentStep === 2 && isProductCountValid) setCurrentStep(3);
                else if (currentStep === 3) setCurrentStep(4);
                else if (currentStep === 4 && selectedBoxId) setCurrentStep(5);
                else if (currentStep === 5 && isMessageValid) setCurrentStep(6);
              }}
              disabled={(currentStep === 2 && !isProductCountValid) || (currentStep === 4 && !selectedBoxId)}
              className="px-4 py-2 bg-[#237A3B] text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1 shadow-xs"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || !selectedBoxId}
              className="px-4 py-2 bg-[#237A3B] text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1 shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>

      {/* BOX DETAILS & GALLERY MODAL */}
      <AnimatePresence>
        {viewingBoxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {viewingBoxModal.size} Hamper Box
                  </span>
                  <h3 className="font-bold text-base text-gray-900">{viewingBoxModal.name}</h3>
                </div>
                <button
                  onClick={() => setViewingBoxModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Image */}
              <div className="aspect-16/10 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                <img
                  src={
                    viewingBoxModal.images?.[activeModalImageIndex] ||
                    viewingBoxModal.images?.[0] ||
                    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={viewingBoxModal.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnail strip if multiple images */}
              {viewingBoxModal.images && viewingBoxModal.images.length > 1 && (
                <div className="flex gap-2">
                  {viewingBoxModal.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveModalImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        activeModalImageIndex === idx
                          ? 'border-[#237A3B] shadow-xs'
                          : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <img src={img} alt="Angle" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Details & Specs */}
              <div className="space-y-3 text-xs">
                <p className="text-gray-600 leading-relaxed">
                  {viewingBoxModal.description ||
                    'Crafted from rigid, sustainable packaging board with reinforced corners, magnetic or luxury latch closure, and internal protective cushioning.'}
                </p>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Dimensions</span>
                    <span className="font-bold text-gray-900">{viewingBoxModal.dimensions || '34 × 26 × 14 cm'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Item Capacity</span>
                    <span className="font-bold text-gray-900">Up to {viewingBoxModal.capacity} products</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Material</span>
                    <span className="font-bold text-gray-900">{viewingBoxModal.material}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Box Price</span>
                    <span className="font-extrabold text-[#237A3B]">
                      {formatPrice(calculateBoxPrice(viewingBoxModal))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setViewingBoxModal(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  disabled={!isBoxCompatible(viewingBoxModal)}
                  onClick={() => {
                    handleSelectBox(viewingBoxModal);
                    setViewingBoxModal(null);
                  }}
                  className="flex-1 py-3 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-colors"
                >
                  {isBoxCompatible(viewingBoxModal)
                    ? `Select This Box (${formatPrice(calculateBoxPrice(viewingBoxModal))})`
                    : `Too Small for ${selectedCount} Items`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS MODAL AFTER ADD TO CART */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center mx-auto border border-[#8BCF9B]">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="font-extrabold text-xl text-gray-900">
                  Hamper Added to Cart!
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Your customized care hamper with <strong>{selectedBox?.name}</strong> and {selectedCount} products is ready for checkout.
                </p>
              </div>

              <div className="p-4 bg-[#F1FAF3] rounded-2xl border border-[#8BCF9B]/40 text-xs space-y-1">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Hamper Value:</span>
                  <span className="text-[#237A3B]">{formatPrice(totalHamperPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Recipient:</span>
                  <span>{recipient}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    window.location.href = '/cart';
                  }}
                  className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1a5b2c] text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  View Shopping Cart & Checkout
                </button>

                <button
                  type="button"
                  onClick={handleResetBuilder}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Build Another Care Hamper
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
