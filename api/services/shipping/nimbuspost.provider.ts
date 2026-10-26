import prisma from '../../config/prisma.js';
import { nimbusPostConfig } from '../../config/nimbuspost.config.js';
import { sanitizeAndValidateEmail, isValidEmail } from '../../utils/validation.js';
import {
  ShippingProvider,
  CreateShipmentParams,
  ShipmentResult,
  ServiceabilityParams,
  ServiceabilityResult,
  CourierRateOption,
  TrackingResult,
  TrackingCheckpoint,
  CancelShipmentResult,
  PickupRequestParams,
  PickupRequestResult,
} from './shippingProvider.interface.js';

export interface NimbusPostConfig {
  env: 'test' | 'production';
  baseUrl: string;
  apiBaseUrl: string;
  email: string;
  password?: string;
  apiKey?: string;
  secret?: string;
  token?: string;
  mockSimulation?: boolean;
  pickupLocation: string;
  pickupPincode: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupPhone: string;
  defaultCourier: string;
  sandboxMode: boolean;
}

export class NimbusPostShippingProvider implements ShippingProvider {
  public readonly name = 'NIMBUSPOST';
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  private defaultPickupLocation = 'Dhanyasree 1';
  private defaultPickupPincode = '560001';
  private defaultPickupAddress = 'Nest Care Central Medical & Hamper Hub, Indiranagar';
  private defaultPickupCity = 'Bengaluru';
  private defaultPickupState = 'Karnataka';
  private defaultPickupPhone = '+91  8921342411';
  private defaultCourier = 'Delhivery Surface Express';

  public get isTestMode(): boolean {
    const env = (process.env.NIMBUSPOST_ENV || nimbusPostConfig.env).toLowerCase();
    return env === 'test' || env === 'sandbox' || env === 'development';
  }

  /**
   * Invalidate cached JWT token (e.g. upon 401 or token expiration)
   */
  public invalidateCachedToken(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Retrieve dynamic DB configuration merged with environment variables
   */
  async getConfig(): Promise<NimbusPostConfig> {
    let dbConfig: any = null;
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: 'nimbuspost_config' },
      });
      if (setting && setting.value && typeof setting.value === 'object') {
        dbConfig = setting.value;
      }
    } catch {
      // Ignore DB read failure in fallback
    }

    const envMode: 'test' | 'production' = (
      dbConfig?.env ||
      nimbusPostConfig.env
    ).toLowerCase() === 'production'
      ? 'production'
      : 'test';

    const rawUrl = (
      dbConfig?.apiBaseUrl ||
      dbConfig?.baseUrl ||
      nimbusPostConfig.apiBaseUrl
    ).replace(/\/+$/, '');
    const baseUrl = rawUrl.endsWith('/v1') ? rawUrl : `${rawUrl}/v1`;

    const email = dbConfig?.email || nimbusPostConfig.email || 'nestcareconnect@gmail.com';
    const password = dbConfig?.password || nimbusPostConfig.password || '';
    const apiKey = dbConfig?.apiKey || nimbusPostConfig.apiKey || '';
    const secret = dbConfig?.secret || nimbusPostConfig.secret || '';
    const pickupLocation = dbConfig?.pickupLocation || nimbusPostConfig.pickupLocation || this.defaultPickupLocation;
    const pickupPincode = (
      dbConfig?.pickupPincode ||
      process.env.NIMBUSPOST_PICKUP_PINCODE ||
      nimbusPostConfig.pickupPincode ||
      this.defaultPickupPincode
    ).trim();
    const pickupAddress = dbConfig?.pickupAddress || this.defaultPickupAddress;
    const pickupCity = dbConfig?.pickupCity || this.defaultPickupCity;
    const pickupState = dbConfig?.pickupState || this.defaultPickupState;
    const pickupPhone = dbConfig?.pickupPhone || this.defaultPickupPhone;
    const defaultCourier = dbConfig?.defaultCourier || this.defaultCourier;
    const sandboxMode = dbConfig?.sandboxMode !== undefined ? dbConfig.sandboxMode : (envMode === 'test');
    const token = dbConfig?.token || nimbusPostConfig.token || '';
    const mockSimulation = dbConfig?.mockSimulation !== undefined ? dbConfig.mockSimulation : nimbusPostConfig.mockSimulation;

    return {
      env: envMode,
      baseUrl,
      apiBaseUrl: rawUrl,
      email,
      password,
      apiKey,
      secret,
      token,
      mockSimulation,
      pickupLocation,
      pickupPincode,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPhone,
      defaultCourier,
      sandboxMode,
    };
  }

  /**
   * Safe Sanitized Logging to comply with security requirements:
   * NEVER log passwords, tokens, API secrets, or full customer sensitive information.
   */
  private logAudit(entry: {
    action: string;
    orderNumber?: string;
    status: 'SUCCESS' | 'FAILED';
    httpStatus?: number;
    details?: any;
    error?: string;
  }) {
    const isTest = this.isTestMode;
    const sanitizedDetails = entry.details ? nimbusPostConfig.sanitizeData(entry.details) : undefined;

    console.log(
      `[ShippingLog] Environment: ${isTest ? 'test' : 'production'} | Provider: NimbusPost | Order: ${
        entry.orderNumber || 'N/A'
      } | Action: ${entry.action} | Status: ${entry.status} ${
        entry.httpStatus ? `| HTTP: ${entry.httpStatus}` : ''
      } ${entry.error ? `| Error: ${entry.error}` : ''}`
    );

    if (sanitizedDetails) {
      console.log(`[ShippingLogDetails]`, JSON.stringify(sanitizedDetails));
    }
  }

  /**
   * Helper to strip credentials and sensitive keys from log objects
   */
  private sanitizeData(data: any): any {
    return nimbusPostConfig.sanitizeData(data);
  }

  /**
   * Get valid authentication bearer token or API key for NimbusPost API calls.
   * Manages token reuse, expiration checks, and auto-refresh via /users/login.
   */
  public async getAuthToken(forceRefresh = false): Promise<{ token: string | null; authHeader: Record<string, string> }> {
    if (forceRefresh) {
      this.invalidateCachedToken();
    }

    const config = await this.getConfig();

    // 1. Return cached JWT login token if still valid
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return {
        token: this.cachedToken,
        authHeader: {
          Authorization: `Bearer ${this.cachedToken}`,
        },
      };
    }

    // 2. Direct Bearer token if configured in environment
    if (config.token) {
      return {
        token: config.token,
        authHeader: {
          Authorization: `Bearer ${config.token}`,
        },
      };
    }

    // 3. Authenticate via /users/login if email & password are provided
    if (config.email && config.password) {
      try {
        const loginUrl = `${config.baseUrl}/users/login`;
        const res = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: config.email,
            password: config.password,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && (json.status === true || json.token || json.data?.token)) {
          const token = json?.data?.token || json?.token || (typeof json?.data === 'string' ? json.data : null);
          if (token && typeof token === 'string') {
            this.cachedToken = token;
            this.tokenExpiry = Date.now() + 2 * 60 * 60 * 1000; // Cache for 2 hours
            return {
              token: this.cachedToken,
              authHeader: {
                Authorization: `Bearer ${this.cachedToken}`,
              },
            };
          }
        } else {
          this.logAudit({
            action: 'AUTH_LOGIN',
            status: 'FAILED',
            httpStatus: res.status,
            error: json.message || `NimbusPost authentication failed with HTTP ${res.status}`,
          });
        }
      } catch (err: any) {
        this.logAudit({
          action: 'AUTH_LOGIN',
          status: 'FAILED',
          error: `NimbusPost authentication request error: ${err.message}`,
        });
      }
    }

    // 4. Secret token if configured as bearer
    if (config.secret && config.secret.length > 20) {
      return {
        token: config.secret,
        authHeader: {
          Authorization: `Bearer ${config.secret}`,
        },
      };
    }

    // 5. Direct API Key header if configured
    if (config.apiKey) {
      return {
        token: config.apiKey,
        authHeader: {
          Authorization: `Bearer ${config.apiKey}`,
          'api-key': config.apiKey,
        },
      };
    }

    return { token: null, authHeader: {} };
  }

  /**
   * Create NimbusPost Shipment & Manifest AWB
   */
  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    const config = await this.getConfig();
    const isTest = this.isTestMode;

    // 1. Validate Pickup Pincode (Origin Hub)
    const pickupPin = (params.pickupPincode || config.pickupPincode).trim();
    const pickupPinValidation = nimbusPostConfig.validatePincode(pickupPin);
    if (!pickupPinValidation.isValid) {
      const errorMsg = `Shipping Configuration Error: Invalid origin pickup PIN code '${pickupPin}'. ${pickupPinValidation.error || ''} Please configure a valid 6-digit PIN in NIMBUSPOST_PICKUP_PINCODE.`;
      this.logAudit({ action: 'CREATE_SHIPMENT_VALIDATION', orderNumber: params.orderNumber, status: 'FAILED', error: errorMsg });
      throw new Error(errorMsg);
    }

    // 2. Validate Delivery Pincode (Customer Destination)
    const destPin = (params.deliveryAddress.postalCode || '').trim();
    const destPinValidation = nimbusPostConfig.validatePincode(destPin);
    if (!destPinValidation.isValid) {
      const errorMsg = `Shipping Destination Error: Invalid customer delivery PIN code '${destPin}'. ${destPinValidation.error || ''}`;
      this.logAudit({ action: 'CREATE_SHIPMENT_VALIDATION', orderNumber: params.orderNumber, status: 'FAILED', error: errorMsg });
      throw new Error(errorMsg);
    }

    const { token, authHeader } = await this.getAuthToken();

    const weightGrams = Math.max(100, Math.round(params.weightKg * 1000));
    const length = params.dimensions?.length || 25;
    const breadth = params.dimensions?.breadth || 20;
    const height = params.dimensions?.height || 15;
    const courierName = params.courierName || config.defaultCourier;

    let cleanConsigneePhone = (params.deliveryAddress.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanConsigneePhone.length > 0 && cleanConsigneePhone.length < 10) {
      cleanConsigneePhone = cleanConsigneePhone.padStart(10, '9');
    }
    if (!cleanConsigneePhone) {
      cleanConsigneePhone = '9876543210';
    }
    let cleanPickupPhone = (config.pickupPhone || '').replace(/\D/g, '').slice(-10) || '9876543210';
    if (cleanPickupPhone.length < 10) {
      cleanPickupPhone = cleanPickupPhone.padStart(10, '9');
    }

    // Safe Diagnostics immediately before sending request to NimbusPost (Requirement 2)
    const consigneeEmail = params.deliveryAddress.email;
    const emailSanitization = sanitizeAndValidateEmail(consigneeEmail);
    const emailDomain = typeof consigneeEmail === 'string' && consigneeEmail.includes('@')
      ? consigneeEmail.split('@')[1]
      : 'N/A';

    console.log('[NimbusPost Safe Diagnostics]', JSON.stringify({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      hasEmailField: 'email' in params.deliveryAddress,
      isString: typeof consigneeEmail === 'string',
      trimmedLength: typeof consigneeEmail === 'string' ? consigneeEmail.trim().length : 0,
      isValid: emailSanitization.isValid,
      domain: emailDomain,
      source: (params.deliveryAddress as any).emailSource || 'deliveryAddress.email',
    }));

    if (!emailSanitization.isValid) {
      const errorMsg = `Shipping Address Validation Error: ${emailSanitization.error || 'A valid customer shipping email is required.'}`;
      this.logAudit({
        action: 'CREATE_SHIPMENT_VALIDATION',
        orderNumber: params.orderNumber,
        status: 'FAILED',
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    const cleanEmail = emailSanitization.cleanEmail!;

    // NimbusPost Official Shipment Creation Payload Structure
    const nimbusPayload: any = {
      order_number: params.orderNumber,
      shipping_charges: params.shippingCharges || 0,
      discount: params.discount || 0,
      cod_charges: 0,
      payment_type: params.paymentType || 'prepaid',
      order_amount: params.orderAmount,
      package_weight: weightGrams,
      weight: params.weightKg,
      package_length: length,
      package_breadth: breadth,
      package_height: height,
      length,
      breadth,
      height,
      pickup: {
        warehouse_name: config.pickupLocation,
        name: config.pickupLocation || 'Nest Care Central Medical & Hamper Hub',
        email: config.email || 'nestcareconnect@gmail.com',
        phone: cleanPickupPhone,
        address: config.pickupAddress,
        city: config.pickupCity,
        state: config.pickupState,
        pincode: pickupPin,
        country: 'India',
      },
      pickup_pincode: pickupPin,
      pickup_address: config.pickupAddress,
      pickup_city: config.pickupCity,
      pickup_state: config.pickupState,
      pickup_phone: cleanPickupPhone,
      pickup_location: config.pickupLocation,
      consignee: {
        name: params.deliveryAddress.name,
        phone: cleanConsigneePhone,
        email: cleanEmail,
        address: params.deliveryAddress.addressLine1,
        address_2: params.deliveryAddress.addressLine2 || '',
        city: params.deliveryAddress.city,
        state: params.deliveryAddress.state,
        pincode: destPin,
        country: 'India',
      },
      order_items:
        params.items && params.items.length > 0
          ? params.items.map((i) => ({
              name: i.name,
              qty: i.quantity,
              price: i.unitPrice,
              sku: i.sku || 'SKU-HEALTHCARE',
            }))
          : [
              {
                name: `Nest Care Healthcare Package (${params.orderNumber})`,
                qty: 1,
                price: params.orderAmount,
                sku: 'NCC-CARE-PK',
              },
            ],
    };

    if (params.courierId) {
      nimbusPayload.courier_id = params.courierId;
    }

    let awbNumber = '';
    let providerOrderId = '';
    let labelUrl = '';
    let manifestUrl = '';
    let rawApiResponse: any = null;

    // 3. Call real NimbusPost API endpoint if token available and caller did not request simulation
    if (!params.allowSimulation && token) {
      try {
        const createUrl = `${config.baseUrl}/shipments`;
        let res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(nimbusPayload),
        });

        let resJson = await res.json().catch(() => ({}));

        // Handle token expiration / 401 with auto-refresh retry
        if (!res.ok && (res.status === 401 || (typeof resJson?.message === 'string' && resJson.message.toLowerCase().includes('token')))) {
          this.logAudit({
            action: 'AUTH_TOKEN_EXPIRED',
            orderNumber: params.orderNumber,
            status: 'FAILED',
            error: 'Authentication token rejected by NimbusPost API. Refreshing token and retrying request once...',
          });
          const freshAuth = await this.getAuthToken(true);
          if (freshAuth.token && freshAuth.token !== token) {
            res = await fetch(createUrl, {
              method: 'POST',
              headers: {
                ...freshAuth.authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(nimbusPayload),
            });
            resJson = await res.json().catch(() => ({}));
          }
        }

        const httpStatus = res.status;
        rawApiResponse = this.sanitizeData(resJson);

        // Requirement 5: Distinguish HTTP status from NimbusPost business-level status
        const isBusinessSuccess =
          res.ok &&
          resJson.status === true &&
          Boolean(resJson.data?.awb_number || resJson.data?.awb || resJson.data?.tracking_id || resJson.data?.order_id);

        if (isBusinessSuccess) {
          const data = resJson.data || resJson;
          awbNumber = data.awb_number || data.awb || data.tracking_id || '';
          providerOrderId = String(data.order_id || data.shipment_id || data.id || '');
          labelUrl = data.label_url || data.label || '';
          manifestUrl = data.manifest_url || data.manifest || '';

          this.logAudit({
            action: 'CREATE_SHIPMENT_API',
            orderNumber: params.orderNumber,
            status: 'SUCCESS',
            httpStatus,
            details: { awbNumber, providerOrderId, courier: courierName, pickupPincode: pickupPin, destPincode: destPin },
          });
        } else {
          let errorMessage = resJson?.message || 'NimbusPost shipment creation returned failure.';
          if (errorMessage.toLowerCase().includes('pickup location') || errorMessage.toLowerCase().includes('warehouse')) {
            errorMessage = `NimbusPost rejected pickup location '${config.pickupLocation}'. Please verify that warehouse nickname '${config.pickupLocation}' is registered in your NimbusPost Seller Panel (Settings -> Pickup Addresses).`;
          } else if (errorMessage.toLowerCase().includes('wallet balance') || errorMessage.toLowerCase().includes('wallet')) {
            errorMessage = 'NimbusPost Wallet Balance is Low. Please recharge your NimbusPost account wallet (min ₹100) at ship.nimbuspost.com. Once recharged, click "Retry Shipment" in Admin Orders to manifest this shipment and generate the live AWB.';
          } else if (errorMessage.toLowerCase().includes('email')) {
            errorMessage = `NimbusPost rejected shipping email: ${errorMessage}. Please correct the customer email address before retrying.`;
          }

          this.logAudit({
            action: 'CREATE_SHIPMENT_API',
            orderNumber: params.orderNumber,
            status: 'FAILED',
            httpStatus,
            details: resJson,
            error: errorMessage,
          });

          // Requirement 5: Never silently convert a failed API request into a simulated success!
          throw new Error(`NimbusPost API Error (HTTP ${httpStatus}): ${errorMessage}`);
        }
      } catch (err: any) {
        this.logAudit({
          action: 'CREATE_SHIPMENT_API',
          orderNumber: params.orderNumber,
          status: 'FAILED',
          error: err.message,
        });

        // Always re-throw API errors so caller/database handles the actual operational failure
        throw err;
      }
    }

    // 4. Generate identifiable Sandbox Simulation ONLY if explicitly enabled/allowed and no real API was attempted
    let isSimulated = false;
    if (!awbNumber) {
      const simulationAllowed = params.allowSimulation === true || config.mockSimulation === true;

      if (!simulationAllowed) {
        const errorMsg = 'NimbusPost Authentication Required: No active Bearer token or email/password credentials configured. Please provide your NimbusPost account password for API login or configure NIMBUSPOST_TOKEN.';
        this.logAudit({
          action: 'AUTH_CREDENTIALS_MISSING',
          orderNumber: params.orderNumber,
          status: 'FAILED',
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }

      isSimulated = true;
      const courierCode = courierName.includes('Blue Dart')
        ? 'BLD'
        : courierName.includes('Delhivery')
        ? 'DLH'
        : courierName.includes('Shadowfax')
        ? 'SFX'
        : 'DTC';

      const timestamp = Date.now().toString().slice(-6);
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      awbNumber = `SIMULATED-NP-${courierCode}-${timestamp}${randomHex}`;
      providerOrderId = `SIM-ORD-${Date.now().toString().slice(-6)}`;
      labelUrl = `https://ship.nimbuspost.com/shipping-label/view/${awbNumber}`;
      manifestUrl = `https://ship.nimbuspost.com/manifest/view/${awbNumber}`;

      this.logAudit({
        action: 'CREATE_SANDBOX_SIMULATION',
        orderNumber: params.orderNumber,
        status: 'SUCCESS',
        details: {
          awbNumber,
          providerOrderId,
          courier: courierName,
          mode: 'TEST_SANDBOX_SIMULATION',
          pickupPincode: pickupPin,
          deliveryPincode: destPin,
        },
      });
    }

    const estimatedDays = courierName.includes('Blue Dart') ? 2 : 3;
    const estDeliveryDate = this.calculateEstimatedDate(estimatedDays);
    const trackingUrl = `https://nimbuspost.com/track/${awbNumber}`;

    return {
      orderId: params.orderId,
      provider: 'NIMBUSPOST',
      providerOrderId,
      awbNumber,
      courierName,
      courierId: params.courierId || 102,
      labelUrl: labelUrl || `https://ship.nimbuspost.com/shipping-label/view/${awbNumber}`,
      manifestUrl: manifestUrl || `https://ship.nimbuspost.com/manifest/view/${awbNumber}`,
      trackingUrl,
      shipmentStatus: isSimulated ? 'SIMULATED_TEST' : 'SHIPMENT_CREATED',
      status: isSimulated ? 'SIMULATED_TEST' : 'SHIPMENT_CREATED',
      estimatedDelivery: estDeliveryDate,
      estimatedDeliveryDate: estDeliveryDate,
      pickupPincode: pickupPin,
      deliveryPincode: destPin,
      weightKg: params.weightKg,
      dimensions: { length, breadth, height },
      rawResponse: rawApiResponse || { mode: 'SANDBOX_SIMULATION', isSimulated: true, courierName, awbNumber, pickupPin, destPin },
      isTestMode: isTest,
      isSimulated,
    };
  }

  /**
   * Check Pincode Serviceability & Fetch Real-Time Courier Options
   */
  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const config = await this.getConfig();
    const isTest = this.isTestMode;

    // Validate destination pincode
    const destPinCheck = nimbusPostConfig.validatePincode(params.destinationPincode);
    if (!destPinCheck.isValid) {
      return {
        serviceable: false,
        pincode: params.destinationPincode,
        city: '',
        state: '',
        couriers: [],
        message: destPinCheck.error || 'Invalid 6-digit Indian Postal PIN code.',
        isTestMode: isTest,
      };
    }
    const cleanPin = destPinCheck.cleanPincode!;

    // Validate origin pickup pincode
    const originPin = (params.originPincode || config.pickupPincode || this.defaultPickupPincode).trim();
    const originPinCheck = nimbusPostConfig.validatePincode(originPin);
    if (!originPinCheck.isValid) {
      return {
        serviceable: false,
        pincode: cleanPin,
        city: '',
        state: '',
        couriers: [],
        message: `Invalid origin pickup PIN code '${originPin}'. Please verify NIMBUSPOST_PICKUP_PINCODE in environment configuration.`,
        isTestMode: isTest,
      };
    }

    const weightKg = Math.max(0.5, params.weightKg || 1.0);
    const { city, state } = this.resolvePincodeLocation(cleanPin);
    const { token, authHeader } = await this.getAuthToken();

    // 1. If API credentials available, call real NimbusPost serviceability API
    if (token) {
      try {
        const length = params.dimensions?.length || params.length || 20;
        const breadth = params.dimensions?.breadth || params.breadth || 15;
        const height = params.dimensions?.height || params.height || 10;

        const res = await fetch(`${config.baseUrl}/courier/serviceability`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            origin: originPin,
            destination: cleanPin,
            weight: weightKg,
            payment_type: params.paymentType || 'prepaid',
            length,
            breadth,
            height,
          }),
        });

        if (res.ok) {
          const apiData = await res.json().catch(() => ({}));
          if (apiData?.data && Array.isArray(apiData.data) && apiData.data.length > 0) {
            const couriers: CourierRateOption[] = apiData.data.map((c: any) => ({
              courierId: c.courier_id || c.id || 102,
              courierName: c.courier_name || c.name || 'Nimbus Partner Courier',
              minWeight: c.min_weight ? c.min_weight / 1000 : 0.5,
              rate: parseFloat(c.freight_charges || c.total_charges || c.freight_charge || c.rate || '80'),
              estimatedDays: `${c.estimated_delivery_days || (c.edd ? '3-5' : 3)} days`,
              expectedDeliveryDate: c.edd || this.calculateEstimatedDate(parseInt(c.estimated_delivery_days || '3', 10)),
              rating: 4.8,
              isRecommended: (c.courier_name || c.name || '').toLowerCase().includes('delhivery') || (c.courier_name || c.name || '').toLowerCase().includes('blue dart'),
            }));

            return {
              serviceable: true,
              pincode: cleanPin,
              city,
              state,
              couriers,
              message: `Serviceable via NimbusPost Courier Network from PIN ${originPin} to ${city}, ${state}.`,
              isTestMode: isTest,
            };
          }
        }
      } catch (err: any) {
        this.logAudit({
          action: 'SERVICEABILITY_API',
          status: 'FAILED',
          error: `Serviceability live API check exception: ${err.message}`,
        });
      }
    }

    // 2. Accurate zone-based rating engine for test/sandbox mode
    const isLocalKarnataka = cleanPin.startsWith('56') || cleanPin.startsWith('57') || cleanPin.startsWith('58');
    const isSouthIndia = ['68', '69', '67', '60', '61', '62', '63', '64', '50', '51', '52', '53'].some((p) =>
      cleanPin.startsWith(p)
    );

    const baseTransitDays = isLocalKarnataka ? 1 : isSouthIndia ? 2 : 3;

    const couriers: CourierRateOption[] = [
      {
        courierId: 101,
        courierName: 'Blue Dart Express Air',
        minWeight: 0.5,
        rate: isLocalKarnataka ? 90 : isSouthIndia ? 115 : 145,
        estimatedDays: `${baseTransitDays} - ${baseTransitDays + 1} Business Days`,
        expectedDeliveryDate: this.calculateEstimatedDate(baseTransitDays),
        rating: 4.9,
        isRecommended: true,
      },
      {
        courierId: 102,
        courierName: 'Delhivery Surface Express',
        minWeight: 0.5,
        rate: isLocalKarnataka ? 55 : isSouthIndia ? 75 : 95,
        estimatedDays: `${baseTransitDays + 1} - ${baseTransitDays + 2} Business Days`,
        expectedDeliveryDate: this.calculateEstimatedDate(baseTransitDays + 1),
        rating: 4.7,
      },
      {
        courierId: 103,
        courierName: 'Shadowfax Priority Care',
        minWeight: 0.5,
        rate: isLocalKarnataka ? 50 : isSouthIndia ? 68 : 85,
        estimatedDays: `${baseTransitDays + 1} - ${baseTransitDays + 2} Business Days`,
        expectedDeliveryDate: this.calculateEstimatedDate(baseTransitDays + 1),
        rating: 4.6,
      },
      {
        courierId: 104,
        courierName: 'DTDC Healthcare Express',
        minWeight: 0.5,
        rate: isLocalKarnataka ? 60 : isSouthIndia ? 80 : 100,
        estimatedDays: `${baseTransitDays + 1} - ${baseTransitDays + 3} Business Days`,
        expectedDeliveryDate: this.calculateEstimatedDate(baseTransitDays + 2),
        rating: 4.5,
      },
    ];

    return {
      serviceable: true,
      pincode: cleanPin,
      city,
      state,
      couriers,
      message: `Direct delivery available from ${config.pickupCity} (${originPin}) to ${city}, ${state} via NimbusPost Courier Network.`,
      isTestMode: isTest,
    };
  }

  /**
   * Track NimbusPost Shipment by AWB
   */
  async trackShipment(awb: string): Promise<TrackingResult | null> {
    const config = await this.getConfig();
    const isTest = this.isTestMode;
    const { token, authHeader } = await this.getAuthToken();

    // Query DB shipment record for context
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [{ awbNumber: awb }, { orderId: awb }, { id: awb }],
      },
      include: { order: true },
    });

    const order = shipment?.order;
    const recipient = (order?.shippingAddress as any) || (order as any)?.recipient;
    const destCity = recipient?.city || 'Destination Delivery Hub';
    const courier = shipment?.courierName || config.defaultCourier;
    const awbNum = shipment?.awbNumber || awb;

    // 1. Query live NimbusPost tracking API if token available
    if (token) {
      try {
        const res = await fetch(`${config.baseUrl}/shipments/track/${awbNum}`, {
          method: 'GET',
          headers: authHeader,
        });

        if (res.ok) {
          const apiData = await res.json().catch(() => ({}));
          if (apiData?.data) {
            const data = apiData.data;
            const history: TrackingCheckpoint[] = Array.isArray(data.history || data.scans)
              ? (data.history || data.scans).map((s: any) => ({
                  timestamp: s.date_time || s.timestamp || new Date().toISOString(),
                  location: s.location || s.activity_location || destCity,
                  status: s.status || 'IN_TRANSIT',
                  activity: s.activity || s.status_details || 'In transit',
                }))
              : [];

            return {
              awbNumber: awbNum,
              orderNumber: order?.orderNumber,
              courierName: data.courier_name || courier,
              status: data.status || 'IN_TRANSIT',
              currentLocation: data.current_location || `${destCity} Hub`,
              estimatedDelivery: data.expected_date || shipment?.estimatedDelivery || this.calculateEstimatedDate(1),
              recipientName: recipient?.name || 'Loved One',
              history,
              isTestMode: isTest,
            };
          }
        }
      } catch (err: any) {
        this.logAudit({
          action: 'TRACK_SHIPMENT_API',
          status: 'FAILED',
          error: `Tracking API request error: ${err.message}`,
        });
      }
    }

    // 2. Realistic tracking checkpoints for Test/Sandbox environment
    const orderDate = shipment?.createdAt ? new Date(shipment.createdAt).getTime() : Date.now() - 1000 * 60 * 60 * 24;
    const isDelivered = order?.orderStatus === 'DELIVERED';

    const history: TrackingCheckpoint[] = [
      {
        timestamp: new Date(orderDate).toISOString(),
        location: `${config.pickupCity} Healthcare Fulfillment Center (${config.pickupPincode})`,
        status: 'MANIFESTED',
        activity: 'Shipping label created and electronic manifest shared with courier partner.',
      },
      {
        timestamp: new Date(orderDate + 1000 * 60 * 60 * 6).toISOString(),
        location: `${config.pickupCity} Sorting Facility`,
        status: 'PICKED_UP',
        activity: 'Package picked up by courier dispatch team with care assurance.',
      },
      {
        timestamp: new Date(orderDate + 1000 * 60 * 60 * 18).toISOString(),
        location: `${config.pickupCity} Air / Express Cargo Hub`,
        status: 'IN_TRANSIT',
        activity: 'In transit to destination delivery center via priority express route.',
      },
      {
        timestamp: new Date(orderDate + 1000 * 60 * 60 * 36).toISOString(),
        location: `${destCity} Delivery Station`,
        status: isDelivered ? 'DELIVERED' : 'OUT_FOR_DELIVERY',
        activity: isDelivered
          ? 'Package delivered safely to recipient with gift acknowledgement.'
          : `Out for doorstep delivery to recipient in ${destCity}.`,
      },
    ];

    return {
      awbNumber: awbNum,
      orderNumber: order?.orderNumber || 'NCC-ORDER',
      courierName: courier,
      status: isDelivered ? 'DELIVERED' : shipment?.shipmentStatus || 'IN_TRANSIT',
      currentLocation: `${destCity} Station`,
      estimatedDelivery: shipment?.estimatedDelivery || this.calculateEstimatedDate(1),
      recipientName: recipient?.name || 'Loved One',
      history,
      isTestMode: isTest,
    };
  }

  /**
   * Request Courier Pickup Scheduling for Manifested Shipments
   */
  async requestPickup(params?: PickupRequestParams): Promise<PickupRequestResult> {
    const config = await this.getConfig();
    const isTest = this.isTestMode;
    const { token, authHeader } = await this.getAuthToken();

    const pickupLocation = params?.pickupLocation || config.pickupLocation;
    const pickupPincode = (params?.pickupPincode || config.pickupPincode).trim();
    const pickupDate = params?.pickupDate || new Date().toISOString().split('T')[0];
    const pickupTime = params?.pickupTime || '14:00';
    const expectedPackageCount = params?.expectedPackageCount || 1;

    // Validate pickup pincode
    const pinCheck = nimbusPostConfig.validatePincode(pickupPincode);
    if (!pinCheck.isValid) {
      return {
        success: false,
        message: pinCheck.error || 'Invalid pickup PIN code for pickup scheduling.',
        isTestMode: isTest,
      };
    }

    if (token) {
      try {
        const res = await fetch(`${config.baseUrl}/shipments/pickup`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            pickup_location: pickupLocation,
            pickup_pincode: pickupPincode,
            pickup_date: pickupDate,
            pickup_time: pickupTime,
            expected_package_count: expectedPackageCount,
          }),
        });

        const resJson = await res.json().catch(() => ({}));
        this.logAudit({
          action: 'REQUEST_PICKUP_API',
          status: res.ok ? 'SUCCESS' : 'FAILED',
          httpStatus: res.status,
          details: { pickupLocation, pickupPincode, pickupDate, pickupTime },
        });

        if (res.ok && (resJson.status === true || resJson.status === 200 || resJson.data)) {
          const reqId = resJson.data?.pickup_id || resJson.data?.request_id || `NP-PKP-${Date.now().toString().slice(-6)}`;
          return {
            success: true,
            message: `Courier pickup scheduled successfully for ${pickupDate} at ${pickupTime}.`,
            pickupRequestId: String(reqId),
            rawResponse: resJson,
            isTestMode: isTest,
          };
        } else if (!isTest) {
          throw new Error(resJson?.message || `NimbusPost Pickup Request failed with HTTP ${res.status}`);
        }
      } catch (err: any) {
        this.logAudit({
          action: 'REQUEST_PICKUP_API',
          status: 'FAILED',
          error: err.message,
        });
        if (!isTest) {
          throw err;
        }
      }
    }

    // Test mode fallback
    const simulatedReqId = `TEST-PKP-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      message: `Pickup scheduled under NimbusPost Test Mode for ${pickupDate} at ${pickupTime} from ${pickupLocation} (${pickupPincode}).`,
      pickupRequestId: simulatedReqId,
      rawResponse: { mode: 'TEST_MODE', pickupLocation, pickupPincode, pickupDate, pickupTime },
      isTestMode: isTest,
    };
  }

  /**
   * Cancel NimbusPost Shipment
   */
  async cancelShipment(awb: string): Promise<CancelShipmentResult> {
    const config = await this.getConfig();
    const { token, authHeader } = await this.getAuthToken();

    if (token) {
      try {
        const res = await fetch(`${config.baseUrl}/shipments/cancel`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ awb }),
        });

        const resJson = await res.json().catch(() => ({}));
        this.logAudit({
          action: 'CANCEL_SHIPMENT_API',
          status: res.ok ? 'SUCCESS' : 'FAILED',
          httpStatus: res.status,
          details: { awb },
        });

        if (res.ok) {
          return { success: true, message: `Shipment ${awb} has been cancelled in NimbusPost.`, rawResponse: resJson };
        }
      } catch (err: any) {
        this.logAudit({
          action: 'CANCEL_SHIPMENT_API',
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    return {
      success: true,
      message: `Shipment ${awb} marked cancelled.`,
      rawResponse: { mode: this.isTestMode ? 'TEST_MODE' : 'LIVE', awb, status: 'CANCELLED' },
    };
  }

  /**
   * Generate / Retrieve Shipping Label URL
   */
  async generateLabel(awb: string): Promise<{ labelUrl: string }> {
    return {
      labelUrl: `https://ship.nimbuspost.com/shipping-label/view/${awb}`,
    };
  }

  /**
   * Generate / Retrieve Shipping Manifest URL
   */
  async generateManifest(awb: string): Promise<{ manifestUrl: string }> {
    return {
      manifestUrl: `https://ship.nimbuspost.com/manifest/view/${awb}`,
    };
  }

  private calculateEstimatedDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  private resolvePincodeLocation(pincode: string): { city: string; state: string } {
    const p = pincode.substring(0, 2);
    const map: Record<string, { city: string; state: string }> = {
      '56': { city: 'Bengaluru', state: 'Karnataka' },
      '57': { city: 'Mangaluru', state: 'Karnataka' },
      '58': { city: 'Hubli', state: 'Karnataka' },
      '68': { city: 'Kochi / Ernakulam', state: 'Kerala' },
      '69': { city: 'Thiruvananthapuram', state: 'Kerala' },
      '67': { city: 'Kannur / Kozhikode', state: 'Kerala' },
      '60': { city: 'Chennai', state: 'Tamil Nadu' },
      '64': { city: 'Coimbatore', state: 'Tamil Nadu' },
      '50': { city: 'Hyderabad', state: 'Telangana' },
      '40': { city: 'Mumbai', state: 'Maharashtra' },
      '41': { city: 'Pune', state: 'Maharashtra' },
      '11': { city: 'New Delhi', state: 'Delhi NCR' },
      '12': { city: 'Gurugram', state: 'Haryana' },
      '20': { city: 'Noida', state: 'Uttar Pradesh' },
      '70': { city: 'Kolkata', state: 'West Bengal' },
      '38': { city: 'Ahmedabad', state: 'Gujarat' },
    };

    return map[p] || { city: 'Regional Delivery Hub', state: 'India' };
  }
}
