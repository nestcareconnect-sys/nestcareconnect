export type CountryCode = 'IN' | 'AE' | 'US';
export type CurrencyCode = 'INR' | 'AED' | 'USD';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  symbol: string;
  flag: string;
  phoneCode: string;
  currencyFormat: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    symbol: '₹',
    flag: '🇮🇳',
    phoneCode: '+91',
    currencyFormat: 'INR',
  },
  AE: {
    code: 'AE',
    name: 'UAE / Dubai',
    currency: 'AED',
    symbol: 'AED ',
    flag: '🇦🇪',
    phoneCode: '+971',
    currencyFormat: 'AED',
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    phoneCode: '+1',
    currencyFormat: 'USD',
  },
};

export type Role = 'CUSTOMER' | 'ADMIN';
export type Status = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
export type HamperType = 'NORMAL' | 'PREMIUM' | 'PREMIUM_PLUS' | 'ANNIVERSARY' | 'ANNIVERSARY_PREMIUM' | 'SIGNATURE_ANNIVERSARY' | 'CUSTOM';
export type PricingType = 'FIXED' | 'CALCULATED';
export type ItemType = 'PRODUCT' | 'HAMPER' | 'CUSTOM_HAMPER' | 'ADD_ON';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type VideoStatus = 'NOT_REQUIRED' | 'VIDEO_REQUIRED' | 'VIDEO_PROCESSING' | 'VIDEO_READY';

export type CategoryType = 'CARE' | 'GIFT' | 'OCCASION' | 'RECIPIENT' | 'ADD_ON';
export type AddOnCategory = 'PERSONAL_CARE' | 'MEDICAL_MOBILITY' | 'GIFT_LIFESTYLE';
export type RecipientType = 'MUM' | 'DAD' | 'PARENTS' | 'NEW_MUM' | 'BABY' | 'COUPLE' | 'FAMILY' | 'OTHER';
export type OccasionType = 'MEDICAL_CARE' | 'WEDDING' | 'ANNIVERSARY' | 'NEW_BABY' | 'BIRTHDAY' | 'CELEBRATION' | 'JUST_BECAUSE' | 'OTHER';

export type PaymentProvider = 'RAZORPAY' | 'STRIPE' | 'COD' | 'DEMO';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  status: Status;
  createdAt: string;
}

export interface Address {
  id?: string;
  userId?: string;
  type?: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  emirate?: string | null;
  postalCode: string;
  country: CountryCode;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  type?: CategoryType;
  parentCategoryId?: string | null;
  parent?: Category | null;
  children?: Category[];
  status: Status;
  sortOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  _count?: {
    products: number;
    children: number;
  };
}

export interface ProductCountryPrice {
  id?: string;
  productId?: string;
  country: CountryCode;
  currency: CurrencyCode;
  fixedPrice: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string | null;
  images: string[];
  basePriceINR: number;
  compareAtPriceINR?: number | null;
  stock: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  categoryId?: string | null;
  category?: Category | null;
  brand?: string | null;
  unit?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  status: Status;
  featured: boolean;
  isAddOn?: boolean;
  addOnCategory?: AddOnCategory | null;
  isCustomHamperEligible?: boolean;
  tags: string[];
  specifications?: Record<string, string> | null;
  countryPrices?: ProductCountryPrice[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  avgRating?: number;
  reviewCount?: number;
  reviews?: Review[];
  createdAt?: string;
  updatedAt?: string;

  // Dynamically calculated by currency & country context
  calculatedPrice?: number;
  calculatedCompareAtPrice?: number | null;
}

export interface HamperItem {
  id?: string;
  hamperId?: string;
  productId: string;
  product?: Product;
  quantity: number;
}

export interface HamperCountryPrice {
  id?: string;
  hamperId?: string;
  country: CountryCode;
  currency: CurrencyCode;
  fixedPrice: number;
}

export interface Hamper {
  id: string;
  name: string;
  slug: string;
  hamperType: string;
  description: string;
  shortDescription?: string | null;
  images: string[];
  pricingType: PricingType;
  fixedPriceINR?: number | null;
  startingPriceINR?: number | null;
  stock: number;
  status: Status;
  featured: boolean;
  recipientType?: RecipientType | string | null;
  occasion?: OccasionType | string | null;
  recipientTypes?: RecipientType[];
  occasions?: OccasionType[];
  recipientVariant?: string | null; // e.g. 'ELDERLY_PARENTS' | 'PREGNANCY_NEW_MUM'
  allowCustomMessage?: boolean;
  allowPhotos?: boolean;
  allowPhotoUpload?: boolean;
  maxPhotos?: number;
  photoRequired?: boolean;
  photoInstructions?: string | null;
  photoCardEnabled?: boolean;
  allowVideoQR?: boolean;
  availableAddOnIds?: string[];
  countryAvailability: CountryCode[];
  items: HamperItem[];
  countryPrices?: HamperCountryPrice[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt?: string;
  updatedAt?: string;

  // Dynamically calculated based on country/currency
  calculatedPrice?: number;
  calculatedStartingPrice?: number;
}

export interface PersonalizationData {
  recipientVariant?: string; // e.g. 'Elderly Care' | 'Pregnancy & New Mum Care'
  customMessage?: string; // Max 50 words
  photos?: string[]; // 1-3 photo URLs
  uploadedPhotos?: string[]; // Uploaded customer photos for greeting card / keepsake
  attachedPhotos?: string[]; // Alias for uploaded photos
  photoInstructions?: string;
  photoCardEnabled?: boolean;
  selectedAddOns?: {
    productId: string;
    name: string;
    unitPriceINR: number;
    unitPrice: number;
    quantity: number;
  }[];
  videoSecureToken?: string;
  videoUrl?: string;
  videoStatus?: VideoStatus;
}

export interface CustomHamperItemSelection {
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice?: number;
}

export interface HamperBoxCountryPrice {
  id?: string;
  boxId?: string;
  country: CountryCode;
  currency: CurrencyCode;
  fixedPrice: number;
}

export interface HamperBox {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  size: string; // 'Small' | 'Medium' | 'Large' | 'Extra Large'
  color: string;
  material: string;
  dimensions?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  capacity: number; // max item quantity
  maxWeight?: number | null;
  basePriceINR: number;
  compareAtPriceINR?: number | null;
  stock: number;
  status: Status;
  sortOrder: number;
  isRecommended: boolean;
  images: string[];
  countryAvailability: CountryCode[];
  countryPrices?: HamperBoxCountryPrice[];
  calculatedPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomHamperData {
  title: string;
  recipientType?: string;
  occasion?: string;
  boxId: string; // REQUIRED: A customized hamper must have a hamper box
  box?: HamperBox;
  boxPrice?: number;
  productsSubtotal?: number;
  personalisationPrice?: number;
  totalPrice?: number;
  message?: string;
  items: CustomHamperItemSelection[];
  personalization?: PersonalizationData;
}

export interface CustomHamperConfig {
  id: string;
  title: string;
  description?: string | null;
  minItems: number;
  maxItems: number;
  minPriceINR: number;
  maxPriceINR?: number | null;
  allowedCategoryIds: string[];
  allowedProductIds: string[];
  allowedCountries: CountryCode[];
  active: boolean;
}

export interface CartItem {
  id: string;
  clientId?: string;
  isOptimistic?: boolean;
  cartId?: string;
  itemType: ItemType;
  productId?: string | null;
  product?: Product | null;
  hamperId?: string | null;
  hamper?: Hamper | null;
  customHamperData?: CustomHamperData | null;
  personalization?: PersonalizationData | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  name?: string;
  snapshot?: any;
}

export interface Cart {
  id?: string;
  userId?: string | null;
  guestId?: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  currency: CurrencyCode;
  appliedCoupon?: Coupon | null;
}

export interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
  country: CountryCode;
}

export interface RecipientInfo {
  name: string;
  phone: string;
  relationship?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  emirate?: string;
  postalCode: string;
  country: CountryCode;
}

export interface OrderItemSnapshot {
  id?: string;
  orderId?: string;
  itemType: ItemType;
  productId?: string | null;
  hamperId?: string | null;
  name: string;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  personalization?: PersonalizationData;
  snapshot: any;
}

export interface OrderTimeline {
  id: string;
  orderId: string;
  status: OrderStatus;
  title: string;
  description?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  user?: User | null;
  
  // NRI Gifting separation:
  buyer: BuyerInfo;
  recipient: RecipientInfo;
  
  // Optional backward compatible aliases:
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  country?: CountryCode;
  shippingAddress?: RecipientInfo | any;
  billingAddress?: any;

  buyerCountry: CountryCode;
  buyerCurrency: CurrencyCode;
  deliveryCountry: CountryCode;
  deliveryCurrency: CurrencyCode;

  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  currency: CurrencyCode;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentId?: string | null;
  transactionId?: string | null;

  // Video & Special Message:
  videoSecureToken?: string | null;
  videoUrl?: string | null;
  videoStatus?: VideoStatus;
  personalizationNote?: string | null;
  uploadedPhotos?: string[];

  couponCode?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  items: OrderItemSnapshot[];
  timeline: OrderTimeline[];
  payments?: Payment[];
  shipment?: Shipment | null;
  nimbusTracking?: NimbusTrackingResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amount: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  signatureVerified?: boolean;
  rawResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId?: string | null;
  awbNumber?: string | null;
  courierName?: string | null;
  courierId?: number | null;
  shipmentStatus: string;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  manifestUrl?: string | null;
  estimatedDelivery?: string | null;
  weightKg?: number | null;
  pickupPincode?: string | null;
  deliveryPincode?: string | null;
  errorMessage?: string | null;
  rawResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NimbusCourierRate {
  courierId: number;
  courierName: string;
  minWeight: number;
  rate: number;
  estimatedDays: string;
  expectedDeliveryDate: string;
  rating: number;
  isRecommended?: boolean;
}

export interface NimbusServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  city: string;
  state: string;
  couriers: NimbusCourierRate[];
  message?: string;
}

export interface NimbusShipmentResult {
  id?: string;
  orderId: string;
  provider?: string;
  providerOrderId?: string;
  awbNumber: string;
  courierName: string;
  courierId: number;
  labelUrl: string;
  manifestUrl?: string;
  trackingUrl?: string;
  shipmentStatus: string;
  status: string;
  estimatedDeliveryDate: string;
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  isTestMode?: boolean;
}

export interface NimbusTrackingCheckpoint {
  timestamp: string;
  location: string;
  status: string;
  activity: string;
}

export interface NimbusTrackingResult {
  awbNumber: string;
  orderNumber: string;
  courierName: string;
  status: string;
  currentLocation: string;
  estimatedDelivery: string;
  pickupDate?: string;
  deliveredDate?: string;
  recipientName?: string;
  history: NimbusTrackingCheckpoint[];
}

export interface NimbusSettings {
  env?: 'test' | 'production';
  baseUrl?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  secret?: string;
  password?: string;
  email?: string;
  pickupLocation?: string;
  pickupPincode: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupPhone: string;
  defaultCourier: string;
  sandboxMode: boolean;
}

export interface ShippingInfo {
  provider: string;
  providerName: string;
  env: 'test' | 'production';
  isTestMode: boolean;
  baseUrl: string;
  pickupLocation: string;
  pickupCity: string;
  pickupPincode: string;
  defaultCourier: string;
  sandboxMode: boolean;
}

export interface SpecialMessagePayload {
  token: string;
  orderNumber: string;
  buyerName: string;
  recipientName: string;
  hamperName: string;
  message?: string;
  photos: string[];
  videoUrl?: string | null;
  videoStatus: VideoStatus;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  badge?: string | null;
  ctaText: string;
  ctaUrl: string;
  desktopImage: string;
  mobileImage: string;
  displayOrder: number;
  status: Status;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValueINR: number;
  maxDiscountINR?: number | null;
  startDate: string;
  expiryDate?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  perUserLimit: number;
  applicableCountries: CountryCode[];
  active: boolean;
}

export interface ExchangeRate {
  id?: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  updatedAt: string;
}

export interface ShippingRule {
  id: string;
  country: CountryCode;
  minOrderAmount: number;
  shippingFee: number;
  freeShippingThreshold?: number | null;
  estimatedDays: string;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  status: ReviewStatus;
  createdAt: string;
}

export interface SiteSettings {
  companyName: string;
  brandTagline: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  officeAddress: string;
  supportedCountries: CountryCode[];
  supportedCurrencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  freeShippingEnabled: boolean;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
  };
}
