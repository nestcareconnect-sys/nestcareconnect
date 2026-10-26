import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, RotateCcw, AlertCircle, Package } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { HamperCard } from '../components/hamper/HamperCard';
import { useHampers } from '../hooks/useQueries';

export const HampersPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const { data: hampers = [], isLoading, isError, refetch } = useHampers();

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

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 animate-pulse">
                  <div className="aspect-4/3 bg-gray-100 rounded-2xl w-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3.5 bg-gray-100 rounded w-full" />
                  </div>
                  <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                    <div className="h-9 w-24 bg-gray-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State with Retry Button */}
          {isError && (
            <div className="bg-white rounded-3xl border border-red-100 p-12 text-center space-y-4 shadow-xs">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-bold text-lg text-gray-900">Couldn't load hampers catalog</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Unable to fetch hampers from the database. Please check your connection and try again.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1c6330] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && filteredHampers.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">No hampers found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  No care hampers match the selected filter category.
                </p>
              </div>
              <button
                onClick={() => setSelectedType('ALL')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#237A3B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1c6330] transition-colors"
              >
                <span>View All Hampers</span>
              </button>
            </div>
          )}

          {/* Hampers Grid */}
          {!isLoading && !isError && filteredHampers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredHampers.map((hamper) => (
                <HamperCard key={hamper.id} hamper={hamper} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
