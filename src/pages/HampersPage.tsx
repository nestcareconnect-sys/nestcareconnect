import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { HamperCard } from '../components/hamper/HamperCard';
import { Hamper } from '../types';
import { hampersApi } from '../services/api';
import { INITIAL_HAMPERS } from '@/constants';

export const HampersPage: React.FC = () => {
  const [hampers, setHampers] = useState<Hamper[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    hampersApi
      .list()
      .then((res) => {
        if (res.data?.success && res.data.data?.length > 0) {
          setHampers(res.data.data);
        } else {
          setHampers(INITIAL_HAMPERS as any);
        }
      })
      .catch(() => {
        setHampers(INITIAL_HAMPERS as any);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredHampers =
    selectedType === 'ALL'
      ? hampers
      : hampers.filter((h) => h.hamperType === selectedType);

  return (
    <>
      <SEO
        title="Curated Healthcare Hampers | Nest Care Connect"
        description="Choose from Normal, Premium, and Premium Plus care packages for diabetic care, blood pressure monitoring, and holistic elderly wellness."
      />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumbs */}
          <Breadcrumbs items={[{ label: 'Healthcare Hampers' }]} />

          {/* Banner */}
          <div className="bg-gradient-to-br from-[#237A3B] to-[#1c6330] rounded-3xl p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[#8BCF9B] text-xs font-semibold backdrop-blur-xs">
                <Gift className="w-3.5 h-3.5" /> Curated By Healthcare Experts
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Curated Healthcare & Wellness Hampers
              </h1>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                Predefined sets tailored for daily testing, cardiovascular tracking, and nutritional wellness. Sent directly in signature wooden keepsake boxes.
              </p>
            </div>

            <Link
              to="/custom-hamper"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#8BCF9B] hover:bg-[#78be88] text-[#1F2937] font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all self-start md:self-auto"
            >
              <Sparkles className="w-4 h-4 text-[#237A3B]" />
              <span>Or Build Your Own Custom Hamper</span>
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { label: 'All Hampers', value: 'ALL' },
              { label: 'Normal (Essential Care)', value: 'NORMAL' },
              { label: 'Premium (Health Shield)', value: 'PREMIUM' },
              { label: 'Premium Plus (Complete Care)', value: 'PREMIUM_PLUS' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedType(tab.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedType === tab.value
                    ? 'bg-[#237A3B] text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Hampers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredHampers.map((hamper) => (
              <HamperCard key={hamper.id} hamper={hamper} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
