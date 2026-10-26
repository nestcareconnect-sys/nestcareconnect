import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Heart,
  UserCheck,
  HeartHandshake,
  Baby,
  PartyPopper,
  Gift,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useCategories } from '../../hooks/useQueries';

const SLUG_METADATA: Record<string, { emoji: string; badge: string; icon: any }> = {
  'medical-care': { emoji: '🩺', badge: 'Clinical & Health', icon: Activity },
  'for-mum': { emoji: '👩', badge: 'Nurture & Love', icon: Heart },
  'for-dad': { emoji: '👨', badge: 'Comfort & Health', icon: UserCheck },
  'wedding': { emoji: '💍', badge: 'Grand Traditions', icon: Sparkles },
  'anniversary': { emoji: '❤️', badge: 'Couple Gifting', icon: HeartHandshake },
  'new-mum-baby': { emoji: '👶', badge: 'Newborn Care', icon: Baby },
  'celebrations': { emoji: '🎉', badge: 'Joyful Moments', icon: PartyPopper },
  'build-your-own': { emoji: '🎁', badge: 'Custom Made', icon: Gift },
};

export const ShopByCareGrid: React.FC = () => {
  const { data: dbCategories = [] } = useCategories();

  // Filter root categories from database and order them
  const categories = dbCategories.length > 0 ? dbCategories.slice(0, 8) : [];

  return (
    <section className="py-12 bg-gray-50/50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-2">
            <span>Shop by Occasion & Recipient</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
            How Would You Like to Send Care?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Choose a thoughtful category tailored for your loved ones back home in India.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {categories.map((cat) => {
            const meta = SLUG_METADATA[cat.slug] || {
              emoji: '💝',
              badge: cat.type === 'OCCASION' ? 'Occasion' : cat.type === 'RECIPIENT' ? 'Recipient' : 'Care & Gifting',
              icon: Gift,
            };
            const isCustom = cat.slug === 'build-your-own';
            const link = isCustom ? '/custom-hamper' : `/category/${cat.slug}`;

            return (
              <Link
                key={cat.id}
                to={link}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 p-3.5 sm:p-4 ${
                  isCustom
                    ? 'bg-gradient-to-br from-[#F1FAF3] to-white border-[#8BCF9B]'
                    : 'bg-white border-gray-200/80 hover:border-[#8BCF9B]'
                }`}
              >
                {/* Top: Badge & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl sm:text-2xl select-none">{meta.emoji}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCustom
                        ? 'bg-[#237A3B] text-white'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-[#F1FAF3] group-hover:text-[#237A3B]'
                    }`}
                  >
                    {meta.badge}
                  </span>
                </div>

                {/* Middle: Title & Subtitle */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#237A3B] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {cat.description || 'Thoughtfully curated for home.'}
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
