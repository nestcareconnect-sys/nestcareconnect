import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { useCountryCurrency } from '../../context/CountryCurrencyContext';
import { CountrySelectorModal } from './CountrySelectorModal';

export const Footer: React.FC = () => {
  const { countryConfig } = useCountryCurrency();
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  return (
    <>
      <footer className="bg-gray-900 text-gray-300 pt-12 pb-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-gray-800">
            {/* Column 1: Brand & Mission */}
            <div className="space-y-4">
              <Logo variant="white" />
              <p className="text-xs text-gray-400 leading-relaxed pr-4">
                Delivering clinical-grade healthcare equipment, monitoring devices, and personalized care hampers directly to families across India, UAE, and the USA.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#8BCF9B]">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Genuine Certified Healthcare Brands</span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Shop & Explore</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/shop" className="hover:text-[#8BCF9B] transition-colors">
                    All Healthcare Products
                  </Link>
                </li>
                <li>
                  <Link to="/hampers" className="hover:text-[#8BCF9B] transition-colors">
                    Curated Healthcare Hampers
                  </Link>
                </li>
                <li>
                  <Link to="/custom-hamper" className="text-[#8BCF9B] font-semibold hover:underline flex items-center gap-1">
                    Build Custom Hamper <span>✨</span>
                  </Link>
                </li>
                <li>
                  <Link to="/category/diabetes-care" className="hover:text-[#8BCF9B] transition-colors">
                    Diabetes Care & Testing
                  </Link>
                </li>
                <li>
                  <Link to="/category/blood-pressure-care" className="hover:text-[#8BCF9B] transition-colors">
                    Blood Pressure Monitors
                  </Link>
                </li>
                <li>
                  <Link to="/category/personal-care" className="hover:text-[#8BCF9B] transition-colors">
                    Elderly & Personal Care
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Care & Policies */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Customer Care</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to="/order-tracking" className="hover:text-[#8BCF9B] transition-colors">
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#8BCF9B] transition-colors">
                    Contact & Support
                  </Link>
                </li>
                <li>
                  <Link to="/shipping-policy" className="hover:text-[#8BCF9B] transition-colors">
                    Shipping & Delivery
                  </Link>
                </li>
                <li>
                  <Link to="/returns-policy" className="hover:text-[#8BCF9B] transition-colors">
                    Return & Refund Policy
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-[#8BCF9B] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#8BCF9B] transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li className="pt-1 border-t border-gray-800">
                  <Link to="/admin/products" className="text-gray-400 hover:text-[#8BCF9B] transition-colors flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8BCF9B]" />
                    <span>Admin Management Portal</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Country Selector */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Global Reach</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#8BCF9B]" />
                  <span>support@nestcareconnect.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8BCF9B]" />
                  <span>+91 800 123 4567</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8BCF9B] flex-shrink-0 mt-0.5" />
                  <span>India • UAE • United States</span>
                </div>
              </div>

              {/* Country Button */}
              <div className="pt-2">
                <button
                  onClick={() => setIsCountryModalOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-medium text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#8BCF9B]" />
                    <span>Deliver to: <strong className="text-white">{countryConfig.name}</strong></span>
                  </div>
                  <span className="text-[#8BCF9B] font-bold">{countryConfig.currency}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <div>
              © {new Date().getFullYear()} Nest Care Connect. All rights reserved. Registered healthcare & wellness distributor.
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>India (INR)</span>
              <span>•</span>
              <span>UAE (AED)</span>
              <span>•</span>
              <span>USA (USD)</span>
            </div>
          </div>
        </div>
      </footer>

      <CountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
      />
    </>
  );
};
