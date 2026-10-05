import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { settingsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_EXCHANGE_RATES } from '../../utils/currency';

export const AdminCurrenciesPage: React.FC = () => {
  const { showToast } = useToast();
  const [rates, setRates] = useState({
    INR_TO_AED: DEFAULT_EXCHANGE_RATES.AED.toString(),
    INR_TO_USD: DEFAULT_EXCHANGE_RATES.USD.toString(),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        if (res.data?.success && res.data.data?.exchangeRates) {
          const fetchedRates = res.data.data.exchangeRates;
          const aed = fetchedRates.find((r: any) => r.toCurrency === 'AED')?.rate;
          const usd = fetchedRates.find((r: any) => r.toCurrency === 'USD')?.rate;
          setRates({
            INR_TO_AED: (aed || DEFAULT_EXCHANGE_RATES.AED).toString(),
            INR_TO_USD: (usd || DEFAULT_EXCHANGE_RATES.USD).toString(),
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsApi.updateExchangeRates([
        { fromCurrency: 'INR', toCurrency: 'AED', rate: parseFloat(rates.INR_TO_AED) },
        { fromCurrency: 'INR', toCurrency: 'USD', rate: parseFloat(rates.INR_TO_USD) },
      ]);
      showToast('Live currency exchange rates updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update rates.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEO title="Currencies & Exchange Rates | Admin" />

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Currencies & Exchange Rates
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maintain base INR currency conversions for UAE (AED) and USA (USD) storefronts.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-5 text-xs">
          <div className="p-4 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/40 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900 text-sm block">Base Store Currency</span>
              <span className="text-[11px] text-gray-500">All product master prices are defined in Indian Rupees</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#237A3B] text-white font-bold text-xs">
              INR (₹)
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                🇦🇪 INR to AED Conversion Rate (1 INR = ? AED)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={rates.INR_TO_AED}
                onChange={(e) => setRates((prev) => ({ ...prev, INR_TO_AED: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:border-[#8BCF9B] outline-none"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Example: ₹1,000 becomes ~AED {(1000 * parseFloat(rates.INR_TO_AED || '0')).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                🇺🇸 INR to USD Conversion Rate (1 INR = ? USD)
              </label>
              <input
                type="number"
                step="0.001"
                required
                value={rates.INR_TO_USD}
                onChange={(e) => setRates((prev) => ({ ...prev, INR_TO_USD: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:border-[#8BCF9B] outline-none"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Example: ₹1,000 becomes ~$ {(1000 * parseFloat(rates.INR_TO_USD || '0')).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Exchange Rates'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
