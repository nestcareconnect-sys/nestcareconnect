import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  ShoppingBag,
  Gift,
  Sparkles,
  UserRound,
  User as UserIcon,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Heart,
  Layers,
  LogOut,
  Activity,
  HeartHandshake,
  Baby,
  PartyPopper,
  UserCheck,
  ArrowRight,
  Globe,
  Package,
  PackagePlus,
  Check,
  Truck,
  Plus,
  Lock,
  MapPin,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Logo } from './Logo';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { CountrySelectorModal } from './CountrySelectorModal';
import { SearchModal } from './SearchModal';
import { INITIAL_CATEGORIES, INITIAL_HAMPERS } from '../../constants';
import { useCategories, useHampers } from '../../hooks/useQueries';
import { Category, Hamper, CountryCode, COUNTRIES } from '../../types';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { country, setCountry, countryConfig, formatPrice } = useCountryCurrency();
  const { itemCount, openCartDrawer } = useCart();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { wishlistCount } = useWishlist();

  // Navigation visibility & scroll states
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Dropdowns & Modals
  const [isShopMegaOpen, setIsShopMegaOpen] = useState(false);
  const [isHampersMenuOpen, setIsHampersMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileAccountSheetOpen, setIsMobileAccountSheetOpen] = useState(false);

  // Dynamic Cached Data from TanStack React Query
  const { data: categories = INITIAL_CATEGORIES } = useCategories();
  const { data: hampers = INITIAL_HAMPERS } = useHampers();

  // Hover timeout refs to prevent dropdown flickers
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hampersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menus on route change
  useEffect(() => {
    setIsShopMegaOpen(false);
    setIsHampersMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsCountryDropdownOpen(false);
    setIsMobileAccountSheetOpen(false);
  }, [location.pathname]);

  // Handle escape key to close all dropdowns & modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShopMegaOpen(false);
        setIsHampersMenuOpen(false);
        setIsUserMenuOpen(false);
        setIsCountryDropdownOpen(false);
        setIsMobileAccountSheetOpen(false);
        setIsCountryModalOpen(false);
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if any modal or menu is open
  const isAnyMenuOpen =
    isShopMegaOpen ||
    isHampersMenuOpen ||
    isUserMenuOpen ||
    isCountryDropdownOpen ||
    isCountryModalOpen ||
    isSearchModalOpen ||
    isMobileAccountSheetOpen;

  // Scroll listener for top header hide/reveal
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Scrolled state
      setIsScrolled(currentScrollY > 20);

      // Don't hide top header if any dropdown or modal is open
      if (isAnyMenuOpen) {
        setIsNavVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (currentScrollY <= 40) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 120) {
        // Scrolling down
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsNavVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isAnyMenuOpen]);

  // Hover handlers with debounce for desktop dropdowns
  const handleShopMouseEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setIsHampersMenuOpen(false);
    setIsCountryDropdownOpen(false);
    setIsUserMenuOpen(false);
    setIsShopMegaOpen(true);
  };

  const handleShopMouseLeave = () => {
    shopTimeoutRef.current = setTimeout(() => {
      setIsShopMegaOpen(false);
    }, 150);
  };

  const handleHampersMouseEnter = () => {
    if (hampersTimeoutRef.current) clearTimeout(hampersTimeoutRef.current);
    setIsShopMegaOpen(false);
    setIsCountryDropdownOpen(false);
    setIsUserMenuOpen(false);
    setIsHampersMenuOpen(true);
  };

  const handleHampersMouseLeave = () => {
    hampersTimeoutRef.current = setTimeout(() => {
      setIsHampersMenuOpen(false);
    }, 150);
  };

  const handleCountryMouseEnter = () => {
    if (countryTimeoutRef.current) clearTimeout(countryTimeoutRef.current);
    setIsShopMegaOpen(false);
    setIsHampersMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsCountryDropdownOpen(true);
  };

  const handleCountryMouseLeave = () => {
    countryTimeoutRef.current = setTimeout(() => {
      setIsCountryDropdownOpen(false);
    }, 150);
  };

  const handleUserMouseEnter = () => {
    if (userTimeoutRef.current) clearTimeout(userTimeoutRef.current);
    setIsShopMegaOpen(false);
    setIsHampersMenuOpen(false);
    setIsCountryDropdownOpen(false);
    setIsUserMenuOpen(true);
  };

  const handleUserMouseLeave = () => {
    userTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false);
    }, 150);
  };

  // Helper to resolve icon and emoji for any dynamic category
  const getCategoryMeta = (cat: any) => {
    const s = (cat.slug || cat.name || '').toLowerCase();
    if (s.includes('medical') || s.includes('health') || s.includes('bp') || s.includes('diabetes'))
      return { emoji: '🩺', icon: Activity };
    if (s.includes('mum') || s.includes('mother') || s.includes('women'))
      return { emoji: '👩', icon: Heart };
    if (s.includes('dad') || s.includes('father') || s.includes('men'))
      return { emoji: '👨', icon: UserCheck };
    if (s.includes('wedding') || s.includes('marriage'))
      return { emoji: '💍', icon: Sparkles };
    if (s.includes('anniversary') || s.includes('couple'))
      return { emoji: ' ', icon: HeartHandshake };
    if (s.includes('baby') || s.includes('new-mum') || s.includes('newborn'))
      return { emoji: '👶', icon: Baby };
    if (s.includes('celebrat') || s.includes('birthday') || s.includes('festiv'))
      return { emoji: '🎉', icon: PartyPopper };
    if (s.includes('gift') || s.includes('tradition'))
      return { emoji: '🎁', icon: Gift };
    if (s.includes('addon') || s.includes('add-on'))
      return { emoji: '✨', icon: Sparkles };
    return { emoji: '🛍️', icon: Package };
  };

  // Dynamically group database categories into CARE, CELEBRATE and OTHER columns
  const careCategories = useMemo(() => {
    const careList = categories.filter(
      (c) =>
        c.type === 'CARE' ||
        c.slug === 'medical-care' ||
        c.slug === 'for-mum' ||
        c.slug === 'for-dad' ||
        c.slug.includes('care')
    );
    if (careList.length > 0) {
      return careList.map((c) => {
        const meta = getCategoryMeta(c);
        return {
          label: c.name,
          icon: meta.icon,
          emoji: meta.emoji,
          path: `/category/${c.slug}`,
          desc: c.description || 'Clinical monitors & daily health aids',
        };
      });
    }
    return [
      { label: 'Medical Care', icon: Activity, emoji: '🩺', path: '/category/medical-care', desc: 'BP & Glucose monitors, clinical daily aids' },
      { label: 'For Mum', icon: Heart, emoji: '👩', path: '/category/for-mum', desc: 'Ayurvedic soaps, luxury towels, coffee treats' },
      { label: 'For Dad', icon: UserCheck, emoji: '👨', path: '/category/for-dad', desc: 'Kasavu Mundu, Wayanad coffee, diagnostic kits' },
    ];
  }, [categories]);

  const celebrateCategories = useMemo(() => {
    const celebList = categories.filter(
      (c) =>
        c.type === 'OCCASION' ||
        c.slug === 'wedding' ||
        c.slug === 'anniversary' ||
        c.slug === 'new-mum-baby' ||
        c.slug === 'celebrations'
    );
    if (celebList.length > 0) {
      return celebList.map((c) => {
        const meta = getCategoryMeta(c);
        return {
          label: c.name,
          icon: meta.icon,
          emoji: meta.emoji,
          path: `/category/${c.slug}`,
          desc: c.description || 'Celebrate life milestones & anniversaries',
        };
      });
    }
    return [
      { label: 'Wedding', icon: Sparkles, emoji: '💍', path: '/category/wedding', desc: 'Traditional Kerala Kasavu sets & brass gifts' },
      { label: 'Anniversary', icon: HeartHandshake, emoji: ' ', path: '/category/anniversary', desc: 'Romantic couple hampers & keepsake memories' },
      { label: 'New Mum & Baby', icon: Baby, emoji: '👶', path: '/category/new-mum-baby', desc: 'Organic muslin swaddles & postpartum recovery' },
      { label: 'Celebrations', icon: PartyPopper, emoji: '🎉', path: '/category/celebrations', desc: 'Festive Onam/Vishu, birthdays & milestones' },
    ];
  }, [categories]);

  const otherCategories = useMemo(
    () => [
      { label: 'Gifts', icon: Gift, emoji: '🎁', path: '/shop?tag=gift', desc: 'Curated artisanal & traditional Kerala items' },
      { label: 'All Products', icon: Package, emoji: '🛍️', path: '/shop', desc: 'Browse the entire healthcare & lifestyle catalog' },
      { label: 'Add-ons', icon: Sparkles, emoji: '✨', path: '/shop?type=addon', desc: 'Extra personal touches to append to any hamper' },
    ],
    []
  );

  // Care Hampers, Celebration Hampers, and Signature Hamper
  const careHampersList = useMemo(() => {
    const careList = hampers.filter(
      (h) =>
        h.slug.includes('essential-care') ||
        h.slug.includes('premium-care') ||
        h.hamperType === 'NORMAL' ||
        h.hamperType === 'PREMIUM'
    );
    return careList.length > 0 ? careList.slice(0, 2) : hampers.slice(0, 2);
  }, [hampers]);

  const celebrationHampersList = useMemo(() => {
    const celebList = hampers.filter((h) => h.slug.includes('anniversary') && !h.slug.includes('signature'));
    return celebList.length > 0 ? celebList.slice(0, 2) : hampers.slice(0, 2);
  }, [hampers]);

  const signatureHamper = useMemo(() => {
    return (
      hampers.find((h) => h.slug.includes('signature') || h.hamperType === 'SIGNATURE_ANNIVERSARY') ||
      hampers[0] || {
        name: 'NestCare Signature Anniversary',
        slug: 'nestcare-signature-anniversary',
        shortDescription: 'Kasavu Mundu & Saree, Teak frame, video QR',
      }
    );
  }, [hampers]);

  // Route active checks for bottom nav
  const isHomeActive = location.pathname === '/';
  const isShopActive =
    location.pathname.startsWith('/shop') ||
    location.pathname.startsWith('/category') ||
    location.pathname.startsWith('/product');
  const isHampersActive = location.pathname.startsWith('/hampers');
  const isBuildActive =
    location.pathname.startsWith('/custom-hamper') ||
    location.pathname.startsWith('/build-hamper');
  const isAccountActive =
    location.pathname.startsWith('/account') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/order-tracking' ||
    isMobileAccountSheetOpen;

  // Determine if bottom nav should be hidden (Checkout, Order Confirmation)
  const isBottomNavHidden =
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/order-success');

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Responsive: Compact on Mobile, Full on Desktop)           */}
      {/* ========================================================================= */}
      <header
        className={`sticky top-0 z-40 w-full transition-transform duration-300 ease-in-out ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full md:-translate-y-full'
        } ${
          isScrolled
            ? 'glass-header shadow-xs border-b border-gray-200/80 py-2 sm:py-2.5'
            : 'bg-white border-b border-gray-100 py-2 sm:py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-11">
            
            {/* ===================================================================== */}
            {/* LEFT: LOGO                                                           */}
            {/* ===================================================================== */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Logo />
              </div>
            </div>

            {/* ===================================================================== */}
            {/* DESKTOP CENTER NAVIGATION LINKS (HIDDEN ON MOBILE < LG)              */}
            {/* ===================================================================== */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" role="navigation" aria-label="Main Navigation">
              {/* Home */}
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'text-[#237A3B] bg-[#F1FAF3] font-semibold'
                      : 'text-gray-700 hover:text-[#237A3B] hover:bg-gray-50'
                  }`
                }
              >
                Home
              </NavLink>

              {/* Shop (Mega Menu Trigger) */}
              <div
                className="relative"
                onMouseEnter={handleShopMouseEnter}
                onMouseLeave={handleShopMouseLeave}
              >
                <button
                  onClick={() => setIsShopMegaOpen(!isShopMegaOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname.startsWith('/category') || location.pathname === '/shop' || isShopMegaOpen
                      ? 'text-[#237A3B] bg-[#F1FAF3] font-semibold'
                      : 'text-gray-700 hover:text-[#237A3B] hover:bg-gray-50'
                  }`}
                  aria-expanded={isShopMegaOpen}
                  aria-haspopup="true"
                >
                  <span>Shop</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isShopMegaOpen ? 'rotate-180 text-[#237A3B]' : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* SHOP MEGA MENU MODAL / DROPDOWN */}
                <AnimatePresence>
                  {isShopMegaOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full -left-20 xl:left-0 mt-2 w-[720px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-5 animate-fade-in"
                    >
                      <div className="grid grid-cols-3 gap-6">
                        {/* COLUMN 1: CARE */}
                        <div>
                          <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100 mb-2">
                            <span className="text-[11px] font-bold text-[#237A3B] uppercase tracking-wider">
                              CARE
                            </span>
                          </div>
                          <div className="space-y-1">
                            {careCategories.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsShopMegaOpen(false)}
                                className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F1FAF3] transition-colors"
                              >
                                <span className="text-base select-none mt-0.5">{item.emoji}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B] transition-colors">
                                    {item.label}
                                  </div>
                                  <div className="text-[11px] text-gray-500 line-clamp-1">{item.desc}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>

                        {/* COLUMN 2: CELEBRATE */}
                        <div>
                          <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100 mb-2">
                            <span className="text-[11px] font-bold text-[#237A3B] uppercase tracking-wider">
                              CELEBRATE
                            </span>
                          </div>
                          <div className="space-y-1">
                            {celebrateCategories.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsShopMegaOpen(false)}
                                className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F1FAF3] transition-colors"
                              >
                                <span className="text-base select-none mt-0.5">{item.emoji}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B] transition-colors">
                                    {item.label}
                                  </div>
                                  <div className="text-[11px] text-gray-500 line-clamp-1">{item.desc}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>

                        {/* COLUMN 3: OTHER */}
                        <div>
                          <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100 mb-2">
                            <span className="text-[11px] font-bold text-[#237A3B] uppercase tracking-wider">
                              OTHER
                            </span>
                          </div>
                          <div className="space-y-1">
                            {otherCategories.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsShopMegaOpen(false)}
                                className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F1FAF3] transition-colors"
                              >
                                <span className="text-base select-none mt-0.5">{item.emoji}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B] transition-colors">
                                    {item.label}
                                  </div>
                                  <div className="text-[11px] text-gray-500 line-clamp-1">{item.desc}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM BAR CTA */}
                      <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50 -mx-5 -mb-5 px-5 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <Truck className="w-3.5 h-3.5 text-[#237A3B]" />
                          <span>Direct delivery to loved ones in India with personal note & video card</span>
                        </div>
                        <Link
                          to="/shop"
                          onClick={() => setIsShopMegaOpen(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237A3B] hover:text-[#1c6330] group"
                        >
                          <span>View All Products</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hampers (Dropdown Trigger) */}
              <div
                className="relative"
                onMouseEnter={handleHampersMouseEnter}
                onMouseLeave={handleHampersMouseLeave}
              >
                <button
                  onClick={() => setIsHampersMenuOpen(!isHampersMenuOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname.startsWith('/hampers') || isHampersMenuOpen
                      ? 'text-[#237A3B] bg-[#F1FAF3] font-semibold'
                      : 'text-gray-700 hover:text-[#237A3B] hover:bg-gray-50'
                  }`}
                  aria-expanded={isHampersMenuOpen}
                  aria-haspopup="true"
                >
                  <span>Hampers</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isHampersMenuOpen ? 'rotate-180 text-[#237A3B]' : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* HAMPERS DROPDOWN */}
                <AnimatePresence>
                  {isHampersMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 mt-2 w-[540px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-5 animate-fade-in"
                    >
                      <div className="grid grid-cols-2 gap-5">
                        {/* LEFT COLUMN: CARE HAMPERS */}
                        <div>
                          <div className="text-[11px] font-bold text-[#237A3B] uppercase tracking-wider pb-1.5 border-b border-gray-100 mb-2">
                            CARE HAMPERS
                          </div>
                          <div className="space-y-2">
                            {careHampersList.map((h) => (
                              <Link
                                key={h.id || h.slug}
                                to={`/hampers/${h.slug}`}
                                onClick={() => setIsHampersMenuOpen(false)}
                                className="group block p-2 rounded-xl hover:bg-[#F1FAF3] transition-colors"
                              >
                                <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">
                                  {h.name}
                                </div>
                                <div className="text-[11px] text-gray-500 line-clamp-1">
                                  {h.shortDescription || 'Diagnostic essentials & nourishing care'}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: CELEBRATION HAMPERS */}
                        <div>
                          <div className="text-[11px] font-bold text-[#237A3B] uppercase tracking-wider pb-1.5 border-b border-gray-100 mb-2">
                            CELEBRATION HAMPERS
                          </div>
                          <div className="space-y-2">
                            {celebrationHampersList.map((h) => (
                              <Link
                                key={h.id || h.slug}
                                to={`/hampers/${h.slug}`}
                                onClick={() => setIsHampersMenuOpen(false)}
                                className="group block p-2 rounded-xl hover:bg-[#F1FAF3] transition-colors"
                              >
                                <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">
                                  {h.name}
                                </div>
                                <div className="text-[11px] text-gray-500 line-clamp-1">
                                  {h.shortDescription || 'Curated celebration gifts for parents & couples'}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SIGNATURE SECTION */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link
                          to={`/hampers/${signatureHamper.slug}`}
                          onClick={() => setIsHampersMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1FAF3] hover:bg-[#E3F5E8] border border-[#8BCF9B]/40 transition-colors group"
                        >
                          <div>
                            <div className="text-[10px] font-bold text-[#237A3B] uppercase tracking-wider">
                              SIGNATURE
                            </div>
                            <div className="text-xs font-bold text-gray-900 group-hover:text-[#237A3B]">
                              {signatureHamper.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {signatureHamper.shortDescription || 'Kasavu Mundu & Saree, Teak frame, video QR'}
                            </div>
                          </div>
                          <Sparkles className="w-4 h-4 text-[#237A3B]" />
                        </Link>
                      </div>

                      {/* BOTTOM CTA */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 text-center">
                        <Link
                          to="/hampers"
                          onClick={() => setIsHampersMenuOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#237A3B] hover:text-[#1c6330]"
                        >
                          <span>View All Hampers</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ✨ Build Your Own (Visually Emphasized Primary Action) */}
              <NavLink
                to="/custom-hamper"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#237A3B] bg-[#E3F5E8] border border-[#8BCF9B] shadow-xs'
                      : 'text-[#237A3B] bg-[#F1FAF3] hover:bg-[#E3F5E8] border border-[#8BCF9B]/50 hover:border-[#8BCF9B] shadow-xs'
                  }`
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-[#237A3B]" />
                <span>Build Your Own</span>
              </NavLink>
            </nav>

            {/* ===================================================================== */}
            {/* RIGHT ACTIONS: Mobile Currency | Search | Cart (Mobile + Desktop)     */}
            {/* ===================================================================== */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* 1. Mobile Country & Currency Selector Button (< lg) */}
              <button
                onClick={() => setIsCountryModalOpen(true)}
                className="flex lg:hidden items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 hover:border-[#8BCF9B] bg-white hover:bg-[#F1FAF3] text-xs font-semibold text-gray-700 transition-all shadow-2xs active:scale-95 shrink-0"
                title={`Shopping in ${countryConfig.name} (${countryConfig.currency})`}
                aria-label={`Current country & currency: ${countryConfig.name}, ${countryConfig.currency}. Tap to change.`}
              >
                <span className="text-sm select-none leading-none">{countryConfig.flag}</span>
                <span className="font-extrabold text-[#237A3B] text-xs leading-none">
                  {countryConfig.currency}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {/* 2. Search Button (Both Mobile & Desktop) */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1.5 shrink-0"
                title="Search products, hampers or care..."
                aria-label="Search products, hampers or care"
              >
                <Search className="w-5 h-5 sm:w-4 sm:h-4 text-gray-700" />
                <span className="hidden xl:inline text-xs text-gray-400 font-medium">Search...</span>
              </button>

              {/* 3. Country / Currency Selector (Desktop only) */}
              <div
                className="relative hidden lg:block"
                onMouseEnter={handleCountryMouseEnter}
                onMouseLeave={handleCountryMouseLeave}
              >
                <button
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-[#8BCF9B] bg-white hover:bg-[#F1FAF3] text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                  aria-label="Country and Currency Selector"
                  aria-expanded={isCountryDropdownOpen}
                >
                  <span className="text-sm select-none">{countryConfig.flag}</span>
                  <span className="font-bold text-[#237A3B]">{countryConfig.currency}</span>
                  <span className="text-[11px] text-gray-500 font-medium">({countryConfig.symbol.trim()})</span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                      isCountryDropdownOpen ? 'rotate-180 text-[#237A3B]' : ''
                    }`}
                  />
                </button>

                {/* COUNTRY DROPDOWN MENU */}
                <AnimatePresence>
                  {isCountryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-fade-in"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Select Shopping Currency
                      </div>
                      <div className="space-y-1">
                        {(Object.keys(COUNTRIES) as CountryCode[]).map((cCode) => {
                          const c = COUNTRIES[cCode];
                          const isSelected = country === cCode;
                          return (
                            <button
                              key={cCode}
                              onClick={() => {
                                setCountry(cCode);
                                setIsCountryDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                                isSelected
                                  ? 'bg-[#F1FAF3] text-[#237A3B] font-bold border border-[#8BCF9B]/40'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base select-none">{c.flag}</span>
                                <div>
                                  <div className="font-semibold text-gray-900 text-xs">{c.name}</div>
                                  <div className="text-[10px] text-gray-500">
                                    {c.currency} ({c.symbol.trim()})
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#237A3B]" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-1 pt-1.5 border-t border-gray-100 px-3 py-1 text-[10px] text-gray-400">
                        Delivery country is set at checkout.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Wishlist Quick Link (Desktop only) */}
              <Link
                to="/account?tab=wishlist"
                className="relative p-2 text-gray-600 hover:text-[#237A3B] hover:bg-gray-100 rounded-xl transition-colors hidden lg:flex"
                title="Saved Wishlist"
                aria-label="Wishlist"
              >
                <Heart className="w-4 h-4 text-gray-700" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#8BCF9B] text-[#237A3B] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* 4. Admin Quick Badge (Desktop Header) */}
              {isAdmin && (
                <Link
                  to="/admin/products"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs transition-colors shadow-2xs"
                  title="Direct to Products Management Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Admin Console</span>
                </Link>
              )}

              {/* 5. Account Dropdown (Desktop only) */}
              <div
                className="relative hidden lg:block"
                onMouseEnter={handleUserMouseEnter}
                onMouseLeave={handleUserMouseLeave}
              >
                {isAuthenticated ? (
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200 hover:border-[#8BCF9B] bg-white hover:bg-[#F1FAF3] text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                    aria-label="User Account"
                    aria-expanded={isUserMenuOpen}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#8BCF9B]/30 text-[#237A3B] font-bold flex items-center justify-center text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline max-w-[80px] truncate">{user?.name}</span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                        isUserMenuOpen ? 'rotate-180 text-[#237A3B]' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 hover:border-[#8BCF9B] bg-white hover:bg-[#F1FAF3] text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                    aria-label="Account Menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    <UserIcon className="w-4 h-4 text-gray-700" />
                    <span className="hidden sm:inline">Account</span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                        isUserMenuOpen ? 'rotate-180 text-[#237A3B]' : ''
                      }`}
                    />
                  </button>
                )}

                {/* ACCOUNT DROPDOWN MENU */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in"
                    >
                      {isAuthenticated ? (
                        <>
                          <div className="px-4 py-2 border-b border-gray-100">
                            <div className="font-bold text-xs text-gray-900">{user?.name}</div>
                            <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
                          </div>

                          {/* Admin Links (Only for Admins) */}
                          {isAdmin && (
                            <div className="p-1.5 bg-[#F1FAF3] border-b border-gray-100 space-y-1">
                              <Link
                                to="/admin/products"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#237A3B] hover:bg-[#E3F5E8] rounded-lg transition-colors"
                              >
                                <Package className="w-3.5 h-3.5 text-[#237A3B]" />
                                <span>Manage Products (+Add)</span>
                              </Link>
                              <Link
                                to="/admin"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[#E3F5E8] rounded-lg transition-colors"
                              >
                                <Layers className="w-3.5 h-3.5 text-gray-500" />
                                <span>Admin Dashboard</span>
                              </Link>
                            </div>
                          )}

                          <div className="py-1">
                            <Link
                              to="/account"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                              <span>My Account</span>
                            </Link>

                            <Link
                              to="/account?tab=orders"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                              <span>Orders</span>
                            </Link>

                            <Link
                              to="/account?tab=addresses"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Compass className="w-3.5 h-3.5 text-gray-400" />
                              <span>Addresses</span>
                            </Link>

                            <Link
                              to="/account?tab=wishlist"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Heart className="w-3.5 h-3.5 text-gray-400" />
                              <span>Wishlist ({wishlistCount})</span>
                            </Link>
                          </div>

                          <div className="border-t border-gray-100 pt-1">
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                logout();
                                navigate('/');
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left transition-colors"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Log Out</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-1">
                          <Link
                            to="/login"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-[#F1FAF3] hover:text-[#237A3B] transition-colors"
                          >
                            <UserIcon className="w-3.5 h-3.5 text-[#237A3B]" />
                            <span>Sign In</span>
                          </Link>

                          <Link
                            to="/register"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-400" />
                            <span>Create Account</span>
                          </Link>

                          <Link
                            to="/order-tracking"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100 mt-1 pt-2"
                          >
                            <Truck className="w-3.5 h-3.5 text-gray-400" />
                            <span>Track Order</span>
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 6. Cart Button (Both Mobile & Desktop) */}
              <button
                onClick={openCartDrawer}
                className="relative flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-semibold transition-all shadow-xs"
                aria-label={`Cart with ${itemCount} items`}
              >
                <ShoppingBag className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline sm:ml-1.5">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:static sm:ml-1.5 w-5 h-5 rounded-full bg-[#8BCF9B] text-[#237A3B] text-[11px] font-extrabold flex items-center justify-center border-2 border-white sm:border-0">
                    {itemCount}
                  </span>
                )}
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE FIXED BOTTOM NAVIGATION BAR (MOBILE VIEW ONLY < LG)             */}
      {/* ========================================================================= */}
      {!isBottomNavHidden && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#8BCF9B]/25 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-transform duration-300"
          role="navigation"
          aria-label="Mobile Bottom Navigation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-stretch">
            
            {/* 1. HOME */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-all group min-h-[48px] ${
                  isActive ? 'text-[#237A3B]' : 'text-gray-500 hover:text-gray-900'
                }`
              }
              aria-label="Home"
              aria-current={isHomeActive ? 'page' : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isHomeActive
                    ? 'bg-[#F1FAF3] text-[#237A3B] shadow-2xs'
                    : 'text-gray-500 group-hover:text-gray-900'
                }`}
              >
                <House className={`w-5 h-5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                  isHomeActive ? 'font-bold text-[#237A3B]' : 'font-medium text-gray-500'
                }`}
              >
                Home
              </span>
            </NavLink>

            {/* 2. SHOP */}
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-all group min-h-[48px] ${
                  isShopActive ? 'text-[#237A3B]' : 'text-gray-500 hover:text-gray-900'
                }`
              }
              aria-label="Shop catalog"
              aria-current={isShopActive ? 'page' : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isShopActive
                    ? 'bg-[#F1FAF3] text-[#237A3B] shadow-2xs'
                    : 'text-gray-500 group-hover:text-gray-900'
                }`}
              >
                <ShoppingBag className={`w-5 h-5 ${isShopActive ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                  isShopActive ? 'font-bold text-[#237A3B]' : 'font-medium text-gray-500'
                }`}
              >
                Shop
              </span>
            </NavLink>

            {/* 3. HAMPERS */}
            <NavLink
              to="/hampers"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-all group min-h-[48px] ${
                  isHampersActive ? 'text-[#237A3B]' : 'text-gray-500 hover:text-gray-900'
                }`
              }
              aria-label="Curated Hampers"
              aria-current={isHampersActive ? 'page' : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isHampersActive
                    ? 'bg-[#F1FAF3] text-[#237A3B] shadow-2xs'
                    : 'text-gray-500 group-hover:text-gray-900'
                }`}
              >
                <Gift className={`w-5 h-5 ${isHampersActive ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                  isHampersActive ? 'font-bold text-[#237A3B]' : 'font-medium text-gray-500'
                }`}
              >
                Hampers
              </span>
            </NavLink>

            {/* 4. BUILD */}
            <NavLink
              to="/custom-hamper"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-all group min-h-[48px] ${
                  isBuildActive ? 'text-[#237A3B]' : 'text-gray-500 hover:text-gray-900'
                }`
              }
              aria-label="Build Your Own Custom Hamper"
              aria-current={isBuildActive ? 'page' : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isBuildActive
                    ? 'bg-[#F1FAF3] text-[#237A3B] shadow-2xs'
                    : 'text-gray-500 group-hover:text-gray-900'
                }`}
              >
                <PackagePlus className={`w-5 h-5 ${isBuildActive ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                  isBuildActive ? 'font-bold text-[#237A3B]' : 'font-medium text-gray-500'
                }`}
              >
                Build
              </span>
            </NavLink>

            {/* 5. ACCOUNT */}
            <button
              onClick={() => setIsMobileAccountSheetOpen(true)}
              className={`flex flex-col items-center justify-center py-1 transition-all group min-h-[48px] ${
                isAccountActive ? 'text-[#237A3B]' : 'text-gray-500 hover:text-gray-900'
              }`}
              aria-label="Account and Profile"
              aria-expanded={isMobileAccountSheetOpen}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isAccountActive
                    ? 'bg-[#F1FAF3] text-[#237A3B] shadow-2xs'
                    : 'text-gray-500 group-hover:text-gray-900'
                }`}
              >
                <UserRound className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all ${
                  isAccountActive ? 'font-bold text-[#237A3B]' : 'font-medium text-gray-500'
                }`}
              >
                Account
              </span>
            </button>

          </div>
        </nav>
      )}

      {/* ========================================================================= */}
      {/* 3. MOBILE ACCOUNT BOTTOM SHEET                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMobileAccountSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileAccountSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Modal Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col z-10"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center font-bold">
                    <UserRound className="w-4 h-4 text-[#237A3B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">
                      {isAuthenticated ? 'My Account' : 'Welcome to Nest Care'}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {isAuthenticated ? user?.email : 'Send love and healthcare home  '}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileAccountSheetOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Close sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sheet Body */}
              <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(85vh-100px)]">
                {isAuthenticated ? (
                  /* ============================================================= */
                  /* AUTHENTICATED USER OPTIONS                                    */
                  /* ============================================================= */
                  <div className="space-y-2">
                    {/* User Profile Summary Card */}
                    <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#237A3B] text-white font-extrabold text-base flex items-center justify-center shadow-xs flex-shrink-0">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{user?.name}</h4>
                          <span className="text-xs text-gray-600 block truncate">{user?.email}</span>
                          {user?.phone && (
                            <span className="text-[11px] text-[#237A3B] font-semibold">{user.phone}</span>
                          )}
                        </div>
                      </div>
                      <Link
                        to="/account"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#8BCF9B] text-xs font-bold text-[#237A3B] hover:bg-[#237A3B] hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
                    </div>

                    {/* Admin Dashboard link (Admin role only - NOT switchable by normal users) */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 transition-all font-semibold text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-amber-700" />
                          <span>Admin Management Portal</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-600" />
                      </Link>
                    )}

                    {/* Menu Items Grid / List */}
                    <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden shadow-2xs">
                      {/* 1. My Profile */}
                      <Link
                        to="/account"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <UserRound className="w-4 h-4 text-[#237A3B]" />
                          <span>My Profile</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>

                      {/* 2. Orders */}
                      <Link
                        to="/account?tab=orders"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-[#237A3B]" />
                          <span>Orders & Deliveries</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>

                      {/* 3. Addresses */}
                      <Link
                        to="/account?tab=addresses"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#237A3B]" />
                          <span>Saved Addresses</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>

                      {/* 4. Wishlist */}
                      <Link
                        to="/account?tab=wishlist"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="w-4 h-4 text-[#237A3B]" />
                          <span>Saved Wishlist</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {wishlistCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8BCF9B]/40 text-[#237A3B] text-[10px] font-extrabold">
                              {wishlistCount}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>

                      {/* 5. Settings / Security */}
                      <Link
                        to="/account?tab=security"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-[#237A3B]" />
                          <span>Security & Password Settings</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>

                    {/* Currency selection on mobile */}
                    <button
                      onClick={() => {
                        setIsMobileAccountSheetOpen(false);
                        setIsCountryModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-[#237A3B]" />
                        <span>Shopping Currency</span>
                      </div>
                      <span className="font-bold text-[#237A3B]">
                        {countryConfig.flag} {countryConfig.currency} ({countryConfig.symbol.trim()})
                      </span>
                    </button>

                    {/* Logout Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setIsMobileAccountSheetOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out from Account</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ============================================================= */
                  /* UNLOGGED GUEST USER OPTIONS                                   */
                  /* ============================================================= */
                  <div className="space-y-4 py-2">
                    <div className="text-center space-y-1 py-1">
                      <p className="text-xs text-gray-600">
                        Sign in to access your orders, track active deliveries, and manage saved parent addresses.
                      </p>
                    </div>

                    {/* Auth Action Buttons */}
                    <div className="space-y-2.5">
                      <Link
                        to="/login"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="w-full py-3.5 bg-[#237A3B] hover:bg-[#1c6330] text-white rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                      >
                        <UserRound className="w-4 h-4" />
                        <span>Sign In to Your Account</span>
                      </Link>

                      <Link
                        to="/register"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="w-full py-3.5 bg-white border border-gray-200 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] text-gray-800 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="w-4 h-4 text-[#237A3B]" />
                        <span>Create New Account</span>
                      </Link>
                    </div>

                    {/* Track Order Direct Link */}
                    <div className="pt-2 border-t border-gray-100">
                      <Link
                        to="/order-tracking"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 hover:bg-[#E3F5E8] transition-colors text-xs font-semibold text-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="w-4 h-4 text-[#237A3B]" />
                          <div>
                            <span className="font-bold text-gray-900 block">Track Order</span>
                            <span className="text-[11px] text-gray-500">Live courier tracking with order number</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#237A3B]" />
                      </Link>
                    </div>

                    {/* Currency Selector on Mobile */}
                    <div>
                      <button
                        onClick={() => {
                          setIsMobileAccountSheetOpen(false);
                          setIsCountryModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-[#237A3B]" />
                          <span>Shopping Currency</span>
                        </div>
                        <span className="font-bold text-[#237A3B]">
                          {countryConfig.flag} {countryConfig.currency} ({countryConfig.symbol.trim()})
                        </span>
                      </button>
                    </div>

                    {/* Support Link */}
                    <div className="pt-1 text-center">
                      <Link
                        to="/contact"
                        onClick={() => setIsMobileAccountSheetOpen(false)}
                        className="text-[11px] text-gray-500 hover:text-[#237A3B] underline"
                      >
                        Need help? Contact NRI Care Support
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. MODALS (Country Selector & Fullscreen Mobile Search)                   */}
      {/* ========================================================================= */}
      <CountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
