import prisma from '../config/prisma.js';
import { CountryCode, CurrencyCode } from '@prisma/client';
import { DEFAULT_EXCHANGE_RATES } from '../../src/utils/currency.js';

export interface CalculatedItem {
  itemType: 'PRODUCT' | 'HAMPER' | 'CUSTOM_HAMPER';
  productId?: string;
  hamperId?: string;
  customHamperData?: any;
  personalization?: any;
  name: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  snapshot: any;
}

export interface PricingCalculationResult {
  items: CalculatedItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  currency: CurrencyCode;
  country: CountryCode;
  couponApplied?: {
    code: string;
    discountValue: number;
    discountType: string;
  };
}

export class PricingService {
  /**
   * Get active exchange rates from database or defaults
   */
  async getExchangeRates(): Promise<Record<CurrencyCode, number>> {
    try {
      const rates = await prisma.exchangeRate.findMany();
      const rateMap: Record<CurrencyCode, number> = {
        INR: 1,
        AED: DEFAULT_EXCHANGE_RATES.AED,
        USD: DEFAULT_EXCHANGE_RATES.USD,
      };

      for (const r of rates) {
        if (r.toCurrency in rateMap) {
          rateMap[r.toCurrency as CurrencyCode] = r.rate;
        }
      }
      return rateMap;
    } catch {
      return DEFAULT_EXCHANGE_RATES;
    }
  }

  /**
   * Calculate single product price for country & currency
   */
  async getProductPrice(
    productId: string,
    country: CountryCode,
    currency: CurrencyCode,
    rates?: Record<CurrencyCode, number>
  ): Promise<{ product: any; unitPrice: number }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { countryPrices: true },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new Error(`Product ${productId} is unavailable.`);
    }

    // 1. Check country fixed price override
    const countryOverride = product.countryPrices.find((cp: any) => cp.country === country);
    if (countryOverride && countryOverride.fixedPrice > 0) {
      return { product, unitPrice: countryOverride.fixedPrice };
    }

    // 2. Base INR exchange rate conversion
    const exchangeRates = rates || (await this.getExchangeRates());
    const rate = exchangeRates[currency] || 1;
    const unitPrice = currency === 'INR' ? product.basePriceINR : +(product.basePriceINR * rate).toFixed(2);

    return { product, unitPrice };
  }

  /**
   * Calculate single hamper price for country & currency
   */
  async getHamperPrice(
    hamperId: string,
    country: CountryCode,
    currency: CurrencyCode,
    rates?: Record<CurrencyCode, number>
  ): Promise<{ hamper: any; unitPrice: number }> {
    const hamper = await prisma.hamper.findUnique({
      where: { id: hamperId },
      include: {
        countryPrices: true,
        items: {
          include: {
            product: {
              include: { countryPrices: true },
            },
          },
        },
      },
    });

    if (!hamper || hamper.status !== 'ACTIVE') {
      throw new Error(`Hamper ${hamperId} is unavailable.`);
    }

    // Check country availability
    if (hamper.countryAvailability && !hamper.countryAvailability.includes(country)) {
      throw new Error(`Hamper ${hamper.name} is not available in ${country}.`);
    }

    // 1. Check country fixed price override
    const countryOverride = hamper.countryPrices.find((hp: any) => hp.country === country);
    if (countryOverride && countryOverride.fixedPrice > 0) {
      return { hamper, unitPrice: countryOverride.fixedPrice };
    }

    // 2. Fixed base price
    const exchangeRates = rates || (await this.getExchangeRates());
    const rate = exchangeRates[currency] || 1;

    if (hamper.pricingType === 'FIXED' && hamper.fixedPriceINR) {
      const unitPrice = currency === 'INR' ? hamper.fixedPriceINR : +(hamper.fixedPriceINR * rate).toFixed(2);
      return { hamper, unitPrice };
    }

    // 3. Calculated pricing based on contents
    let total = 0;
    for (const item of hamper.items) {
      if (item.product) {
        const prodOverride = item.product.countryPrices.find((cp: any) => cp.country === country);
        const itemPrice = prodOverride
          ? prodOverride.fixedPrice
          : currency === 'INR'
          ? item.product.basePriceINR
          : +(item.product.basePriceINR * rate).toFixed(2);
        total += itemPrice * (item.quantity || 1);
      }
    }

    const unitPrice = currency === 'INR' ? Math.round(total) : +total.toFixed(2);
    return { hamper, unitPrice };
  }

  /**
   * Calculate single hamper box price for country & currency
   */
  async getBoxPrice(
    boxId: string,
    country: CountryCode,
    currency: CurrencyCode,
    rates?: Record<CurrencyCode, number>
  ): Promise<{ box: any; unitPrice: number }> {
    const box = await prisma.hamperBox.findFirst({
      where: {
        OR: [{ id: boxId }, { slug: boxId }],
      },
      include: { countryPrices: true },
    });

    if (!box || box.status !== 'ACTIVE') {
      throw new Error(`Hamper box '${boxId}' is currently unavailable or inactive.`);
    }

    if (box.stock <= 0) {
      throw new Error(`Hamper box '${box.name}' is currently out of stock.`);
    }

    if (box.countryAvailability && !box.countryAvailability.includes(country)) {
      throw new Error(`Hamper box '${box.name}' is not available for delivery in ${country}.`);
    }

    // 1. Check country fixed price override
    const cp = box.countryPrices?.find((p: any) => p.country === country);
    if (cp && cp.fixedPrice > 0) {
      return { box, unitPrice: cp.fixedPrice };
    }

    // 2. Base INR conversion
    const exchangeRates = rates || (await this.getExchangeRates());
    const rate = exchangeRates[currency] || 1;
    const unitPrice = currency === 'INR' ? box.basePriceINR : +(box.basePriceINR * rate).toFixed(2);

    return { box, unitPrice };
  }

  /**
   * Calculate custom hamper price strictly enforcing mandatory box selection and product items
   */
  async calculateCustomHamper(
    customHamperData: {
      title?: string;
      boxId?: string;
      boxType?: string;
      items: { productId: string; quantity: number }[];
      personalization?: any;
    },
    country: CountryCode,
    currency: CurrencyCode,
    rates?: Record<CurrencyCode, number>
  ): Promise<{
    unitPrice: number;
    boxPrice: number;
    productsSubtotal: number;
    personalisationPrice: number;
    box: any;
    breakdown: any[];
    totalItemQuantity: number;
  }> {
    if (!customHamperData.items || customHamperData.items.length === 0) {
      throw new Error('Custom hamper must contain at least one product.');
    }

    // MANDATORY BOX RULE: A customized hamper MUST have a hamper box
    const selectedBoxId = customHamperData.boxId || customHamperData.boxType;
    if (!selectedBoxId) {
      throw new Error('A customized hamper must have a selected hamper box. Please select a hamper box before continuing.');
    }

    const exchangeRates = rates || (await this.getExchangeRates());

    // 1. Validate and price the Box
    const { box, unitPrice: boxPrice } = await this.getBoxPrice(selectedBoxId, country, currency, exchangeRates);

    // 2. Calculate Total Quantity of selected items and enforce box capacity
    const totalItemQuantity = customHamperData.items.reduce((acc, itm) => acc + (itm.quantity || 1), 0);
    if (totalItemQuantity > box.capacity) {
      throw new Error(
        `The selected box '${box.name}' cannot hold ${totalItemQuantity} items (maximum capacity: ${box.capacity}). Please select a larger box.`
      );
    }

    // 3. Price each constituent product
    let productsSubtotal = 0;
    const breakdown: any[] = [];

    for (const itm of customHamperData.items) {
      const { product, unitPrice } = await this.getProductPrice(itm.productId, country, currency, exchangeRates);
      const qty = Math.max(1, itm.quantity || 1);
      const itemTotal = +(unitPrice * qty).toFixed(2);
      productsSubtotal += itemTotal;
      breakdown.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: product.images?.[0],
        unitPrice,
        quantity: qty,
        totalPrice: itemTotal,
      });
    }

    // 4. Personalisation price
    const personalisationPrice = 0;

    const rawTotal = productsSubtotal + boxPrice + personalisationPrice;
    const unitPrice = currency === 'INR' ? Math.round(rawTotal) : +rawTotal.toFixed(2);

    return {
      unitPrice,
      boxPrice,
      productsSubtotal: currency === 'INR' ? Math.round(productsSubtotal) : +productsSubtotal.toFixed(2),
      personalisationPrice,
      box: {
        id: box.id,
        name: box.name,
        slug: box.slug,
        size: box.size,
        color: box.color,
        material: box.material,
        dimensions: box.dimensions,
        capacity: box.capacity,
        price: boxPrice,
        image: box.images?.[0],
      },
      breakdown,
      totalItemQuantity,
    };
  }

  /**
   * Recalculate entire cart or order server-side
   */
  async calculateCartTotals(params: {
    items: {
      itemType: 'PRODUCT' | 'HAMPER' | 'CUSTOM_HAMPER';
      productId?: string;
      hamperId?: string;
      customHamperData?: any;
      personalization?: any;
      quantity: number;
    }[];
    country: CountryCode;
    currency: CurrencyCode;
    couponCode?: string;
  }): Promise<PricingCalculationResult> {
    const { items, country, currency, couponCode } = params;
    const exchangeRates = await this.getExchangeRates();
    const calculatedItems: CalculatedItem[] = [];
    let subtotal = 0;

    for (const itm of items) {
      const qty = Math.max(1, itm.quantity || 1);

      if (itm.itemType === 'PRODUCT' && itm.productId) {
        const { product, unitPrice } = await this.getProductPrice(itm.productId, country, currency, exchangeRates);
        const totalPrice = +(unitPrice * qty).toFixed(2);
        subtotal += totalPrice;

        calculatedItems.push({
          itemType: 'PRODUCT',
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice,
          quantity: qty,
          totalPrice,
          snapshot: {
            name: product.name,
            sku: product.sku,
            image: product.images?.[0],
            unit: product.unit,
            brand: product.brand,
          },
        });
      } else if (itm.itemType === 'HAMPER' && itm.hamperId) {
        const { hamper, unitPrice } = await this.getHamperPrice(itm.hamperId, country, currency, exchangeRates);
        const totalPrice = +(unitPrice * qty).toFixed(2);
        subtotal += totalPrice;

        const personalization = itm.personalization || itm.customHamperData?.personalization || null;

        calculatedItems.push({
          itemType: 'HAMPER',
          hamperId: hamper.id,
          name: hamper.name,
          unitPrice,
          quantity: qty,
          totalPrice,
          personalization,
          snapshot: {
            name: hamper.name,
            image: hamper.images?.[0],
            hamperType: hamper.hamperType,
            itemCount: hamper.items?.length || 0,
            personalization,
          },
        });
      } else if (itm.itemType === 'CUSTOM_HAMPER' && itm.customHamperData) {
        const { unitPrice, boxPrice, productsSubtotal, box, breakdown, totalItemQuantity } =
          await this.calculateCustomHamper(itm.customHamperData, country, currency, exchangeRates);
        const totalPrice = +(unitPrice * qty).toFixed(2);
        subtotal += totalPrice;

        const personalization = itm.personalization || itm.customHamperData?.personalization || null;

        calculatedItems.push({
          itemType: 'CUSTOM_HAMPER',
          name: itm.customHamperData.title || 'Custom Healthcare Hamper',
          customHamperData: {
            ...itm.customHamperData,
            boxId: box.id,
            box,
            boxPrice,
            productsSubtotal,
            totalPrice: unitPrice,
            personalization,
          },
          unitPrice,
          quantity: qty,
          totalPrice,
          personalization,
          snapshot: {
            title: itm.customHamperData.title || 'Custom Healthcare Hamper',
            occasion: itm.customHamperData.occasion,
            message: itm.customHamperData.message,
            box,
            boxPrice,
            productsSubtotal,
            breakdown,
            totalItemQuantity,
            personalization,
          },
        });
      }
    }

    // Shipping calculation
    let shippingFee = 0;
    try {
      const shippingRule = await prisma.shippingRule.findUnique({
        where: { country },
      });

      if (shippingRule && shippingRule.active) {
        if (
          shippingRule.freeShippingThreshold &&
          subtotal >= shippingRule.freeShippingThreshold
        ) {
          shippingFee = 0;
        } else {
          // If shipping rule is defined in INR, convert if needed, or rule is stored in local currency
          shippingFee = shippingRule.shippingFee;
        }
      }
    } catch {
      // Default fallback shipping
      shippingFee = country === 'IN' ? (subtotal > 999 ? 0 : 99) : country === 'AE' ? (subtotal > 200 ? 0 : 25) : subtotal > 75 ? 0 : 9.99;
    }

    // Coupon calculation
    let discount = 0;
    let couponApplied: any = undefined;

    if (couponCode) {
      try {
        const coupon = await prisma.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (
          coupon &&
          coupon.active &&
          coupon.applicableCountries.includes(country) &&
          (!coupon.expiryDate || new Date(coupon.expiryDate) > new Date()) &&
          (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)
        ) {
          // Convert minOrderValueINR to local currency if needed
          const rate = exchangeRates[currency] || 1;
          const minOrderVal = currency === 'INR' ? coupon.minOrderValueINR : coupon.minOrderValueINR * rate;

          if (subtotal >= minOrderVal) {
            if (coupon.discountType === 'PERCENTAGE') {
              discount = +((subtotal * coupon.discountValue) / 100).toFixed(2);
              if (coupon.maxDiscountINR) {
                const maxDiscount = currency === 'INR' ? coupon.maxDiscountINR : coupon.maxDiscountINR * rate;
                discount = Math.min(discount, maxDiscount);
              }
            } else {
              discount = currency === 'INR' ? coupon.discountValue : +(coupon.discountValue * rate).toFixed(2);
            }

            couponApplied = {
              code: coupon.code,
              discountValue: coupon.discountValue,
              discountType: coupon.discountType,
            };
          }
        }
      } catch (err) {
        console.warn('Coupon verification warning:', err);
      }
    }

    const tax = 0; // Inclusive in listed price
    const total = Math.max(0, +(subtotal - discount + shippingFee + tax).toFixed(2));

    return {
      items: calculatedItems,
      subtotal: +subtotal.toFixed(2),
      discount: +discount.toFixed(2),
      shippingFee: +shippingFee.toFixed(2),
      tax: +tax.toFixed(2),
      total,
      currency,
      country,
      couponApplied,
    };
  }
}

export const pricingService = new PricingService();
