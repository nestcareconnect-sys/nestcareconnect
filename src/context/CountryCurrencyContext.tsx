import React, { createContext, useContext, useState, useEffect } from 'react';
import { CountryCode, CurrencyCode, CountryConfig, COUNTRIES, Product, Hamper, HamperBox } from '../types';
import { DEFAULT_EXCHANGE_RATES, getProductPrice, getHamperPrice, getBoxPrice, formatCurrency } from '../utils/currency';
import { settingsApi } from '../services/api';

interface CountryCurrencyContextType {
  country: CountryCode;
  currency: CurrencyCode;
  countryConfig: CountryConfig;
  exchangeRates: Record<CurrencyCode, number>;
  setCountry: (country: CountryCode) => void;
  formatPrice: (amount: number) => string;
  calculateProductPrice: (product: Product) => { price: number; compareAtPrice?: number | null };
  calculateHamperPrice: (hamper: Hamper) => number;
  calculateBoxPrice: (box: HamperBox) => number;
}

const CountryCurrencyContext = createContext<CountryCurrencyContextType | undefined>(undefined);

export const CountryCurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountryState] = useState<CountryCode>(() => {
    const saved = localStorage.getItem('ncc_country') as CountryCode;
    if (saved && COUNTRIES[saved]) return saved;
    // Auto detect from timezone / locale if possible
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone.includes('Dubai') || timeZone.includes('Muscat')) return 'AE';
      if (timeZone.includes('New_York') || timeZone.includes('Los_Angeles') || timeZone.includes('Chicago')) return 'US';
    } catch {
      // Default to IN
    }
    return 'IN';
  });

  const [exchangeRates, setExchangeRates] = useState<Record<CurrencyCode, number>>(DEFAULT_EXCHANGE_RATES);

  const countryConfig = COUNTRIES[country] || COUNTRIES.IN;
  const currency = countryConfig.currency;

  useEffect(() => {
    // Fetch live exchange rates from server
    settingsApi
      .get()
      .then((res) => {
        if (res.data?.data?.exchangeRates) {
          const rates = { ...DEFAULT_EXCHANGE_RATES };
          res.data.data.exchangeRates.forEach((r) => {
            if (r.toCurrency in rates) {
              rates[r.toCurrency] = r.rate;
            }
          });
          setExchangeRates(rates);
        }
      })
      .catch(() => {
        // Use default exchange rates
      });
  }, []);

  const setCountry = (newCountry: CountryCode) => {
    if (COUNTRIES[newCountry]) {
      setCountryState(newCountry);
      localStorage.setItem('ncc_country', newCountry);
    }
  };

  const formatPrice = (amount: number) => formatCurrency(amount, currency);

  const calculateProductPrice = (product: Product) =>
    getProductPrice(product, country, currency, exchangeRates);

  const calculateHamperPrice = (hamper: Hamper) =>
    getHamperPrice(hamper, country, currency, exchangeRates);

  const calculateBoxPrice = (box: HamperBox) =>
    getBoxPrice(box, country, currency, exchangeRates);

  return (
    <CountryCurrencyContext.Provider
      value={{
        country,
        currency,
        countryConfig,
        exchangeRates,
        setCountry,
        formatPrice,
        calculateProductPrice,
        calculateHamperPrice,
        calculateBoxPrice,
      }}
    >
      {children}
    </CountryCurrencyContext.Provider>
  );
};

export const useCountryCurrency = () => {
  const context = useContext(CountryCurrencyContext);
  if (!context) {
    throw new Error('useCountryCurrency must be used within a CountryCurrencyProvider');
  }
  return context;
};
