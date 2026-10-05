import React, { useState, useEffect } from 'react';
import { Settings, Save, ShieldCheck } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { settingsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<any>({
    companyName: 'Nest Care Connect',
    contactEmail: 'support@nestcareconnect.com',
    contactPhone: '+91 800 123 4567',
    whatsappNumber: '+91 98765 43210',
    officeAddress: 'Nest Healthcare Hub, Level 4, Tech Enclave, Indiranagar, Bengaluru, 560038, India',
    supportedCountries: ['IN', 'AE', 'US'],
    supportedCurrencies: ['INR', 'AED', 'USD'],
    defaultCurrency: 'INR',
    freeShippingEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        if (res.data?.success && res.data.data?.settings) {
          setSettings(res.data.data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsApi.update(settings);
      showToast('Store settings updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEO title="Store Settings & Configuration | Admin" />

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            General Healthcare Store Settings
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maintain public corporate details, support phone/WhatsApp channels, and regional defaults.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, companyName: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.contactEmail || ''}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, contactEmail: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Customer Care Phone</label>
              <input
                type="text"
                value={settings.contactPhone || ''}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, contactPhone: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">WhatsApp Support Number</label>
              <input
                type="text"
                value={settings.whatsappNumber || ''}
                onChange={(e) => setSettings((prev: any) => ({ ...prev, whatsappNumber: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Registered Operational Address</label>
            <textarea
              rows={2}
              value={settings.officeAddress || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, officeAddress: e.target.value }))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
