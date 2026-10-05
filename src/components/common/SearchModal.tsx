import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, ArrowLeft, Package, Gift, FolderTree, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../services/api';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { getProductImageUrl, getHamperImageUrl } from '../../utils/imageUrl';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { formatPrice, calculateProductPrice, calculateHamperPrice } = useCountryCurrency();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    products: any[];
    categories: any[];
    hampers: any[];
    correctedQuery?: string | null;
  }>({ products: [], categories: [], hampers: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ncc_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults({ products: [], categories: [], hampers: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], categories: [], hampers: [] });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchApi.search(query.trim());
        if (!controller.signal.aborted && res.data?.success && res.data.data) {
          setResults(res.data.data);
        }
      } catch {
        // Silent fallback
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter((s) => s.toLowerCase() !== searchTerm.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('ncc_recent_searches', JSON.stringify(updated));
  };

  const handleSelectProduct = (slug: string) => {
    saveRecentSearch(query || slug);
    onClose();
    navigate(`/product/${slug}`);
  };

  const handleSelectHamper = (slug: string) => {
    saveRecentSearch(query || slug);
    onClose();
    navigate(`/hampers/${slug}`);
  };

  const handleSelectCategory = (slug: string) => {
    saveRecentSearch(query || slug);
    onClose();
    navigate(`/category/${slug}`);
  };

  const handleQuickSuggestion = (term: string) => {
    setQuery(term);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('ncc_recent_searches');
  };

  const hasResults =
    results.products.length > 0 || results.categories.length > 0 || results.hampers.length > 0;

  const popularSearches = [
    'BP Monitor',
    'Glucose Monitor',
    'Essential Care',
    'Anniversary',
    'Diapers',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center md:pt-16 bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.18 }}
            className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center px-4 py-3.5 border-b border-gray-100 bg-white">
              <button
                onClick={onClose}
                className="p-1.5 -ml-1 mr-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 sm:hidden flex items-center gap-1 text-xs font-semibold"
                aria-label="Back to page"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Search</span>
              </button>

              <Search className="w-5 h-5 text-[#237A3B] hidden sm:block ml-2 mr-3 flex-shrink-0" />
              
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, hampers or care..."
                className="w-full text-sm sm:text-base bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium"
                aria-label="Search catalog"
              />

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 mr-2"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onClose}
                className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                title="Close (Esc)"
              >
                ESC
              </button>
            </div>

            {/* Typo Correction Banner */}
            {results.correctedQuery && (
              <div className="px-5 py-2 bg-[#F1FAF3] border-b border-[#8BCF9B]/40 flex items-center gap-2 text-xs text-[#237A3B]">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[#237A3B]" />
                <span>
                  Showing results for <span className="font-bold underline">{results.correctedQuery}</span> (corrected from "{query}")
                </span>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Default / Initial State */}
              {!query.trim() && (
                <div className="space-y-5">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" /> Recent Searches
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-[11px] text-gray-400 hover:text-red-600 underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleQuickSuggestion(term)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#F1FAF3] hover:text-[#237A3B] text-xs font-medium text-gray-700 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Popular Searches
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleQuickSuggestion(s)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] hover:text-[#237A3B] text-xs font-semibold text-gray-700 transition-all flex items-center gap-1.5"
                        >
                          <Search className="w-3 h-3 text-[#237A3B]" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Looking for bespoke gifts?</span>
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/custom-hamper');
                      }}
                      className="text-[#237A3B] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ Build Your Own Hamper</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="py-12 flex items-center justify-center text-xs sm:text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-[#237A3B] border-t-transparent rounded-full animate-spin mr-2.5" />
                  Searching healthcare & gifting catalog...
                </div>
              )}

              {/* Results List */}
              {!isLoading && query.trim() && hasResults && (
                <div className="space-y-5">
                  {/* Categories */}
                  {results.categories.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-[#237A3B]" /> Categories
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {results.categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat.slug)}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] transition-all text-left"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-xs text-gray-900 truncate">{cat.name}</div>
                              {cat.description && (
                                <div className="text-[11px] text-gray-500 line-clamp-1">{cat.description}</div>
                              )}
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hampers */}
                  {results.hampers.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[#237A3B]" /> Curated Hampers
                      </span>
                      <div className="space-y-2">
                        {results.hampers.map((hamper) => {
                          const price = calculateHamperPrice(hamper);
                          return (
                            <button
                              key={hamper.id}
                              onClick={() => handleSelectHamper(hamper.slug)}
                              className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] transition-all text-left"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <img
                                  src={getHamperImageUrl(hamper.images?.[0], hamper.updatedAt)}
                                  alt={hamper.name}
                                  className="w-11 h-11 rounded-lg object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-gray-900 truncate">{hamper.name}</div>
                                  <div className="text-[11px] text-gray-500 line-clamp-1">{hamper.shortDescription}</div>
                                </div>
                              </div>
                              <span className="font-bold text-xs text-[#237A3B] flex-shrink-0">{formatPrice(price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {results.products.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#237A3B]" /> Products & Add-ons
                      </span>
                      <div className="space-y-2">
                        {results.products.map((prod) => {
                          const { price } = calculateProductPrice(prod);
                          return (
                            <button
                              key={prod.id}
                              onClick={() => handleSelectProduct(prod.slug)}
                              className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-gray-100 hover:border-[#8BCF9B] hover:bg-[#F1FAF3] transition-all text-left"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <img
                                  src={getProductImageUrl(prod.images?.[0], prod.updatedAt)}
                                  alt={prod.name}
                                  className="w-11 h-11 rounded-lg object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-gray-900 truncate">{prod.name}</div>
                                  <div className="text-[11px] text-gray-500">
                                    {prod.brand && <span className="font-medium text-gray-700 mr-2">{prod.brand}</span>}
                                    {prod.unit && <span>{prod.unit}</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-xs text-[#237A3B] flex-shrink-0">{formatPrice(price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Results Fallback */}
              {!isLoading && query.trim() && !hasResults && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">No exact matches found for "{query}"</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Try searching for common terms like "BP Monitor", "Diapers", "Glucose Monitor", or "Care Hampers".
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/shop');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#237A3B] text-white rounded-xl text-xs font-semibold hover:bg-[#1c6330] transition-colors mt-2 shadow-xs"
                  >
                    Browse All Products <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

