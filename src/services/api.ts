import axios from 'axios';
import {
  Category,
  Product,
  Hamper,
  CustomHamperConfig,
  Cart,
  Order,
  HeroSlide,
  Coupon,
  ShippingRule,
  Review,
  SiteSettings,
  ExchangeRate,
  User,
  SpecialMessagePayload,
  HamperBox,
  NimbusServiceabilityResult,
  NimbusShipmentResult,
  NimbusTrackingResult,
  NimbusSettings,
  OrderPackageDetails,
  WhatsAppMediaItem,
  WhatsAppConfig,
  QrCodeItem,
} from '../types';

/**
 * Resolves the API Base URL dynamically:
 * 1. Checks VITE_API_BASE_URL or VITE_API_URL environment variables
 * 2. Falls back to relative '/api' for same-origin or reverse-proxy deployments
 */
export function getApiBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    ''
  ).trim();

  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  return '/api';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ncc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor with HTML SPA-fallback detection
apiClient.interceptors.response.use(
  (response) => {
    // Detect if server returned HTML (e.g. index.html SPA fallback on 404/misconfigured reverse proxy)
    const contentType = String(response.headers?.['content-type'] || '');
    if (
      typeof response.data === 'string' &&
      (contentType.includes('text/html') ||
        response.data.trim().startsWith('<!DOCTYPE') ||
        response.data.trim().startsWith('<html'))
    ) {
      const err = new Error(
        'Backend API returned an HTML response instead of JSON. The production API route may be misconfigured or unreachable.'
      );
      (err as any).isHtmlFallback = true;
      (err as any).response = response;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      if (localStorage.getItem('ncc_token')) {
        localStorage.removeItem('ncc_token');
      }
    }
    if (error.response?.status === 503) {
      console.warn('⚠️ [API Service Unavailable]:', error.response.data?.message || 'Database is temporarily paused/waking up.');
    }
    return Promise.reject(error);
  }
);


// Auth API
export const authApi = {
  login: (data: any) => apiClient.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', data),
  register: (data: any) => apiClient.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', data),
  getMe: () => apiClient.get<{ success: boolean; data: User & { addresses: any[] } }>('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: any) => apiClient.post('/auth/change-password', data),
  forgotPassword: (data: { email: string }) => apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', data),
  resetPassword: (data: { token: string; newPassword: string }) => apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', data),
  getAddresses: () => apiClient.get<{ success: boolean; data: any[] }>('/auth/addresses'),
  createAddress: (data: any) => apiClient.post('/auth/addresses', data),
  deleteAddress: (id: string) => apiClient.delete(`/auth/addresses/${id}`),
};

// Categories API
export const categoriesApi = {
  getTree: (includeInactive = false) =>
    apiClient.get<{ success: boolean; data: Category[] }>(`/categories?includeInactive=${includeInactive}`),
  getBySlug: (slug: string) => apiClient.get<{ success: boolean; data: Category & { products: Product[] } }>(`/categories/${slug}`),
  create: (data: any) => apiClient.post('/categories', data),
  update: (id: string, data: any) => apiClient.put(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};

// Products API
export const productsApi = {
  list: (params?: any) =>
    apiClient.get<{
      success: boolean;
      data: {
        products: Product[];
        nextCursor?: string | null;
        hasMore?: boolean;
        pagination?: any;
      };
    }>('/products', { params }),
  getAll: (params?: any) =>
    apiClient.get<{
      success: boolean;
      data: {
        products: Product[];
        nextCursor?: string | null;
        hasMore?: boolean;
        pagination?: any;
      };
    }>('/products', { params }),
  getBySlug: (slug: string) =>
    apiClient.get<{ success: boolean; data: { product: Product; relatedProducts: Product[] } }>(`/products/${slug}`),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// Hampers API
export const hampersApi = {
  list: (params?: any) => apiClient.get<{ success: boolean; data: Hamper[] }>('/hampers', { params }),
  getAll: (params?: any) => apiClient.get<{ success: boolean; data: Hamper[] }>('/hampers', { params }),
  getBySlug: (slug: string) => apiClient.get<{ success: boolean; data: Hamper & { eligibleAddOns?: Product[] } }>(`/hampers/${slug}`),
  create: (data: any) => apiClient.post('/hampers', data),
  update: (id: string, data: any) => apiClient.put(`/hampers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/hampers/${id}`),
};

// Custom Hamper API
export const customHamperApi = {
  getConfig: () =>
    apiClient.get<{ success: boolean; data: { config: CustomHamperConfig; products: Product[] } }>('/custom-hampers/config'),
  getQuote: (data: any) => apiClient.post('/custom-hampers/quote', data),
  updateConfig: (data: any) => apiClient.put('/custom-hampers/config', data),
};

// Hamper Boxes API
export const boxesApi = {
  getAll: (params?: { country?: string; currency?: string; includeInactive?: boolean }) =>
    apiClient.get<{ success: boolean; data: HamperBox[] }>('/boxes', { params }),
  getById: (id: string, params?: { country?: string; currency?: string }) =>
    apiClient.get<{ success: boolean; data: HamperBox }>(`/boxes/${id}`, { params }),
  create: (data: any) => apiClient.post<{ success: boolean; data: HamperBox }>('/boxes', data),
  update: (id: string, data: any) => apiClient.put<{ success: boolean; data: HamperBox }>(`/boxes/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/boxes/${id}`),
};

// Cart API
export const cartApi = {
  getCart: (params: { guestId?: string; country: string; currency: string; couponCode?: string }) =>
    apiClient.get<{ success: boolean; data: Cart }>('/cart', { params }),
  addItem: (data: any) => apiClient.post<{ success: boolean; data: Cart; message: string }>('/cart/add', data),
  updateQty: (id: string, quantity: number, extra?: any) =>
    apiClient.put<{ success: boolean; data: Cart; message: string }>(`/cart/items/${id}`, { quantity, ...extra }),
  removeItem: (id: string, params?: any) =>
    apiClient.delete<{ success: boolean; data: Cart; message: string }>(`/cart/items/${id}`, { params }),
  clearCart: (data: { guestId?: string; country?: string; currency?: string }) =>
    apiClient.post<{ success: boolean; data: Cart; message: string }>('/cart/clear', data),
  mergeGuestCart: (data: { guestId: string }) => apiClient.post('/cart/merge', data),
};

// Orders API
export const ordersApi = {
  create: (data: any) => apiClient.post<{ success: boolean; data: Order }>('/orders', data),
  getMyOrders: () => apiClient.get<{ success: boolean; data: Order[] }>('/orders/my'),
  getById: (id: string) => apiClient.get<{ success: boolean; data: Order }>(`/orders/${id}`),
  track: (data: { orderNumber: string; emailOrPhone?: string }) =>
    apiClient.post<{ success: boolean; data: Order & { nimbusTracking?: NimbusTrackingResult } }>('/orders/track', data),
  getTracking: (orderId: string) =>
    apiClient.get<{ success: boolean; data: { order: Order; shipment?: any; tracking?: NimbusTrackingResult } }>(`/orders/${orderId}/tracking`),
  getSpecialMessage: (token: string) =>
    apiClient.get<{ success: boolean; data: SpecialMessagePayload }>(`/orders/special-message/${token}`),
  getAdminOrders: (params?: any) => apiClient.get('/orders/admin/all', { params }),
  updateStatus: (id: string, data: any) => apiClient.put(`/orders/admin/${id}/status`, data),
  updateAddress: (id: string, data: any) =>
    apiClient.put<{ success: boolean; data: Order; message: string }>(`/orders/admin/${id}/address`, data),
  updateVideo: (id: string, data: { videoUrl: string; videoStatus?: string }) =>
    apiClient.put(`/orders/admin/${id}/video`, data),
  getQRCode: (id: string) =>
    apiClient.get<{ success: boolean; data: { token: string; targetUrl: string; qrDataUrl: string } }>(`/orders/admin/${id}/qr-code`),
  generateQRCode: (id: string) =>
    apiClient.get<{ success: boolean; data: { token: string; targetUrl: string; qrDataUrl: string } }>(`/orders/admin/${id}/qr-code`),
  updatePackingChecklist: (id: string, data: { packedItems?: Record<string, boolean>; resetAll?: boolean }) =>
    apiClient.put<{ success: boolean; data: Order; message: string }>(`/orders/admin/${id}/packing`, data),
};

// Payments API
export const paymentsApi = {
  getConfig: () =>
    apiClient.get<{
      success: boolean;
      data: { keyId: string; isLive: boolean; mode: 'live' | 'test' };
    }>('/payments/config'),
  createSession: (data: { orderId: string; providerName?: string }) =>
    apiClient.post<{
      success: boolean;
      data: {
        orderId: string;
        orderNumber: string;
        razorpayOrderId?: string;
        providerOrderId?: string;
        amount: number;
        amountPaise: number;
        currency: string;
        keyId: string;
        customer: { name: string; email: string; phone: string };
      };
    }>('/payments/razorpay/create-order', data),
  createRazorpayOrder: (data: { orderId: string; providerName?: string }) =>
    apiClient.post<{
      success: boolean;
      data: {
        orderId: string;
        orderNumber: string;
        razorpayOrderId: string;
        providerOrderId: string;
        amount: number;
        amountPaise: number;
        currency: string;
        keyId: string;
        customer: { name: string; email: string; phone: string };
      };
    }>('/payments/razorpay/create-order', data),
  createPaymentSession: (data: { orderId: string; providerName?: string }) =>
    apiClient.post<{
      success: boolean;
      data: {
        orderId: string;
        orderNumber: string;
        razorpayOrderId?: string;
        providerOrderId: string;
        amount: number;
        amountPaise: number;
        currency: string;
        keyId?: string;
        provider: string;
        customer: { name: string; email: string; phone: string };
      };
    }>('/payments/create-session', data),
  processDemoPayment: (data: { orderId: string; action?: 'SUCCESS' | 'FAILED' | 'PENDING' }) =>
    apiClient.post<{
      success: boolean;
      isPending?: boolean;
      message: string;
      data: {
        orderId: string;
        orderNumber: string;
        transactionId?: string;
        paymentProvider: string;
        paymentStatus: string;
        orderStatus?: string;
        shipment?: any;
      };
    }>('/payments/demo/process', data),
  verify: (data: {
    orderId: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentId?: string;
    providerOrderId?: string;
    signature?: string;
    providerName?: string;
  }) => apiClient.post<{ success: boolean; message: string; data: any }>('/payments/verify', data),
  verifyRazorpayPayment: (data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => apiClient.post<{ success: boolean; message: string; data: any }>('/payments/razorpay/verify', data),
};

// Coupons API
export const couponsApi = {
  validate: (data: { code: string; country: string; subtotal: number }) =>
    apiClient.post<{ success: boolean; data: Coupon }>('/coupons/validate', data),
  getAdminCoupons: () => apiClient.get<{ success: boolean; data: Coupon[] }>('/coupons/admin'),
  create: (data: any) => apiClient.post('/coupons/admin', data),
  update: (id: string, data: any) => apiClient.put(`/coupons/admin/${id}`, data),
  delete: (id: string) => apiClient.delete(`/coupons/admin/${id}`),
};

// Shipping & NimbusPost API
export const shippingApi = {
  getAll: () => apiClient.get<{ success: boolean; data: ShippingRule[] }>('/shipping'),
  getByCountry: (country: string) => apiClient.get<{ success: boolean; data: ShippingRule }>(`/shipping/${country}`),
  upsert: (data: any) => apiClient.post('/shipping', data),
  
  // NimbusPost endpoints
  getInfo: () => apiClient.get<{ success: boolean; data: any }>('/shipping/info'),
  checkServiceability: (data: { pincode: string; pickupPincode?: string; weightKg?: number; items?: any[]; cartId?: string; paymentType?: string }) =>
    apiClient.post<{ success: boolean; data: NimbusServiceabilityResult }>('/shipping/nimbus/check-serviceability', data),
  checkNimbusServiceability: (data: { pincode: string; pickupPincode?: string; weightKg?: number; items?: any[]; cartId?: string; paymentType?: string }) =>
    apiClient.post<{ success: boolean; data: NimbusServiceabilityResult }>('/shipping/nimbus/check-serviceability', data),
  // Option B: Dedicated NimbusPost Automated Shipment Dispatch
  createNimbusPostAutomatedShipment: (data: {
    orderId: string;
    courierId?: number;
    courierName?: string;
    pickupPincode?: string;
    weightKg?: number;
  }) => apiClient.post<{ success: boolean; message: string; data: NimbusShipmentResult }>('/shipping/nimbus/automated-shipment', data),
  createNimbusShipment: (data: {
    orderId: string;
    courierId?: number;
    courierName?: string;
    pickupPincode?: string;
    weightKg?: number;
  }) => apiClient.post<{ success: boolean; message: string; data: NimbusShipmentResult }>('/shipping/nimbus/create-shipment', data),
  retryShipment: (data: {
    orderId: string;
    courierId?: number;
    courierName?: string;
  }) => apiClient.post<{ success: boolean; message: string; data: NimbusShipmentResult }>('/shipping/retry-shipment', data),
  trackNimbusShipment: (awb: string) =>
    apiClient.get<{ success: boolean; data: NimbusTrackingResult }>(`/shipping/nimbus/track/${awb}`),
  cancelNimbusShipment: (awb: string) =>
    apiClient.post<{ success: boolean; message: string }>('/shipping/nimbus/cancel', { awb }),
  requestPickup: (data: {
    pickupLocation?: string;
    pickupPincode?: string;
    pickupDate?: string;
    pickupTime?: string;
    expectedPackageCount?: number;
  }) => apiClient.post<{ success: boolean; message: string; pickupRequestId?: string }>('/shipping/nimbus/pickup/request', data),
  getNimbusSettings: () =>
    apiClient.get<{ success: boolean; data: NimbusSettings }>('/shipping/nimbus/settings'),
  updateNimbusSettings: (data: Partial<NimbusSettings>) =>
    apiClient.put<{ success: boolean; message: string; data: NimbusSettings }>('/shipping/nimbus/settings', data),

  // Package Review Endpoint
  getOrderPackageDetails: (orderId: string) =>
    apiClient.get<{ success: boolean; data: OrderPackageDetails }>(`/shipping/order-package/${orderId}`),

  // Option C: Dedicated NimbusPost Manual Order Ingestion (New Orders queue)
  pushOrderToNimbusPostNewOrders: (orderId: string, options?: { pickupPincode?: string; forceRetry?: boolean }) =>
    apiClient.post<{
      success: boolean;
      message: string;
      data: {
        order: any;
        shipment: any;
        orderId: string;
        orderNumber: string;
        nimbusOrderId: string;
        dashboardUrl: string;
        orderStatus: string;
        shipmentStatus: string;
        isBooked: boolean;
        importStatus?: 'NOT_IMPORTED' | 'IMPORTING' | 'IMPORTED_TO_NIMBUSPOST' | 'IMPORT_FAILED' | 'SHIPMENT_CREATED';
        apiLimitation?: boolean;
        apiLimitationNote?: string;
        downloadCsvUrl?: string;
        alreadyImported?: boolean;
        alreadyShipped?: boolean;
        awbNumber?: string | null;
        courierName?: string | null;
      };
    }>('/shipping/nimbus/push-new-orders', { orderId, ...options }),

  // Option C: Push Order to NimbusPost Manual (backward compatible alias)
  pushOrderToNimbusManual: (orderId: string, options?: { pickupPincode?: string; forceRetry?: boolean }) =>
    apiClient.post<{
      success: boolean;
      message: string;
      data: {
        order: any;
        shipment: any;
        orderId: string;
        orderNumber: string;
        nimbusOrderId: string;
        dashboardUrl: string;
        orderStatus: string;
        shipmentStatus: string;
        isBooked: boolean;
        importStatus?: 'NOT_IMPORTED' | 'IMPORTING' | 'IMPORTED_TO_NIMBUSPOST' | 'IMPORT_FAILED' | 'SHIPMENT_CREATED';
        apiLimitation?: boolean;
        apiLimitationNote?: string;
        downloadCsvUrl?: string;
        alreadyImported?: boolean;
        alreadyShipped?: boolean;
        awbNumber?: string | null;
        courierName?: string | null;
      };
    }>('/shipping/nimbus/push-order', { orderId, ...options }),

  // Option C: Export NimbusPost Bulk Order CSV
  exportNimbusOrderCsv: async (orderId: string): Promise<Blob> => {
    const res = await apiClient.get(`/shipping/nimbus/export-csv/${orderId}`, { responseType: 'blob' });
    return res.data;
  },

  // Option C: Mark Order CSV as Generated
  markOrderCsvGenerated: (orderId: string) =>
    apiClient.post<{ success: boolean; message: string; data: { order: any } }>(
      '/shipping/nimbus/mark-csv-generated',
      { orderId }
    ),

  // Option C: Confirm Order Uploaded to NimbusPost Bulk Upload
  confirmNimbusPostImported: (orderId: string) =>
    apiClient.post<{ success: boolean; message: string; data: { order: any; shipment: any } }>(
      '/shipping/nimbus/confirm-imported',
      { orderId }
    ),

  // Synchronize Order Tracking Status from NimbusPost
  syncNimbusShipment: (orderId: string) =>
    apiClient.post<{ success: boolean; message: string; data: { order: any; shipment: any; isBooked?: boolean } }>(
      `/shipping/nimbus/sync/${orderId}`
    ),

  // Option C Legacy: Record NimbusPost Manual Shipment
  recordNimbusManualShipment: (data: {
    orderId: string;
    awbNumber: string;
    trackingNumber?: string;
    courierName?: string;
    trackingUrl?: string;
    nimbusPostShipmentId?: string;
    dispatchDate?: string;
    dispatchedAt?: string;
    estimatedDelivery?: string;
    shippingNotes?: string;
  }) => apiClient.post<{ success: boolean; message: string; data: any }>('/shipping/nimbus/manual-record', data),

  // Manual Shipping Endpoints
  createManualShipment: (data: {
    orderId: string;
    courierName: string;
    trackingNumber: string;
    trackingUrl?: string;
    dispatchDate?: string;
    dispatchedAt?: string;
    estimatedDelivery?: string;
    shippingNotes?: string;
    notifyCustomer?: boolean;
  }) => apiClient.post<{ success: boolean; message: string; data: any }>('/shipping/manual-shipment', data),
  resetShipment: (orderId: string) =>
    apiClient.post<{ success: boolean; message: string; data: any }>('/shipping/reset-shipment', { orderId }),
};

// Hero Slides API
export const heroSlidesApi = {
  getActive: () => apiClient.get<{ success: boolean; data: HeroSlide[] }>('/hero-slides'),
  getAll: () => apiClient.get<{ success: boolean; data: HeroSlide[] }>('/hero-slides?includeInactive=true'),
  getAdminAll: () => apiClient.get<{ success: boolean; data: HeroSlide[] }>('/hero-slides/admin'),
  create: (data: any) => apiClient.post<{ success: boolean; message: string; data: HeroSlide }>('/hero-slides', data),
  update: (id: string, data: any) => apiClient.put<{ success: boolean; message: string; data: HeroSlide }>(`/hero-slides/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/hero-slides/${id}`),
  reorder: (order: string[]) => apiClient.put<{ success: boolean; message: string; data: HeroSlide[] }>('/hero-slides/reorder', { order }),
  toggleStatus: (id: string, status?: string) => apiClient.patch<{ success: boolean; message: string; data: HeroSlide }>(`/hero-slides/${id}/status`, { status }),
};

// Reviews API
export const reviewsApi = {
  getByProduct: (productId: string) => apiClient.get<{ success: boolean; data: Review[] }>(`/reviews/product/${productId}`),
  create: (data: any) => apiClient.post('/reviews', data),
  getAdminReviews: () => apiClient.get<{ success: boolean; data: Review[] }>('/reviews/admin'),
  updateStatus: (id: string, status: string) => apiClient.put(`/reviews/admin/${id}/status`, { status }),
};

// Settings API
export const settingsApi = {
  get: () => apiClient.get<{ success: boolean; data: { settings: SiteSettings; exchangeRates: ExchangeRate[] } }>('/settings'),
  update: (settings: any) => apiClient.put('/settings', { settings }),
  updateExchangeRates: (rates: any[]) => apiClient.put('/settings/exchange-rates', { rates }),
};

// Search API
export const searchApi = {
  search: (q: string) => apiClient.get<{ success: boolean; data: any }>(`/search?q=${encodeURIComponent(q)}`),
};

// Admin Dashboard API
export const adminApi = {
  getStats: () => apiClient.get<{ success: boolean; data: any }>('/admin/dashboard'),
  getCustomers: (params?: any) => apiClient.get<{ success: boolean; data: any }>('/admin/customers', { params }),
};

// Upload API
export const uploadApi = {
  uploadSingle: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: { url: string; key: string } }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadMultiple: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: { url: string; key: string }[] }>('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadHamperPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{
      success: boolean;
      data: { url: string; key: string; originalName: string; size: number; mimeType: string };
    }>('/upload/hamper-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultipleHamperPhotos: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiClient.post<{
      success: boolean;
      data: { url: string; key: string; originalName: string; size: number; mimeType: string }[];
    }>('/upload/hamper-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteHamperPhoto: (key: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/upload/hamper-photo/${encodeURIComponent(key)}`),
};

// WhatsApp Communication API
export const whatsappApi = {
  getConfig: () =>
    apiClient.get<{ success: boolean; data: WhatsAppConfig }>('/whatsapp/config'),

  uploadMedia: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.post<{
      success: boolean;
      message: string;
      data: WhatsAppMediaItem[];
    }>('/whatsapp/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteMedia: (key: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/whatsapp/media/${encodeURIComponent(key)}`
    ),

  sendOrder: (data: { orderId?: string; payload?: any }) =>
    apiClient.post<{
      success: boolean;
      mode: 'CLOUD_API' | 'CLICK_TO_CHAT_FALLBACK';
      messageId?: string;
      fallbackUrl?: string;
      reason?: string;
      error?: string;
    }>('/whatsapp/send-order', data),

  getClickToChatUrl: (payload: any) =>
    apiClient.post<{ success: boolean; data: { url: string } }>('/whatsapp/click-to-chat', {
      payload,
    }),
};

// Admin QR Code Generator API
export const qrCodeApi = {
  getAll: () =>
    apiClient.get<{ success: boolean; data: QrCodeItem[] }>('/admin/qr-codes'),

  create: (data: { youtubeUrl: string; label?: string }) =>
    apiClient.post<{ success: boolean; message: string; data: QrCodeItem }>('/admin/qr-codes', data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string; affected?: number }>(
      `/admin/qr-codes/${encodeURIComponent(id)}`
    ),
};

