import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroSlide } from '../../types';
import { useHeroSlides } from '../../hooks/useQueries';
import { INITIAL_HERO_SLIDES } from '@/constants';

export const HeroSlider: React.FC = () => {
  const { data: slides = INITIAL_HERO_SLIDES as any } = useHeroSlides();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoplayRef = useRef<any>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Autoplay with pause on hover
  useEffect(() => {
    if (slides.length <= 1) return;
    autoplayRef.current = setInterval(nextSlide, 6000);
    return () => clearInterval(autoplayRef.current);
  }, [slides.length]);

  // Touch Swipe for Mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-950 select-none h-[80vh] min-h-[500px] max-h-[660px] md:h-[calc(100vh-68px)] md:min-h-[540px] md:max-h-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => clearInterval(autoplayRef.current)}
      onMouseLeave={() => {
        if (slides.length > 1) autoplayRef.current = setInterval(nextSlide, 6000);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id || currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Responsive Picture: Desktop 16:9 Landscape vs Mobile Portrait */}
          <picture className="w-full h-full block">
            {/* Mobile Portrait Image */}
            <source
              media="(max-width: 767px)"
              srcSet={currentSlide.mobileImage || currentSlide.desktopImage}
            />
            {/* Desktop Landscape Image */}
            <img
              src={currentSlide.desktopImage}
              alt={currentSlide.title}
              style={{ objectPosition: (currentSlide as any).objectPosition || 'center' }}
              className="w-full h-full object-cover transform scale-102 transition-transform duration-7000 ease-out"
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
            />
          </picture>

          {/* Clean Gradient Overlay for Readability (Preserves photography) */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-transparent to-transparent md:hidden" />

          {/* Slide Text Content Container */}
          <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="max-w-xl lg:max-w-2xl space-y-4 md:space-y-6"
            >
              {currentSlide.badge && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#8BCF9B]/20 border border-[#8BCF9B]/40 text-[#8BCF9B] text-xs font-semibold backdrop-blur-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{currentSlide.badge}</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                {currentSlide.title}
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-lg">
                {currentSlide.subtitle}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  to={currentSlide.ctaUrl || '/hampers'}
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-[#8BCF9B] hover:bg-[#78be88] text-[#1F2937] font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-98"
                >
                  <span>{currentSlide.ctaText || 'Explore Hampers'}</span>
                  <ArrowRight className="w-4 h-4 text-[#237A3B]" />
                </Link>

                <Link
                  to="/custom-hamper"
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm backdrop-blur-xs border border-white/25 transition-all duration-200 transform active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-[#8BCF9B]" />
                  <span>Build Custom Hamper</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Manual Navigation Chevrons (Desktop) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Hero Slide"
            className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white items-center justify-center backdrop-blur-xs border border-white/15 transition-all shadow-md active:scale-95 z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Hero Slide"
            className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white items-center justify-center backdrop-blur-xs border border-white/15 transition-all shadow-md active:scale-95 z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator (Inside hero at bottom) */}
          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to hero slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-8 bg-[#8BCF9B] shadow-xs'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
