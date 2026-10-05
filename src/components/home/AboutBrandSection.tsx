import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Globe, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { BRAND_TAGLINES } from '../../constants';

export const AboutBrandSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-20 bg-gray-50/60 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-4">
            <Heart className="w-3.5 h-3.5 text-[#237A3B] fill-current" />
            <span>Send Love Home ❤️</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] tracking-tight">
            NESTCARE CONNECT
          </h2>

          <p className="text-lg sm:text-xl font-medium text-[#237A3B] mt-2">
            "Because sometimes, love needs a little help reaching home."
          </p>

          <div className="mt-6 space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed text-center sm:text-left bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs">
            <p className="font-semibold text-gray-900">
              Living overseas doesn’t mean you have to miss the special moments.
            </p>
            <p>
              Whether you’re sending care to your elderly parents, celebrating a wedding anniversary, welcoming a new mum or simply saying <span className="italic font-medium text-[#237A3B]">"I’m thinking of you"</span>, Nest Care helps you send something beautiful, thoughtful and truly meaningful to the people you love.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-center font-bold text-xs sm:text-sm text-gray-800">
              <div className="p-3 bg-[#F1FAF3] rounded-2xl border border-[#8BCF9B]/30">
                <span className="block text-[#237A3B] text-base mb-0.5">1. Choose</span>
                <span>Select curated hamper or build your own</span>
              </div>
              <div className="p-3 bg-[#F1FAF3] rounded-2xl border border-[#8BCF9B]/30">
                <span className="block text-[#237A3B] text-base mb-0.5">2. Personalise</span>
                <span>Add 50-word message, photos & video QR</span>
              </div>
              <div className="p-3 bg-[#F1FAF3] rounded-2xl border border-[#8BCF9B]/30">
                <span className="block text-[#237A3B] text-base mb-0.5">3. Delivered</span>
                <span>Hand-packed doorstep delivery in India</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#237A3B] hover:text-[#1c6330] hover:underline"
            >
              <span>Read our full story & overseas mission</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
