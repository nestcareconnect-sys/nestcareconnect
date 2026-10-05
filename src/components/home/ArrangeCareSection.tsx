import React from 'react';
import { Link } from 'react-router-dom';
import { Home, MessageSquare, Phone, ArrowRight } from 'lucide-react';

export const ArrangeCareSection: React.FC = () => {
  return (
    <section className="py-12 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F1FAF3] via-[#E8F7EC] to-[#F1FAF3] border border-[#8BCF9B]/40 p-6 sm:p-10 lg:p-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#8BCF9B]/50 text-[#237A3B] text-xs font-bold tracking-wide uppercase mb-3">
              <Home className="w-3.5 h-3.5 text-[#237A3B]" />
              <span>🏠 ARRANGE CARE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
              Support Upon Request
            </h2>

            <p className="text-sm sm:text-base text-gray-600 mt-2.5 leading-relaxed">
              Need something extra for your loved one? Contact us and we’ll do our best to help arrange suitable support based on your needs, special requirements, and location in India.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contact Our Concierge</span>
              </Link>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold border border-gray-200 transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[#237A3B]" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
