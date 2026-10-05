import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export const CustomHamperBanner: React.FC = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#237A3B] via-[#1c6330] to-gray-950 text-white p-8 sm:p-12 shadow-xl">
          {/* Subtle Background Pattern */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-[#8BCF9B]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[#8BCF9B] text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Healthcare Hamper Studio</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Build Your Own Custom Healthcare Hamper
            </h2>

            <p className="text-xs sm:text-sm text-gray-200 font-normal leading-relaxed">
              Every family member has unique health requirements. Assemble a bespoke care box combining blood sugar testers, blood pressure monitors, eldercare supplies, and diabetic-safe treats.
            </p>

            {/* Quick 3-Step Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#8BCF9B] text-[#237A3B] font-bold text-xs flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Select Products</span>
                  <span className="text-gray-300 text-[11px]">Pick certified items</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#8BCF9B] text-[#237A3B] font-bold text-xs flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Live Summary</span>
                  <span className="text-gray-300 text-[11px]">Dynamic price calculation</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#8BCF9B] text-[#237A3B] font-bold text-xs flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Care Delivery</span>
                  <span className="text-gray-300 text-[11px]">Dispatched to loved ones</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <Link
                to="/custom-hamper"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#8BCF9B] hover:bg-[#78be88] text-[#1F2937] font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <span>Launch Hamper Builder</span>
                <ArrowRight className="w-4 h-4 text-[#237A3B]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
