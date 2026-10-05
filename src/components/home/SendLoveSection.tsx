import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Sparkles, Gift } from 'lucide-react';
import { Hamper } from '../../types';
import { HamperCard } from '../hamper/HamperCard';
import { hampersApi } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { INITIAL_HAMPERS } from '../../constants';

export const SendLoveSection: React.FC = () => {
  const { data: hampers = INITIAL_HAMPERS } = useQuery<Hamper[]>({
    queryKey: ['hampers', 'featured'],
    queryFn: async () => {
      try {
        const res = await hampersApi.getAll({ featured: true });
        if (res.data?.success && res.data.data?.length > 0) {
          return res.data.data;
        }
      } catch {}
      return INITIAL_HAMPERS;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-14 sm:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-2.5">
              <Gift className="w-3.5 h-3.5 text-[#237A3B]" />
              <span>🎁 SEND LOVE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1F2937] tracking-tight">
              Handpicked Hampers & Gifts
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Thoughtfully chosen and beautifully put together for the people who matter most. Delivered to India with personalized message cards and video greetings.
            </p>
          </div>

          <Link
            to="/hampers"
            className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-xl bg-[#F1FAF3] hover:bg-[#E3F5E8] text-[#237A3B] text-xs sm:text-sm font-bold border border-[#8BCF9B]/40 transition-all"
          >
            <span>Explore All Hampers</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hampers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hampers.slice(0, 3).map((hamper) => (
            <HamperCard key={hamper.id} hamper={hamper} />
          ))}
        </div>

        {/* Highlight Banner for Anniversary & Signature Gifting */}
        {hampers.length > 3 && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hampers.slice(3, 5).map((hamper) => (
              <HamperCard key={hamper.id} hamper={hamper} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
