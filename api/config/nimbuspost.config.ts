import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized NimbusPost Shipping Configuration Module
 * 
 * Manages environment variables, default fallback values,
 * URL normalization, and Indian Postal PIN code validation.
 */

export interface NimbusPostConfigObject {
  env: 'test' | 'production';
  isTestMode: boolean;
  apiBaseUrl: string;
  baseUrl: string;
  pickupPincode: string;
  pickupLocation: string;
  email: string;
  password: string;
  apiKey: string;
  secret: string;
  token: string;
  mockSimulation: boolean;
  defaultPickupAddress: string;
  defaultPickupCity: string;
  defaultPickupState: string;
  defaultPickupPhone: string;
  defaultCourier: string;
}

export const nimbusPostConfig = {
  /**
   * Environment mode: 'test' (sandbox simulation/test API) or 'production' (live dispatch)
   */
  get env(): 'test' | 'production' {
    const val = (process.env.NIMBUSPOST_ENV || 'test').toLowerCase().trim();
    return val === 'production' ? 'production' : 'test';
  },

  get isTestMode(): boolean {
    return this.env === 'test';
  },

  /**
   * Base API root domain (e.g. https://api.nimbuspost.com)
   */
  get apiBaseUrl(): string {
    const raw = (
      process.env.NIMBUSPOST_API_BASE_URL ||
      process.env.NIMBUSPOST_BASE_URL ||
      'https://api.nimbuspost.com'
    ).trim().replace(/\/+$/, '');
    return raw;
  },

  /**
   * Normalized API v1 URL endpoint (e.g. https://api.nimbuspost.com/v1)
   */
  get baseUrl(): string {
    const root = this.apiBaseUrl;
    return root.endsWith('/v1') ? root : `${root}/v1`;
  },

  /**
   * Authoritative Pickup Pincode for Dispatch Hub
   * Falls back to "560001" if NIMBUSPOST_PICKUP_PINCODE is missing from environment.
   */
  get pickupPincode(): string {
    return (process.env.NIMBUSPOST_PICKUP_PINCODE || '560001').trim();
  },

  /**
   * Warehouse / Pickup Location Nickname (must match registered name in NimbusPost Seller Dashboard)
   */
  get pickupLocation(): string {
    return (process.env.NIMBUSPOST_PICKUP_LOCATION || 'Dhanyasree 1').trim();
  },

  get email(): string {
    return (process.env.NIMBUSPOST_EMAIL || '').trim();
  },

  get password(): string {
    return (process.env.NIMBUSPOST_PASSWORD || '').trim();
  },

  get apiKey(): string {
    return (process.env.NIMBUSPOST_API_KEY || '').trim();
  },

  get secret(): string {
    return (process.env.NIMBUSPOST_SECRET || '').trim();
  },

  get token(): string {
    return (process.env.NIMBUSPOST_TOKEN || process.env.NIMBUSPOST_AUTH_TOKEN || '').trim();
  },

  get mockSimulation(): boolean {
    return (process.env.NIMBUSPOST_MOCK_SIMULATION || '').toLowerCase() === 'true';
  },

  defaultPickupAddress: 'Nest Care Central Medical & Hamper Hub, Indiranagar',
  defaultPickupCity: 'Bengaluru',
  defaultPickupState: 'Karnataka',
  defaultPickupPhone: '+91  8921342411',
  defaultCourier: 'Delhivery Surface Express',

  /**
   * Validate Indian 6-digit Postal PIN Code
   */
  validatePincode(pincode?: string | number): { isValid: boolean; error?: string; cleanPincode?: string } {
    if (pincode === undefined || pincode === null) {
      return { isValid: false, error: 'Postal PIN code is required.' };
    }
    const clean = String(pincode).replace(/\D/g, '').trim();
    if (clean.length !== 6) {
      return {
        isValid: false,
        error: `Invalid Indian Postal PIN code: '${pincode}'. Must be exactly 6 digits.`,
      };
    }
    if (clean.startsWith('0')) {
      return {
        isValid: false,
        error: `Invalid Indian Postal PIN code: '${pincode}'. Indian postal PIN codes cannot start with 0.`,
      };
    }
    return { isValid: true, cleanPincode: clean };
  },

  /**
   * Safe data sanitizer for logging: strips passwords, keys, tokens, and authorization headers
   */
  sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((d) => this.sanitizeData(d));

    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'authorization',
      'api_key',
      'apikey',
      'jwt',
      'cookie',
      'accesstoken',
      'access_token',
    ];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },
};

export default nimbusPostConfig;
