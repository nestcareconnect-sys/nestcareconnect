import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, ArrowRight } from 'lucide-react';
import { Hamper } from '../../types';
import { HamperCard } from '../hamper/HamperCard';
import { hampersApi } from '../../services/api';
import { INITIAL_HAMPERS } from '@/constants';

export const HampersSection: React.FC = () => {
  const [hampers, setHampers] = useState<Hamper[]>([]);
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

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-[#237A3B] uppercase tracking-wider bg-[#F1FAF3] px-3 py-1 rounded-full border border-[#8BCF9B]/40 inline-flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#237A3B]" /> Curated Care Packages
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              Predefined Healthcare Hampers
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Thoughtfully bundled testing devices and wellness essentials for your loved ones.
            </p>
          </div>
          <Link
            to="/hampers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237A3B] hover:text-[#1c6330] hover:underline"
          >
            Compare All Hampers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hampers 3-column Grid (Normal, Premium, Premium Plus) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hampers.slice(0, 3).map((hamper) => (
            <HamperCard key={hamper.id} hamper={hamper} />
          ))}
        </div>
      </div>
    </section>
  );
};
