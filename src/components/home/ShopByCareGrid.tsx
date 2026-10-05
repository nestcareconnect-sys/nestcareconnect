import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Heart,
  UserCheck,
  Sparkles,
  HeartHandshake,
  Baby,
  PartyPopper,
  Gift,
  ArrowRight,
} from 'lucide-react';

const SHOP_BY_ITEMS = [
  {
    id: 'cat-medical-care',
    name: 'Medical Care',
    slug: 'medical-care',
    emoji: '🩺',
    icon: Activity,
    badge: 'Clinical & Health',
    subtitle: 'Monitors, Strips & Daily Comfort',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    link: '/category/medical-care',
  },
  {
    id: 'cat-for-mum',
    name: 'For Mum',
    slug: 'for-mum',
    emoji: '👩',
    icon: Heart,
    badge: 'Nurture & Love',
    subtitle: 'Ayurveda, Kasavu Sarees & Care',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    link: '/category/for-mum',
  },
  {
    id: 'cat-for-dad',
    name: 'For Dad',
    slug: 'for-dad',
    emoji: '👨',
    icon: UserCheck,
    badge: 'Comfort & Health',
    subtitle: 'Kasavu Mundu, Coffee & Monitors',
    image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=600&q=80',
    link: '/category/for-dad',
  },
  {
    id: 'cat-wedding',
    name: 'Wedding',
    slug: 'wedding',
    emoji: '💍',
    icon: Sparkles,
    badge: 'Grand Traditions',
    subtitle: 'Heirloom Brass & Gold Borders',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    link: '/category/wedding',
  },
  {
    id: 'cat-anniversary',
    name: 'Anniversary',
    slug: 'anniversary',
    emoji: '❤️',
    icon: HeartHandshake,
    badge: 'Couple Gifting',
    subtitle: 'Florals, Mugs & Video Messages',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    link: '/category/anniversary',
  },
  {
    id: 'cat-new-mum-baby',
    name: 'New Mum & Baby',
    slug: 'new-mum-baby',
    emoji: '👶',
    icon: Baby,
    badge: 'Newborn Care',
    subtitle: 'Organic Swaddles & Recovery',
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80',
    link: '/category/new-mum-baby',
  },
  {
    id: 'cat-celebrations',
    name: 'Celebrations',
    slug: 'celebrations',
    emoji: '🎉',
    icon: PartyPopper,
    badge: 'Joyful Moments',
    subtitle: 'Birthdays, Onam & Family Milestones',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    link: '/category/celebrations',
  },
  {
    id: 'cat-build-your-own',
    name: 'Build Your Own',
    slug: 'build-your-own',
    emoji: '✨',
    icon: Gift,
    badge: 'Custom Made',
    subtitle: 'Select exact items & personalize',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    link: '/custom-hamper',
    highlight: true,
  },
];

export const ShopByCareGrid: React.FC = () => {
  return (
    <section className="py-12 bg-gray-50/50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-2">
            <span>✨ Shop by Occasion & Recipient</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
            How Would You Like to Send Care?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Choose a thoughtful category tailored for your loved ones back home in India.
          </p>
        </div>

        {/* Categories Grid (Responsive horizontal scroll on small mobile, compact grid on tablet/desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {SHOP_BY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.link}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 p-3.5 sm:p-4 ${
                  item.highlight
                    ? 'bg-gradient-to-br from-[#F1FAF3] to-white border-[#8BCF9B]'
                    : 'bg-white border-gray-200/80 hover:border-[#8BCF9B]'
                }`}
              >
                {/* Top: Badge & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl sm:text-2xl select-none">{item.emoji}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.highlight
                        ? 'bg-[#237A3B] text-white'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-[#F1FAF3] group-hover:text-[#237A3B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                {/* Middle: Title & Subtitle */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#237A3B] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                {/* Bottom: Action Arrow */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-[#237A3B]">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
