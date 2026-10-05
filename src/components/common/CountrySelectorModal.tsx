import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Globe } from 'lucide-react';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { CountryCode } from '../../types';

interface CountrySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({ isOpen, onClose }) => {
  const { country, setCountry } = useCountryCurrency();

  const handleSelect = (code: CountryCode) => {
    setCountry(code);
    onClose();
  };

  const countriesList: {
    code: CountryCode;
    name: string;
    currency: string;
    symbol: string;
    flag: string;
    subtext: string;
  }[] = [
    {
      code: 'IN',
      name: 'India',
      currency: 'INR',
      symbol: '₹',
      flag: '🇮🇳',
      subtext: 'Direct delivery across all Indian states with local payment options',
    },
    {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      symbol: '$',
      flag: '🇺🇸',
      subtext: 'Fast international checkout in USD for overseas family members',
    },
    {
      code: 'AE',
      name: 'United Arab Emirates',
      currency: 'AED',
      symbol: 'AED د.إ',
      flag: '🇦🇪',
      subtext: 'Seamless payments in AED for Gulf & Dubai residents',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col z-10 max-h-[90vh]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-[#F1FAF3]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#237A3B] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm sm:text-base tracking-tight">
                    Choose your country
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Select your preferred currency & destination
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Country Options List */}
            <div className="p-4 sm:p-6 space-y-2.5 overflow-y-auto">
              {countriesList.map((item) => {
                const isSelected = country === item.code;

                return (
                  <button
                    key={item.code}
                    onClick={() => handleSelect(item.code)}
                    className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left group ${
                      isSelected
                        ? 'border-[#237A3B] bg-[#F1FAF3] shadow-xs ring-1 ring-[#237A3B]/30'
                        : 'border-gray-200 hover:border-[#8BCF9B] hover:bg-gray-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-3xl select-none shrink-0">{item.flag}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          {isSelected && (
                            <span className="text-[10px] font-extrabold bg-[#237A3B] text-white px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 font-semibold mt-0.5">
                          <span className="text-[#237A3B] font-extrabold">{item.currency}</span>{' '}
                          <span className="text-gray-500 font-normal">({item.symbol})</span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          {item.subtext}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#237A3B] flex items-center justify-center text-white shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-[#8BCF9B] transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Note */}
            <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>✈️ Active in India, UAE & USA</span>
              <span className="font-semibold text-[#237A3B]">Instant Conversion</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
