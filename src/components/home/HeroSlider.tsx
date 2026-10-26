import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroSlide } from '../../types';
import { useHeroSlides } from '../../hooks/useQueries';
import { getHeroSlideImageUrl } from '../../utils/imageUrl';

export const HeroSlider: React.FC = () => {
  const navigate = useNavigate();
  const { data: slides = [] } = useHeroSlides();
  
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

  // Keep currentIndex in bounds if slides change dynamically
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

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
  if (!currentSlide) return null;

  const title = currentSlide.title?.trim();
  const description = (currentSlide.description || currentSlide.subtitle)?.trim();
  const badge = currentSlide.badge?.trim();
  const buttonText = (currentSlide.buttonText || currentSlide.ctaText)?.trim();
  const destinationUrl = (currentSlide.destinationUrl || currentSlide.ctaUrl)?.trim();
  const hasLink = currentSlide.linkType !== 'NONE' && Boolean(destinationUrl);
  const isExternal = Boolean(destinationUrl && (destinationUrl.startsWith('http://') || destinationUrl.startsWith('https://')));

  const rawDesktop = currentSlide.desktopImage || currentSlide.bannerImageUrl || '';
  const rawMobile = currentSlide.mobileImage || currentSlide.mobileImageUrl || rawDesktop;
  const desktopImg = getHeroSlideImageUrl(rawDesktop, currentSlide.id, currentSlide.updatedAt);
  const mobileImg = getHeroSlideImageUrl(rawMobile, currentSlide.id, currentSlide.updatedAt, true);
  const fallbackImg = getHeroSlideImageUrl('', currentSlide.id);
  const fallbackMobileImg = getHeroSlideImageUrl('', currentSlide.id, null, true);

  const handleBannerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (!hasLink || !destinationUrl) return;

    if (isExternal) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(destinationUrl);
    }
  };

  const hasTextContent = Boolean(title || description || badge || buttonText);

  return (
    <div
      className={`relative w-full overflow-hidden bg-gray-950 select-none h-[82vh] min-h-[520px] max-h-[720px] md:h-[calc(100vh-68px)] md:min-h-[540px] md:max-h-none ${
        hasLink ? 'cursor-pointer' : ''
      }`}
      onClick={handleBannerClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => clearInterval(autoplayRef.current)}
      onMouseLeave={() => {
        if (slides.length > 1) autoplayRef.current = setInterval(nextSlide, 6000);
      }}
    >
      {/* Floating Slide Counter for Mobile */}
      {slides.length > 1 && (
        <div className="md:hidden absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold tracking-wider shadow-lg">
          <span className="text-[#8BCF9B]">{String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-white/40">/</span>
          <span className="text-white/70">{String(slides.length).padStart(2, '0')}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id || currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Responsive Picture: Desktop 16:9 Landscape vs Mobile 9:16 Portrait */}
          <picture className="w-full h-full block">
            {/* Mobile Portrait Image */}
            <source
              media="(max-width: 767px)"
              srcSet={mobileImg}
            />
            {/* Desktop Landscape Image */}
            <img
              src={desktopImg}
              alt={title || 'Nest Care Connect'}
              style={{ objectPosition: (currentSlide as any).objectPosition || 'center' }}
              className="w-full h-full object-cover transform scale-102 transition-transform duration-7000 ease-out"
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              onError={(e) => {
                const target = e.currentTarget;
                const isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;
                const appropriateFallback = isMobileView ? fallbackMobileImg : fallbackImg;
                if (target.src !== appropriateFallback) {
                  target.src = appropriateFallback;
                }
              }}
            />
          </picture>

          {/* Clean Gradient Overlay for Readability (Preserves photography) */}
          {hasTextContent && (
            <>
              {/* Desktop lateral vignette */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/45 to-transparent pointer-events-none" />

              {/* Mobile bottom-to-top vignette: keeps top 55% crisp while guaranteeing text legibility */}
              <div className="md:hidden absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/75 via-45% to-transparent pointer-events-none" />

              {/* Mobile subtle top vignette for counter contrast */}
              <div className="md:hidden absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-gray-950/60 to-transparent pointer-events-none" />
            </>
          )}

          {/* Slide Text Content Container */}
          {hasTextContent && (
            <div className="absolute inset-0 max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 flex flex-col justify-end pb-14 sm:pb-16 md:justify-center md:pb-0 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 pointer-events-auto"
              >
                {badge && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8BCF9B]/20 border border-[#8BCF9B]/40 text-[#8BCF9B] text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{badge}</span>
                  </div>
                )}

                {title && (
                  <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                    {title}
                  </h1>
                )}

                {description && (
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-200/95 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none max-w-lg drop-shadow-xs">
                    {description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-row items-center gap-2.5 sm:gap-4">
                  {buttonText && hasLink && destinationUrl && (
                    isExternal ? (
                      <a
                        href={destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#8BCF9B] hover:bg-[#78be88] text-[#1F2937] font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-95"
                      >
                        <span>{buttonText}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#237A3B]" />
                      </a>
                    ) : (
                      <Link
                        to={destinationUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#8BCF9B] hover:bg-[#78be88] text-[#1F2937] font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-95"
                      >
                        <span>{buttonText}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#237A3B]" />
                      </Link>
                    )
                  )}

                  <Link
                    to="/custom-hamper"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/25 transition-all duration-200 transform active:scale-95"
                  >
                    <span>Build Custom</span>
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Manual Navigation Chevrons (Desktop) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous Hero Slide"
            className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white items-center justify-center backdrop-blur-xs border border-white/15 transition-all shadow-md active:scale-95 z-20 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next Hero Slide"
            className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white items-center justify-center backdrop-blur-xs border border-white/15 transition-all shadow-md active:scale-95 z-20 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator (Inside hero at bottom) */}
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to hero slide ${idx + 1}`}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 sm:w-8 bg-[#8BCF9B] shadow-xs'
                    : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
