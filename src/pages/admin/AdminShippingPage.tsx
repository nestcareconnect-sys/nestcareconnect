import React, { useState, useEffect } from 'react';
import { Truck, Save, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, MapPin, Globe, Key, Building } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { ShippingRule, CountryCode, NimbusSettings, NimbusServiceabilityResult } from '../../types';
import { shippingApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { INITIAL_SHIPPING_RULES } from '@/constants';

export const AdminShippingPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'NIMBUSPOST' | 'RULES'>('NIMBUSPOST');
  const [rules, setRules] = useState<ShippingRule[]>(INITIAL_SHIPPING_RULES as any);
  const [isSaving, setIsSaving] = useState(false);

  // NimbusPost Settings State
  const [nimbusSettings, setNimbusSettings] = useState<NimbusSettings>({
    env: 'test',
    baseUrl: 'https://api.nimbuspost.com/v1',
    apiKey: '',
    secret: '',
    email: 'test-seller@nestcareconnect.com',
    pickupLocation: 'Nest Care Central Medical & Hamper Hub',
    pickupPincode: '560001',
    pickupAddress: 'Nest Care Central Medical & Hamper Hub, Indiranagar',
    pickupCity: 'Bengaluru',
    pickupState: 'Karnataka',
    pickupPhone: '+91 98765 43210',
    defaultCourier: 'Delhivery Surface Express',
    sandboxMode: true,
  });
  const [isSavingNimbus, setIsSavingNimbus] = useState(false);

  // Test Pincode Calculator State
  const [testPin, setTestPin] = useState('670001');
  const [calcResult, setCalcResult] = useState<NimbusServiceabilityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    // Load country rules
    shippingApi
      .getAll()
      .then((res) => {
        if (res.data?.success && res.data.data?.length > 0) {
          setRules(res.data.data);
        }
      })
      .catch(() => {});

    // Load NimbusPost settings
    shippingApi
      .getNimbusSettings()
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setNimbusSettings((prev) => ({
            ...prev,
            ...res.data.data,
            baseUrl: res.data.data.baseUrl || res.data.data.apiBaseUrl || prev.baseUrl,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleRuleChange = (country: CountryCode, field: keyof ShippingRule, val: any) => {
    setRules((prev) =>
      prev.map((r) => (r.country === country ? { ...r, [field]: val } : r))
    );
  };

  const handleSaveRule = async (rule: ShippingRule) => {
    setIsSaving(true);
    try {
      await shippingApi.upsert(rule);
      showToast(`Shipping rules for ${rule.country} updated.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save shipping rule.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNimbusSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNimbus(true);
    try {
      await shippingApi.updateNimbusSettings(nimbusSettings);
      showToast('NimbusPost logistics configuration saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save NimbusPost settings.', 'error');
    } finally {
      setIsSavingNimbus(false);
    }
  };

  const handleTestPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPin.trim() || testPin.length !== 6) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }

    setIsCalculating(true);
    setCalcResult(null);
    try {
      const res = await shippingApi.checkNimbusServiceability({
        pincode: testPin.trim(),
        pickupPincode: nimbusSettings.pickupPincode,
      });
      if (res.data?.success && res.data.data) {
        setCalcResult(res.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Serviceability check failed.', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <>
      <SEO title="Shipping & NimbusPost Logistics | Admin" />

      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Logistics & Shipping Rules
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Configure NimbusPost multi-courier API gateway (Delhivery, Blue Dart, Shadowfax, DTDC) and country delivery rules.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('NIMBUSPOST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'NIMBUSPOST'
                  ? 'bg-white text-[#237A3B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚚 NimbusPost Gateway
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RULES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'RULES'
                  ? 'bg-white text-[#237A3B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌐 Country Rules
            </button>
          </div>
        </div>

        {/* TAB 1: NimbusPost Gateway Configuration */}
        {activeTab === 'NIMBUSPOST' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Config Form (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6 text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F1FAF3] text-[#237A3B] flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">NimbusPost Logistics Gateway</h3>
                    <span className="text-[11px] text-gray-400">Integrated Multi-Courier Domestic Fulfillment (India)</span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#237A3B] border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> NIMBUSPOST TEST MODE
                </span>
              </div>

              {/* Instructions banner */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-blue-950 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> NimbusPost Seller Panel Credentials
                </span>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Generate credentials in your NimbusPost Seller Panel under <strong>Settings → API → Generate API User Credentials</strong>.
                  Keep test mode active for sandbox testing.
                </p>
              </div>

              <form onSubmit={handleSaveNimbusSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Environment Mode</label>
                    <select
                      value={nimbusSettings.env || 'test'}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, env: e.target.value as any })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold text-gray-800"
                    >
                      <option value="test">Test / Sandbox Environment (NIMBUSPOST_ENV=test)</option>
                      <option value="production">Production Environment (Live Shipments)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">NimbusPost API Base URL</label>
                    <input
                      type="text"
                      value={nimbusSettings.baseUrl || 'https://api.nimbuspost.com/v1'}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, baseUrl: e.target.value })}
                      placeholder="https://api.nimbuspost.com/v1"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Account / API Email</label>
                    <input
                      type="email"
                      value={nimbusSettings.email || ''}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, email: e.target.value })}
                      placeholder="test-seller@nestcareconnect.com"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">API Key / Token (if required)</label>
                    <input
                      type="password"
                      value={nimbusSettings.apiKey || ''}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, apiKey: e.target.value })}
                      placeholder="••••••••••••••••••••"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#237A3B]" />
                    <span>Default Pickup Warehouse Hub (India)</span>
                  </h4>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Pickup Location Name</label>
                    <input
                      type="text"
                      value={nimbusSettings.pickupLocation || 'Nest Care Central Medical & Hamper Hub'}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupLocation: e.target.value })}
                      placeholder="Nest Care Central Medical & Hamper Hub"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Pickup PIN Code *</label>
                      <input
                        type="text"
                        value={nimbusSettings.pickupPincode}
                        onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupPincode: e.target.value })}
                        placeholder="560001"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Pickup City</label>
                      <input
                        type="text"
                        value={nimbusSettings.pickupCity}
                        onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupCity: e.target.value })}
                        placeholder="Bengaluru"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Pickup State</label>
                      <input
                        type="text"
                        value={nimbusSettings.pickupState}
                        onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupState: e.target.value })}
                        placeholder="Karnataka"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Warehouse Street Address</label>
                    <input
                      type="text"
                      value={nimbusSettings.pickupAddress}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupAddress: e.target.value })}
                      placeholder="Nest Care Central Medical & Hamper Hub, Indiranagar"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Warehouse Contact Phone</label>
                      <input
                        type="text"
                        value={nimbusSettings.pickupPhone}
                        onChange={(e) => setNimbusSettings({ ...nimbusSettings, pickupPhone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Default Courier Partner</label>
                      <select
                        value={nimbusSettings.defaultCourier}
                        onChange={(e) => setNimbusSettings({ ...nimbusSettings, defaultCourier: e.target.value })}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                      >
                        <option value="Delhivery Surface Express">Delhivery Surface Express</option>
                        <option value="Blue Dart Express Air">Blue Dart Express Air</option>
                        <option value="Shadowfax Priority Care">Shadowfax Priority Care</option>
                        <option value="DTDC Healthcare Express">DTDC Healthcare Express</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sandboxMode"
                      checked={nimbusSettings.sandboxMode}
                      onChange={(e) => setNimbusSettings({ ...nimbusSettings, sandboxMode: e.target.checked })}
                      className="w-4 h-4 text-[#237A3B] rounded-md"
                    />
                    <label htmlFor="sandboxMode" className="text-gray-700 font-semibold cursor-pointer">
                      Sandbox / Test Mode Simulation Active
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingNimbus}
                    className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isSavingNimbus ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save NimbusPost Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Test Pincode Serviceability Sandbox Tool (1 col) */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4 text-xs">
              <div className="pb-3 border-b border-gray-100">
                <span className="text-[10px] text-[#237A3B] font-bold uppercase tracking-wider block">
                  Interactive Simulator
                </span>
                <h3 className="font-bold text-sm text-gray-900">Check Pincode Serviceability</h3>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Test courier rates and transit estimates from origin to any Indian destination.
                </p>
              </div>

              <form onSubmit={handleTestPincode} className="space-y-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Destination PIN Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testPin}
                      onChange={(e) => setTestPin(e.target.value)}
                      placeholder="e.g. 670001"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isCalculating}
                      className="px-4 py-2 bg-[#237A3B] text-white font-bold rounded-xl whitespace-nowrap hover:bg-[#1c6330]"
                    >
                      {isCalculating ? 'Checking...' : 'Check'}
                    </button>
                  </div>
                </div>
              </form>

              {calcResult && (
                <div className="pt-2 space-y-3">
                  <div className="p-3 bg-[#F1FAF3] border border-[#8BCF9B]/50 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#237A3B]">✓ Serviceable</span>
                      <span className="text-[10px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded-md">
                        {calcResult.city}, {calcResult.state}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                      Available Courier Rates ({calcResult.couriers.length})
                    </span>

                    {calcResult.couriers.map((c) => (
                      <div
                        key={c.courierId}
                        className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-gray-900 block">{c.courierName}</span>
                          <span className="text-[10px] text-gray-500">{c.estimatedDays}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#237A3B]">₹{c.rate}</span>
                          <span className="text-[10px] text-gray-400 block">⭐ {c.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Country Shipping Rules */}
        {activeTab === 'RULES' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <div
                key={rule.country}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4 text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{rule.country === 'IN' ? '🇮🇳' : rule.country === 'AE' ? '🇦🇪' : '🇺🇸'}</span>
                    <h3 className="font-bold text-sm text-gray-900">
                      {rule.country === 'IN' ? 'India' : rule.country === 'AE' ? 'UAE' : 'United States'}
                    </h3>
                  </div>
                  <span className="font-bold text-xs text-[#237A3B]">
                    {rule.country === 'IN' ? 'INR (₹)' : rule.country === 'AE' ? 'AED' : 'USD ($)'}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Standard Shipping Fee</label>
                  <input
                    type="number"
                    value={rule.shippingFee}
                    onChange={(e) => handleRuleChange(rule.country, 'shippingFee', parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Free Shipping Threshold</label>
                  <input
                    type="number"
                    value={rule.freeShippingThreshold || ''}
                    onChange={(e) =>
                      handleRuleChange(
                        rule.country,
                        'freeShippingThreshold',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="e.g. 999"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Free shipping above this order value
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estimated Delivery Time</label>
                  <input
                    type="text"
                    value={rule.estimatedDays}
                    onChange={(e) => handleRuleChange(rule.country, 'estimatedDays', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveRule(rule)}
                    className="w-full py-2 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Save {rule.country} Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
