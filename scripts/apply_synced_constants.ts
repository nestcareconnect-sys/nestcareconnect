import fs from 'fs';

const synced = JSON.parse(fs.readFileSync('./scripts/synced_constants.json', 'utf8'));

// Generate src/constants/index.ts
const srcConstantsContent = `import { Category, Product, Hamper, HeroSlide, ShippingRule, Coupon, HamperBox } from '../types';

export const BRAND_TAGLINES = {
  primary: 'Helping families living overseas care for their parents back home.',
  sub1: 'NESTCARE CONNECT — Because sometimes, love needs a little help reaching home.',
  sub2: 'Care, even when you’re miles away.',
  sendLoveTitle: 'Send Love Home ❤️',
  sendLoveSub: 'Living overseas doesn’t mean you have to miss the special moments.',
  sendLoveFull:
    'Whether you’re sending care to your parents, celebrating an anniversary, welcoming a new mum or simply saying "I’m thinking of you", Nest Care helps you send something beautiful, thoughtful and meaningful to the people you love. You choose the hamper, you add your personal message, we take care of the rest.',
};

export const INITIAL_HERO_SLIDES: HeroSlide[] = ${JSON.stringify(synced.heroSlides, null, 2)};

export const INITIAL_CATEGORIES: Category[] = ${JSON.stringify(synced.categories, null, 2)};

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(synced.products, null, 2)};

export const INITIAL_HAMPERS: Hamper[] = ${JSON.stringify(synced.hampers, null, 2)};

export const INITIAL_HAMPER_BOXES: HamperBox[] = ${JSON.stringify(synced.boxes, null, 2)};

export const INITIAL_SHIPPING_RULES: ShippingRule[] = [
  {
    id: 'ship-in',
    country: 'IN',
    minOrderAmount: 0,
    shippingFee: 99,
    freeShippingThreshold: 999,
    estimatedDays: '2-4 business days across India',
    active: true,
  },
  {
    id: 'ship-ae',
    country: 'AE',
    minOrderAmount: 0,
    shippingFee: 25,
    freeShippingThreshold: 200,
    estimatedDays: '3-5 business days across UAE',
    active: true,
  },
  {
    id: 'ship-us',
    country: 'US',
    minOrderAmount: 0,
    shippingFee: 9.99,
    freeShippingThreshold: 75,
    estimatedDays: '4-7 business days across USA',
    active: true,
  },
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coup-welcome10',
    code: 'WELCOME10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderValueINR: 1000,
    maxDiscountINR: 500,
    startDate: new Date().toISOString(),
    usageLimit: 1000,
    usageCount: 0,
    perUserLimit: 1,
    applicableCountries: ['IN', 'AE', 'US'],
    active: true,
  },
  {
    id: 'coup-careplus',
    code: 'CAREPLUS',
    discountType: 'FIXED',
    discountValue: 300,
    minOrderValueINR: 2500,
    maxDiscountINR: 300,
    startDate: new Date().toISOString(),
    usageLimit: 500,
    usageCount: 0,
    perUserLimit: 1,
    applicableCountries: ['IN'],
    active: true,
  },
];
`;

// Generate api/config/constants.ts
const apiConstantsContent = `export const BRAND_TAGLINES = {
  primary: 'Helping families living overseas care for their parents back home.',
  sub1: 'NESTCARE CONNECT — Because sometimes, love needs a little help reaching home.',
  sub2: 'Care, even when you’re miles away.',
  sendLoveTitle: 'Send Love Home ❤️',
  sendLoveSub: 'Living overseas doesn’t mean you have to miss the special moments.',
  sendLoveFull:
    'Whether you’re sending care to your parents, celebrating an anniversary, welcoming a new mum or simply saying "I’m thinking of you", Nest Care helps you send something beautiful, thoughtful and meaningful to the people you love. You choose the hamper, you add your personal message, we take care of the rest.',
};

export const INITIAL_HERO_SLIDES = ${JSON.stringify(synced.heroSlides, null, 2)};

export const INITIAL_CATEGORIES = ${JSON.stringify(synced.categories, null, 2)};

export const INITIAL_PRODUCTS = ${JSON.stringify(synced.products, null, 2)};

export const INITIAL_HAMPERS = ${JSON.stringify(synced.hampers, null, 2)};

export const INITIAL_HAMPER_BOXES = ${JSON.stringify(synced.boxes, null, 2)};

export const INITIAL_SHIPPING_RULES = [
  {
    id: 'ship-in',
    country: 'IN',
    minOrderAmount: 0,
    shippingFee: 99,
    freeShippingThreshold: 999,
    estimatedDays: '2-4 business days across India',
    active: true,
  },
  {
    id: 'ship-ae',
    country: 'AE',
    minOrderAmount: 0,
    shippingFee: 25,
    freeShippingThreshold: 200,
    estimatedDays: '3-5 business days across UAE',
    active: true,
  },
  {
    id: 'ship-us',
    country: 'US',
    minOrderAmount: 0,
    shippingFee: 9.99,
    freeShippingThreshold: 75,
    estimatedDays: '4-7 business days across USA',
    active: true,
  },
];

export const INITIAL_COUPONS = [
  {
    id: 'coup-welcome10',
    code: 'WELCOME10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderValueINR: 1000,
    maxDiscountINR: 500,
    startDate: new Date().toISOString(),
    usageLimit: 1000,
    usageCount: 0,
    perUserLimit: 1,
    applicableCountries: ['IN', 'AE', 'US'],
    active: true,
  },
  {
    id: 'coup-careplus',
    code: 'CAREPLUS',
    discountType: 'FIXED',
    discountValue: 300,
    minOrderValueINR: 2500,
    maxDiscountINR: 300,
    startDate: new Date().toISOString(),
    usageLimit: 500,
    usageCount: 0,
    perUserLimit: 1,
    applicableCountries: ['IN'],
    active: true,
  },
];

export const DEFAULT_SETTINGS = {
  general: {
    siteName: 'Nest Care Connect',
    tagline: 'Send Love Home ❤️ | Gifting & Care for Parents',
    supportEmail: 'support@nestcareconnect.com',
    supportPhone: '+91 800 123 4567',
    contactAddress: 'Nest Care Healthcare Distribution Hub, Ernakulam, Kerala, India - 682001',
    announcementBar: {
      enabled: true,
      text: '✈️ Helping families abroad care for parents back home with clinical essentials & heartfelt gifts.',
      linkText: 'Explore Hampers',
      linkUrl: '/hampers',
    },
  },
  currencies: [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', isBase: false },
    { code: 'USD', name: 'US Dollar', symbol: '$', isBase: false },
  ],
  exchangeRates: [
    { fromCurrency: 'INR', toCurrency: 'AED', rate: 0.044 },
    { fromCurrency: 'INR', toCurrency: 'USD', rate: 0.012 },
  ],
};
`;

fs.writeFileSync('./src/constants/index.ts', srcConstantsContent);
fs.writeFileSync('./api/config/constants.ts', apiConstantsContent);

console.log('✅ Successfully written updated src/constants/index.ts and api/config/constants.ts');
