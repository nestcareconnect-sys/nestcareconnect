import { CountryCode, CurrencyCode, COUNTRIES, Product, Hamper, HamperBox } from '../types/index.js';

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  INR: 1,
  AED: 0.044, // 1 INR = 0.044 AED (approx ₹1000 = ~44 AED)
  USD: 0.012, // 1 INR = 0.012 USD (approx ₹1000 = ~12 USD)
};

/**
 * Format an amount in the given currency
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR'
): string {
  if (isNaN(amount)) return '₹0';

  switch (currency) {
    case 'INR':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);

    case 'AED':
      return `AED ${amount.toFixed(2)}`;

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

    default:
      return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Calculate product price for a specific country and currency
 * Considers explicit CountryPrice override first, then exchange rate
 */
export function getProductPrice(
  product: Product,
  country: CountryCode,
  currency: CurrencyCode,
  exchangeRates: Record<CurrencyCode, number> = DEFAULT_EXCHANGE_RATES
): { price: number; compareAtPrice?: number | null } {
  // Check if country override exists
  if (product.countryPrices && product.countryPrices.length > 0) {
    const override = product.countryPrices.find((cp: any) => cp.country === country);
    if (override && override.fixedPrice > 0) {
      const comparePrice = product.compareAtPriceINR
        ? product.compareAtPriceINR * (exchangeRates[currency] || 1)
        : null;
      return {
        price: override.fixedPrice,
        compareAtPrice: comparePrice,
      };
    }
  }

  // Base calculation with exchange rates
  const rate = exchangeRates[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1;
  const calculatedPrice = currency === 'INR' ? product.basePriceINR : +(product.basePriceINR * rate).toFixed(2);
  
  const calculatedCompare = product.compareAtPriceINR
    ? currency === 'INR'
      ? product.compareAtPriceINR
      : +(product.compareAtPriceINR * rate).toFixed(2)
    : null;

  return {
    price: calculatedPrice,
    compareAtPrice: calculatedCompare,
  };
}

/**
 * Calculate hamper price for country and currency
 */
export function getHamperPrice(
  hamper: Hamper,
  country: CountryCode,
  currency: CurrencyCode,
  exchangeRates: Record<CurrencyCode, number> = DEFAULT_EXCHANGE_RATES
): number {
  // Check override
  if (hamper.countryPrices && hamper.countryPrices.length > 0) {
    const override = hamper.countryPrices.find((hp: any) => hp.country === country);
    if (override && override.fixedPrice > 0) {
      return override.fixedPrice;
    }
  }

  if (hamper.pricingType === 'FIXED' && hamper.fixedPriceINR) {
    const rate = exchangeRates[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1;
    return currency === 'INR' ? hamper.fixedPriceINR : +(hamper.fixedPriceINR * rate).toFixed(2);
  }

  // Calculated from items
  if (hamper.items && hamper.items.length > 0) {
    let total = 0;
    for (const item of hamper.items) {
      if (item.product) {
        const { price } = getProductPrice(item.product, country, currency, exchangeRates);
        total += price * (item.quantity || 1);
      }
    }
    return currency === 'INR' ? Math.round(total) : +total.toFixed(2);
  }

  return 0;
}

/**
 * Calculate hamper box price for country and currency
 */
export function getBoxPrice(
  box: HamperBox,
  country: CountryCode,
  currency: CurrencyCode,
  exchangeRates: Record<CurrencyCode, number> = DEFAULT_EXCHANGE_RATES
): number {
  if (box.countryPrices && box.countryPrices.length > 0) {
    const override = box.countryPrices.find((bp: any) => bp.country === country);
    if (override && override.fixedPrice > 0) {
      return override.fixedPrice;
    }
  }

  const rate = exchangeRates[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1;
  return currency === 'INR' ? box.basePriceINR : +(box.basePriceINR * rate).toFixed(2);
}
