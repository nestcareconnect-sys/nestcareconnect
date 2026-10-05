import React, { useState, useEffect } from 'react';
import { Sparkles, Save, CheckCircle2 } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { CustomHamperConfig } from '../../types';
import { customHamperApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminCustomHamperSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [config, setConfig] = useState<Partial<CustomHamperConfig>>({
    title: 'Build Your Own Healthcare Hamper',
    description: 'Select certified health monitors and nutritious snacks to create a bespoke care gift.',
    minItems: 2,
    maxItems: 12,
    minPriceINR: 500,
    active: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    customHamperApi
      .getConfig()
      .then((res) => {
        if (res.data?.success && res.data.data?.config) {
          setConfig(res.data.data.config);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await customHamperApi.updateConfig(config);
      showToast('Custom hamper configuration saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEO title="Custom Hamper Configuration | Admin" />

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Custom Hamper Studio Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Control the item constraints, minimum bundle value, and availability of the interactive builder.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-5 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Builder Studio Headline</label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Sub-heading Description</label>
            <textarea
              rows={2}
              value={config.description || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Minimum Items Required</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.minItems || 2}
                onChange={(e) => setConfig((prev) => ({ ...prev, minItems: parseInt(e.target.value, 10) }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Maximum Items Allowed</label>
              <input
                type="number"
                min="2"
                max="30"
                value={config.maxItems || 12}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxItems: parseInt(e.target.value, 10) }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Minimum Hamper Value (INR)</label>
              <input
                type="number"
                value={config.minPriceINR || 500}
                onChange={(e) => setConfig((prev) => ({ ...prev, minPriceINR: parseFloat(e.target.value) }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={config.active ?? true}
                onChange={(e) => setConfig((prev) => ({ ...prev, active: e.target.checked }))}
                className="rounded text-[#237A3B]"
              />
              <span>Enable Custom Hamper Builder on Public Storefront</span>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
