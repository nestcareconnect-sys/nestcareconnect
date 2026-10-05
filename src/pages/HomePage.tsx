import React from 'react';
import { SEO } from '../components/common/SEO';
import { HeroSlider } from '../components/home/HeroSlider';
import { ShopByCareGrid } from '../components/home/ShopByCareGrid';
import { SendLoveSection } from '../components/home/SendLoveSection';
import { AddCareSection } from '../components/home/AddCareSection';
import { CustomHamperBanner } from '../components/home/CustomHamperBanner';
import { AddOnsSection } from '../components/home/AddOnsSection';
import { ArrangeCareSection } from '../components/home/ArrangeCareSection';
import { AboutBrandSection } from '../components/home/AboutBrandSection';
import { TrustSection } from '../components/home/TrustSection';

export const HomePage: React.FC = () => {
  return (
    <>
      <SEO
        title="Nest Care Connect | Send Love Home ❤️ | Gifting & Care for Parents"
        description="Helping families living overseas care for their parents back home. Send medical monitors, bespoke hampers, traditional Kerala attire, and personal family video greetings to India, UAE & USA."
      />

      <div className="space-y-0">
        {/* 1. Hero Slider (Send Love Home, Care for Mum & Dad, Celebrate Together, Build Your Own) */}
        <HeroSlider />

        {/* 2. Shop by Occasion / Care Type (8 Dynamic Category Cards) */}
        <ShopByCareGrid />

        {/* 3. Send Love (Handpicked Hampers & Gifts) */}
        <SendLoveSection />

        {/* 4. Care Products (Medical, Mobility & Personal-Care Products) */}
        <AddCareSection />

        {/* 5. Build Your Own Hamper Banner */}
        <CustomHamperBanner />

        {/* 6. Optional Add-ons (Personal Care, Medical & Mobility, Gift & Lifestyle) */}
        <AddOnsSection />

        {/* 7. Arrange Care (Support Upon Request) */}
        <ArrangeCareSection />

        {/* 8. Short Brand Message (Because sometimes, love needs a little help reaching home) */}
        <AboutBrandSection />

        {/* 9. Small Trust & Guarantee Section */}
        <TrustSection />
      </div>
    </>
  );
};
