import React from 'react';
import { Address, CountryCode } from '../../types';

interface CountryAddressFormProps {
  country: CountryCode;
  address: Partial<Address>;
  onChange: (field: keyof Address, value: string) => void;
  errors?: Record<string, string>;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Karnataka', 'Kerala', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'West Bengal',
];

const UAE_EMIRATES = [
  'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah',
];

const US_STATES = [
  'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois',
  'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington',
];

export const CountryAddressForm: React.FC<CountryAddressFormProps> = ({
  country,
  address,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-4">
      {/* Full Name & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Recipient Full Name *
          </label>
          <input
            type="text"
            value={address.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Rajesh Sharma"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
          {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Contact Phone Number *
          </label>
          <input
            type="tel"
            value={address.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder={country === 'IN' ? '+91 98765 43210' : country === 'AE' ? '+971 50 123 4567' : '+1 234 567 8900'}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
          {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* Street Address Line 1 */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Street Address / House No. *
        </label>
        <input
          type="text"
          value={address.addressLine1 || ''}
          onChange={(e) => onChange('addressLine1', e.target.value)}
          placeholder="House/Apartment number, street name"
          className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
        />
        {errors.addressLine1 && <p className="text-[11px] text-red-500 mt-1">{errors.addressLine1}</p>}
      </div>

      {/* Street Address Line 2 */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Apartment, Suite, Landmark (Optional)
        </label>
        <input
          type="text"
          value={address.addressLine2 || ''}
          onChange={(e) => onChange('addressLine2', e.target.value)}
          placeholder="e.g. Near Metro Station, Flat 402"
          className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
        />
      </div>

      {/* City, State/Emirate & Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* City */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            value={address.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder={country === 'IN' ? 'Bengaluru' : country === 'AE' ? 'Dubai' : 'New York'}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
          {errors.city && <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>}
        </div>

        {/* State / Emirate */}
        <div>
          {country === 'IN' ? (
            <>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                State *
              </label>
              <select
                value={address.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </>
          ) : country === 'AE' ? (
            <>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Emirate *
              </label>
              <select
                value={address.emirate || ''}
                onChange={(e) => onChange('emirate', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
              >
                <option value="">Select Emirate</option>
                {UAE_EMIRATES.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                State *
              </label>
              <select
                value={address.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
              >
                <option value="">Select State</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </>
          )}
          {(errors.state || errors.emirate) && (
            <p className="text-[11px] text-red-500 mt-1">{errors.state || errors.emirate}</p>
          )}
        </div>

        {/* PIN / ZIP / Postal Code */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {country === 'IN' ? 'PIN Code *' : country === 'AE' ? 'Postal / Makani Code' : 'ZIP Code *'}
          </label>
          <input
            type="text"
            value={address.postalCode || ''}
            onChange={(e) => onChange('postalCode', e.target.value)}
            placeholder={country === 'IN' ? '560038' : country === 'AE' ? '00000' : '10001'}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#8BCF9B] outline-none"
          />
          {errors.postalCode && <p className="text-[11px] text-red-500 mt-1">{errors.postalCode}</p>}
        </div>
      </div>
    </div>
  );
};
