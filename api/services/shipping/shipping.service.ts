import prisma from '../../config/prisma.js';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  ShippingProvider,
  CreateShipmentParams,
  ShipmentResult,
  ServiceabilityParams,
  ServiceabilityResult,
  TrackingResult,
  CancelShipmentResult,
  PackageDimensions,
  ShipmentItemPayload,
  PickupRequestParams,
  PickupRequestResult,
} from './shippingProvider.interface.js';
import { NimbusPostShippingProvider } from './nimbuspost.provider.js';
import { nimbusPostConfig } from '../../config/nimbuspost.config.js';
import { sanitizeAndValidateEmail } from '../../utils/validation.js';
import {
  calculateCartShipmentPackage,
  PackedShipmentResult,
  calculateVolumetricWeightKg,
  calculateChargeableWeightKg,
} from '../../utils/shippingCalculation.js';

export interface CalculatedOrderPackage {
  weightKg: number;
  dimensions: PackageDimensions;
  itemBreakdown: ShipmentItemPayload[];
  isCustomHamper: boolean;
  boxDetails?: any;
}

export class ShippingService {
  private providers: Map<string, ShippingProvider> = new Map();

  constructor() {
    this.registerProvider('NIMBUSPOST', new NimbusPostShippingProvider());
  }

  registerProvider(name: string, provider: ShippingProvider) {
    this.providers.set(name.toUpperCase(), provider);
  }

  /**
   * Get active shipping provider based on environment configuration
   */
  getProvider(providerName?: string): ShippingProvider {
    const configuredName = (
      providerName ||
      process.env.SHIPPING_PROVIDER ||
      'NIMBUSPOST'
    ).toUpperCase();

    const provider = this.providers.get(configuredName) || this.providers.get('NIMBUSPOST');
    if (!provider) {
      const fallback = new NimbusPostShippingProvider();
      this.registerProvider('NIMBUSPOST', fallback);
      return fallback;
    }
    return provider;
  }

  /**
   * Authoritative Package Weight and Dimensions Calculation from Order Contents:
   * 1. Normal Products: quantity * product weight
   * 2. Predefined Hampers: constituent products + hamper box tare weight
   * 3. Customized Hampers: selected hamper box + all constituent products + packaging
   * 4. Enforces non-zero fallback validation
   */
  async calculatePackageDetails(order: any): Promise<CalculatedOrderPackage> {
    const items = order.items || [];
    let totalWeightKg = 0;
    let maxDim: PackageDimensions = { length: 25, breadth: 20, height: 10 };
    let isCustomHamper = false;
    let selectedBoxDetails: any = null;
    const itemBreakdown: ShipmentItemPayload[] = [];

    const DEFAULT_PRODUCT_WEIGHT_KG = 0.45;
    const DEFAULT_HAMPER_BOX_WEIGHT_KG = 0.4;

    for (const item of items) {
      const qty = Math.max(1, item.quantity || 1);
      const snapshot = item.snapshot || {};

      if (item.itemType === 'CUSTOM_HAMPER') {
        isCustomHamper = true;
        const box = snapshot.box || {};
        const breakdown = snapshot.breakdown || snapshot.items || [];

        selectedBoxDetails = box;

        // 1. Box dimensions
        if (box.length && box.width && box.height) {
          maxDim = {
            length: Math.max(maxDim.length, box.length),
            breadth: Math.max(maxDim.breadth, box.width),
            height: Math.max(maxDim.height, box.height),
          };
        } else if (box.dimensions) {
          const parsed = this.parseDimensionString(box.dimensions);
          if (parsed) {
            maxDim = {
              length: Math.max(maxDim.length, parsed.length),
              breadth: Math.max(maxDim.breadth, parsed.breadth),
              height: Math.max(maxDim.height, parsed.height),
            };
          } else {
            maxDim = { length: 30, breadth: 20, height: 12 };
          }
        } else {
          maxDim = { length: 30, breadth: 20, height: 12 };
        }

        // 2. Custom Hamper constituent items weight
        let hamperItemsWeight = 0;
        for (const bItem of breakdown) {
          const bQty = Math.max(1, bItem.quantity || 1);
          let bWeight = DEFAULT_PRODUCT_WEIGHT_KG;

          if (bItem.productId) {
            try {
              const p = await prisma.product.findUnique({ where: { id: bItem.productId } });
              if (p && (p.packageWeight || p.weight)) {
                bWeight = p.packageWeight || p.weight || DEFAULT_PRODUCT_WEIGHT_KG;
              }
            } catch {
              // use fallback
            }
          }
          hamperItemsWeight += bWeight * bQty;
        }

        // 3. Add hamper box tare weight
        const boxTareWeight = box.maxWeight ? Math.min(0.5, box.maxWeight * 0.1) : DEFAULT_HAMPER_BOX_WEIGHT_KG;
        const singleHamperWeight = hamperItemsWeight + boxTareWeight;
        totalWeightKg += singleHamperWeight * qty;

        itemBreakdown.push({
          name: item.name || `Custom Hamper with ${box.name || 'Gift Box'}`,
          sku: item.sku || 'NCC-CUSTOM-HAMPER',
          quantity: qty,
          unitPrice: item.unitPrice,
          weightKg: singleHamperWeight,
        });
      } else if (item.itemType === 'HAMPER') {
        // Predefined hamper: look up constituent items
        let hamperTotalWeight = 0;
        try {
          if (item.hamperId) {
            const hamper = await prisma.hamper.findUnique({
              where: { id: item.hamperId },
              include: { items: { include: { product: true } } },
            });

            if (hamper && hamper.items?.length > 0) {
              for (const hItem of hamper.items) {
                const hQty = hItem.quantity || 1;
                const pWeight = hItem.product?.packageWeight || hItem.product?.weight || DEFAULT_PRODUCT_WEIGHT_KG;
                hamperTotalWeight += pWeight * hQty;
              }
            }
          }
        } catch {
          // ignore
        }

        if (hamperTotalWeight <= 0) {
          hamperTotalWeight = 1.2; // Default standard hamper weight in kg
        } else {
          hamperTotalWeight += DEFAULT_HAMPER_BOX_WEIGHT_KG;
        }

        totalWeightKg += hamperTotalWeight * qty;
        maxDim = {
          length: Math.max(maxDim.length, 28),
          breadth: Math.max(maxDim.breadth, 20),
          height: Math.max(maxDim.height, 12),
        };

        itemBreakdown.push({
          name: item.name,
          sku: item.sku || 'NCC-HAMPER',
          quantity: qty,
          unitPrice: item.unitPrice,
          weightKg: hamperTotalWeight,
        });
      } else {
        // Single product item
        let pWeight = DEFAULT_PRODUCT_WEIGHT_KG;
        try {
          const product = item.product || (item.productId ? await prisma.product.findUnique({ where: { id: item.productId } }) : null);
          if (product) {
            const actualWeight = product.packageWeight || product.chargeableWeight || product.weight;
            if (actualWeight && actualWeight > 0) {
              pWeight = actualWeight;
            }
            const pLen = product.length || product.packageLength;
            const pWidth = product.width || product.packageWidth;
            const pHeight = product.height || product.packageHeight;
            if (pLen && pWidth && pHeight) {
              maxDim = {
                length: Math.max(maxDim.length, pLen),
                breadth: Math.max(maxDim.breadth, pWidth),
                height: Math.max(maxDim.height, pHeight),
              };
            }
          }
        } catch {
          // ignore
        }

        totalWeightKg += pWeight * qty;
        itemBreakdown.push({
          name: item.name,
          sku: item.sku || 'NCC-PRODUCT',
          quantity: qty,
          unitPrice: item.unitPrice,
          weightKg: pWeight,
        });
      }
    }

    // Weight handling:
    // If order has no items, totalWeightKg is 0 (will be caught by validation)
    // If order has items but their weight was 0/undefined, apply safe minimum 0.5kg
    // If order has real weight (e.g. 0.3kg or 0.7kg), PRESERVE IT without overriding to 1.0kg!
    if (items.length === 0) {
      totalWeightKg = 0;
    } else if (totalWeightKg <= 0 || isNaN(totalWeightKg)) {
      console.warn(`[ShippingService] Calculated package weight for order ${order.orderNumber} was 0kg with ${items.length} items. Applying safe minimum 0.5kg.`);
      totalWeightKg = 0.5;
    }

    return {
      weightKg: Math.round(totalWeightKg * 100) / 100,
      dimensions: maxDim,
      itemBreakdown,
      isCustomHamper,
      boxDetails: selectedBoxDetails,
    };
  }

  /**
   * Authoritatively calculate shipment package details directly from cart contents and database records
   * Never trusts weight or dimensions supplied by the frontend.
   */
  async calculateCartPackageDetails(cartItems: Array<{
    productId?: string;
    hamperId?: string;
    quantity: number;
    itemType?: string;
    customHamperData?: any;
    name?: string;
  }>): Promise<PackedShipmentResult> {
    const populatedItems: any[] = [];

    for (const itm of cartItems) {
      const qty = Math.max(1, itm.quantity || 1);
      if (itm.itemType === 'CUSTOM_HAMPER' || itm.customHamperData) {
        populatedItems.push({
          quantity: qty,
          itemType: 'CUSTOM_HAMPER',
          customHamperData: itm.customHamperData,
          name: itm.name || 'Custom Healthcare Hamper',
        });
      } else if (itm.itemType === 'HAMPER' || itm.hamperId) {
        const hamper = itm.hamperId
          ? await prisma.hamper.findUnique({
              where: { id: itm.hamperId },
              include: { items: { include: { product: true } } },
            })
          : null;
        populatedItems.push({
          quantity: qty,
          itemType: 'HAMPER',
          hamper,
          name: hamper?.name || itm.name || 'Healthcare Hamper',
        });
      } else if (itm.productId) {
        const product = await prisma.product.findUnique({
          where: { id: itm.productId },
        });
        populatedItems.push({
          quantity: qty,
          itemType: 'PRODUCT',
          product,
          name: product?.name || itm.name || 'Healthcare Product',
        });
      }
    }

    return calculateCartShipmentPackage(populatedItems);
  }

  private parseDimensionString(dimStr: string): PackageDimensions | null {
    try {
      const parts = dimStr.split(/x|\*|X/).map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
      if (parts.length >= 3) {
        return { length: parts[0], breadth: parts[1], height: parts[2] };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Validate Delivery Address before making external shipping API requests
   */
  validateDeliveryAddress(
    address: any,
    fallbackEmail?: string,
    emailSource: string = 'shippingAddress.email',
    fallbackPhone?: string
  ): { isValid: boolean; error?: string; cleanAddress?: any } {
    if (!address) {
      return { isValid: false, error: 'Recipient shipping address is missing.' };
    }

    const name = (address.name || '').trim();
    let rawDigits = (address.phone || '').replace(/\D/g, '');
    if (rawDigits.length < 10 && fallbackPhone) {
      const fbDigits = fallbackPhone.replace(/\D/g, '');
      if (fbDigits.length >= 10) {
        rawDigits = fbDigits;
      }
    }
    let cleanPhone = rawDigits.slice(-10);
    if (cleanPhone.length > 0 && cleanPhone.length < 10) {
      // Auto-pad missing leading digits for Indian mobile numbers
      cleanPhone = cleanPhone.padStart(10, '9');
    }

    const addressLine1 = (address.addressLine1 || address.address || '').trim();
    const city = (address.city || '').trim();
    const state = (address.state || '').trim();
    const postalCode = (address.postalCode || address.pincode || address.zip || '').replace(/\D/g, '').slice(0, 6);
    const country = (address.country || 'IN').toUpperCase();

    // Authoritative Email Resolution and Strict Validation (Requirement 3)
    const rawCandidateEmail = (address.email || fallbackEmail || '').trim();
    const emailResult = sanitizeAndValidateEmail(rawCandidateEmail);
    if (!emailResult.isValid) {
      return {
        isValid: false,
        error: emailResult.error || 'A valid customer shipping email address is required for courier notifications.',
      };
    }

    if (!name || name.length < 2) {
      return { isValid: false, error: 'Recipient contact name is required (min 2 chars).' };
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return { isValid: false, error: 'Valid 10-digit recipient phone number is required.' };
    }
    if (!addressLine1 || addressLine1.length < 5) {
      return { isValid: false, error: 'Valid delivery street address is required.' };
    }
    if (!city) {
      return { isValid: false, error: 'Delivery city is required.' };
    }
    if (!postalCode || postalCode.length !== 6) {
      return { isValid: false, error: 'A valid 6-digit Indian Postal PIN code is required for NimbusPost delivery.' };
    }

    return {
      isValid: true,
      cleanAddress: {
        name,
        phone: cleanPhone,
        email: emailResult.cleanEmail!,
        emailSource,
        addressLine1,
        addressLine2: address.addressLine2 || '',
        city,
        state: state || 'Kerala',
        postalCode,
        country: country === 'IN' || country === 'INDIA' ? 'India' : country,
      },
    };
  }

  /**
   * Create or dispatch shipment for an order
   * Follows strict state machine:
   * Order -> Payment Success -> Shipment Creation -> NimbusPost Test/Live API -> AWB / Tracking -> DB Record
   */
  async createShipmentForOrder(
    orderId: string,
    options?: {
      courierId?: number;
      courierName?: string;
      pickupPincode?: string;
      isManualRetry?: boolean;
      providerName?: string;
      allowSimulation?: boolean;
    }
  ): Promise<ShipmentResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shipment: true, user: true },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    // 1. PAYMENT STATE CHECK: Shipment creation should happen ONLY after Payment Status is PAID
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new Error(
        `Cannot create shipment for order #${order.orderNumber}. Payment is not completed (Current: ${order.paymentStatus}).`
      );
    }

    // 2. IDEMPOTENCY CHECK: Protect against duplicate shipments
    const existingShipment = order.shipment;
    if (
      existingShipment &&
      existingShipment.awbNumber &&
      existingShipment.shipmentStatus !== 'SHIPMENT_CREATION_FAILED' &&
      existingShipment.shipmentStatus !== 'FAILED' &&
      !options?.isManualRetry
    ) {
      console.log(`[ShippingService] Idempotency Hit: Order #${order.orderNumber} already has AWB ${existingShipment.awbNumber}.`);
      return {
        id: existingShipment.id,
        orderId: existingShipment.orderId,
        provider: existingShipment.provider,
        providerOrderId: existingShipment.providerOrderId || undefined,
        awbNumber: existingShipment.awbNumber,
        courierName: existingShipment.courierName || 'NimbusPost Courier',
        courierId: existingShipment.courierId || 102,
        labelUrl: existingShipment.labelUrl || `https://ship.nimbuspost.com/shipping-label/view/${existingShipment.awbNumber}`,
        manifestUrl: existingShipment.manifestUrl || undefined,
        trackingUrl: existingShipment.trackingUrl || `https://nimbuspost.com/track/${existingShipment.awbNumber}`,
        shipmentStatus: existingShipment.shipmentStatus,
        status: existingShipment.shipmentStatus,
        estimatedDelivery: existingShipment.estimatedDelivery || undefined,
        estimatedDeliveryDate: existingShipment.estimatedDelivery || undefined,
        pickupPincode: existingShipment.pickupPincode || undefined,
        deliveryPincode: existingShipment.deliveryPincode || undefined,
        weightKg: existingShipment.weightKg || 1.0,
        isTestMode: (process.env.NIMBUSPOST_ENV || 'test').toLowerCase() === 'test',
        isSimulated: existingShipment.shipmentStatus === 'SIMULATED_TEST',
      };
    }

    // 3. DOMESTIC DESTINATION CHECK: Domestic NimbusPost is strictly for Indian delivery addresses
    const shippingSnapshot = (order.shippingAddress as any) || {};
    const recipientAddr = shippingSnapshot.recipient || shippingSnapshot;
    const deliveryCountry = (
      shippingSnapshot.deliveryCountry ||
      recipientAddr.country ||
      shippingSnapshot.country ||
      (order as any).deliveryCountry ||
      order.country ||
      'IN'
    ).toString().toUpperCase();

    if (deliveryCountry !== 'IN' && deliveryCountry !== 'INDIA') {
      console.log(`[ShippingService] Order #${order.orderNumber} destination is international (${deliveryCountry}). Skipping domestic NimbusPost dispatch.`);
      throw new Error(
        `Domestic NimbusPost is configured for Indian domestic addresses only. Order destination is ${deliveryCountry}.`
      );
    }

    // 4. ADDRESS & EMAIL VALIDATION (Requirement 1 & 3)
    // Resolve customer shipping email from all authoritative order sources in priority order:
    // 1. recipientAddr.email (if recipient provided their own email)
    // 2. shippingSnapshot.email (top-level shipping address email)
    // 3. shippingSnapshot.buyer?.email (buyer email in shipping snapshot)
    // 4. order.guestEmail (order guest email)
    // 5. order.user?.email (authenticated customer email)
    let candidateEmail = '';
    let emailSource = 'unknown';

    if (recipientAddr.email && typeof recipientAddr.email === 'string' && recipientAddr.email.trim()) {
      candidateEmail = recipientAddr.email.trim();
      emailSource = 'shippingAddress.recipient.email';
    } else if (shippingSnapshot.email && typeof shippingSnapshot.email === 'string' && shippingSnapshot.email.trim()) {
      candidateEmail = shippingSnapshot.email.trim();
      emailSource = 'shippingAddress.email';
    } else if (shippingSnapshot.buyer?.email && typeof shippingSnapshot.buyer.email === 'string' && shippingSnapshot.buyer.email.trim()) {
      candidateEmail = shippingSnapshot.buyer.email.trim();
      emailSource = 'shippingAddress.buyer.email';
    } else if (order.guestEmail && typeof order.guestEmail === 'string' && order.guestEmail.trim()) {
      candidateEmail = order.guestEmail.trim();
      emailSource = 'order.guestEmail';
    } else if (order.user?.email && typeof order.user.email === 'string' && order.user.email.trim()) {
      candidateEmail = order.user.email.trim();
      emailSource = 'order.user.email';
    }

    const fallbackPhone = shippingSnapshot.buyer?.phone || (order.user as any)?.phone;
    const addressValidation = this.validateDeliveryAddress(recipientAddr, candidateEmail, emailSource, fallbackPhone);
    if (!addressValidation.isValid) {
      console.warn(`[ShippingService] Address validation failed for Order #${order.orderNumber}: ${addressValidation.error}`);
      
      // Update shipment record with validation error without failing order payment
      await prisma.shipment.upsert({
        where: { orderId: order.id },
        update: {
          shipmentStatus: 'SHIPMENT_CREATION_FAILED',
          errorMessage: addressValidation.error,
        },
        create: {
          orderId: order.id,
          provider: 'NIMBUSPOST',
          shipmentStatus: 'SHIPMENT_CREATION_FAILED',
          errorMessage: addressValidation.error,
        },
      });

      throw new Error(`Shipping Address Validation Error: ${addressValidation.error}`);
    }

    // 5. PACKAGE WEIGHT & DIMENSIONS CALCULATION
    const packageDetails = await this.calculatePackageDetails(order);

    // 6. INVOKE SHIPPING PROVIDER
    const provider = this.getProvider(options?.providerName);
    let result: ShipmentResult;

    try {
      result = await provider.createShipment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderAmount: order.total,
        shippingCharges: order.shippingFee || 0,
        discount: order.discount || 0,
        paymentType: 'prepaid',
        weightKg: packageDetails.weightKg,
        dimensions: packageDetails.dimensions,
        courierId: options?.courierId,
        courierName: options?.courierName,
        pickupPincode: options?.pickupPincode,
        deliveryAddress: addressValidation.cleanAddress,
        items: packageDetails.itemBreakdown,
        allowSimulation: options?.allowSimulation,
      });
    } catch (err: any) {
      console.error(`[ShippingService] Provider error during shipment creation for Order #${order.orderNumber}:`, err);

      // Record failure in DB without breaking payment state
      await prisma.shipment.upsert({
        where: { orderId: order.id },
        update: {
          shipmentStatus: 'SHIPMENT_CREATION_FAILED',
          errorMessage: err.message || 'NimbusPost API shipment booking failed',
        },
        create: {
          orderId: order.id,
          provider: provider.name,
          shipmentStatus: 'SHIPMENT_CREATION_FAILED',
          errorMessage: err.message || 'NimbusPost API shipment booking failed',
        },
      });

      try {
        await prisma.orderTimeline.create({
          data: {
            orderId: order.id,
            status: order.orderStatus,
            title: 'NimbusPost Shipment Booking Failed',
            description: err.message || 'Courier shipment booking failed.',
          },
        });
      } catch {
        // ignore timeline error
      }

      throw err;
    }

    // 7. PERSIST SHIPMENT RECORD IN DATABASE
    const savedShipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        provider: result.provider,
        providerOrderId: result.providerOrderId,
        awbNumber: result.awbNumber,
        courierName: result.courierName,
        courierId: result.courierId,
        shipmentStatus: result.shipmentStatus,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
        manifestUrl: result.manifestUrl,
        estimatedDelivery: result.estimatedDelivery,
        weightKg: result.weightKg,
        pickupPincode: result.pickupPincode,
        deliveryPincode: result.deliveryPincode,
        errorMessage: null,
        rawResponse: result.rawResponse,
      },
      create: {
        orderId: order.id,
        provider: result.provider,
        providerOrderId: result.providerOrderId,
        awbNumber: result.awbNumber,
        courierName: result.courierName,
        courierId: result.courierId,
        shipmentStatus: result.shipmentStatus,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
        manifestUrl: result.manifestUrl,
        estimatedDelivery: result.estimatedDelivery,
        weightKg: result.weightKg,
        pickupPincode: result.pickupPincode,
        deliveryPincode: result.deliveryPincode,
        errorMessage: null,
        rawResponse: result.rawResponse,
      },
    });

    // 8. UPDATE ORDER STATUS & TIMELINE
    const isSimulated = result.isSimulated || result.shipmentStatus === 'SIMULATED_TEST';

    if (!isSimulated) {
      // Genuine live NimbusPost shipment booking
      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: OrderStatus.SHIPPED,
          trackingNumber: result.awbNumber,
        },
      });

      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.SHIPPED,
          title: `Dispatched via ${result.courierName} (NimbusPost AWB: ${result.awbNumber})`,
          description: `Live tracking number: ${result.awbNumber}. Expected Delivery: ${result.estimatedDelivery || '3 business days'}.`,
        },
      });
    } else {
      // Sandbox simulation: Preserve CONFIRMED status, do NOT set trackingNumber on order
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          status: order.orderStatus,
          title: `Sandbox Shipment Simulation Generated`,
          description: `Simulated reference: ${result.awbNumber} (${result.courierName}). Sandbox mode only — not dispatched with live carrier.`,
        },
      });
    }

    return {
      ...result,
      id: savedShipment.id,
    };
  }

  /**
   * Check Pincode Serviceability
   */
  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const provider = this.getProvider();
    const originPin = params.originPincode || nimbusPostConfig.pickupPincode || '560001';
    return await provider.checkServiceability({
      ...params,
      originPincode: originPin,
    });
  }

  /**
   * Request Courier Pickup Scheduling
   */
  async requestPickup(params?: PickupRequestParams): Promise<PickupRequestResult> {
    const provider = this.getProvider();
    if (provider.requestPickup) {
      return await provider.requestPickup({
        ...params,
        pickupPincode: params?.pickupPincode || nimbusPostConfig.pickupPincode || '560001',
      });
    }
    return {
      success: false,
      message: `Shipping provider ${provider.name} does not support pickup request scheduling.`,
      isTestMode: provider.isTestMode,
    };
  }

  /**
   * Generate / Retrieve Shipping Label
   */
  async generateLabel(awb: string): Promise<{ labelUrl: string }> {
    const provider = this.getProvider();
    if (provider.generateLabel) {
      return await provider.generateLabel(awb);
    }
    return { labelUrl: `https://ship.nimbuspost.com/shipping-label/view/${awb}` };
  }

  /**
   * Generate / Retrieve Shipping Manifest
   */
  async generateManifest(awb: string): Promise<{ manifestUrl: string }> {
    const provider = this.getProvider();
    if (provider.generateManifest) {
      return await provider.generateManifest(awb);
    }
    return { manifestUrl: `https://ship.nimbuspost.com/manifest/view/${awb}` };
  }

  /**
   * Track Shipment
   */
  async trackShipment(awbOrOrderId: string): Promise<TrackingResult | null> {
    const provider = this.getProvider();
    return await provider.trackShipment(awbOrOrderId);
  }

  /**
   * Cancel Shipment
   */
  async cancelShipment(awb: string): Promise<CancelShipmentResult> {
    const shipment = await prisma.shipment.findFirst({
      where: { awbNumber: awb },
    });

    const provider = this.getProvider(shipment?.provider);
    const result = await provider.cancelShipment(awb);

    if (shipment) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { shipmentStatus: 'CANCELLED' },
      });
    }

    return result;
  }

  /**
   * Handle NimbusPost Webhook Events Idempotently
   * Supports matching both by AWB number and by order number / NimbusPost reference
   */
  async handleWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'Invalid payload.' };
    }

    const awb = payload.awb || payload.awb_number || payload.tracking_number || payload.tracking_id;
    const orderNumber = payload.order_number || payload.order_id || payload.orderNumber || payload.client_order_id;
    const status = (payload.status || payload.current_status || payload.shipment_status || '').toUpperCase();
    const courierName = payload.courier_name || payload.courier || payload.shipping_partner;

    let shipment: any = null;
    if (awb) {
      shipment = await prisma.shipment.findFirst({
        where: { awbNumber: awb },
        include: { order: true },
      });
    }

    if (!shipment && orderNumber) {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: String(orderNumber) },
            { nimbusOrderId: String(orderNumber) },
            { id: String(orderNumber) },
          ],
        },
        include: { shipment: true },
      });
      if (order?.shipment) {
        shipment = { ...order.shipment, order };
      }
    }

    if (!shipment) {
      return { success: false, message: `Shipment matching AWB ${awb || 'N/A'} or Order ${orderNumber || 'N/A'} not found.` };
    }

    let mappedShipmentStatus = shipment.shipmentStatus;
    let mappedOrderStatus: OrderStatus = shipment.order.orderStatus;

    if (status.includes('DELIVERED')) {
      mappedShipmentStatus = 'DELIVERED';
      mappedOrderStatus = OrderStatus.DELIVERED;
    } else if (status.includes('OUT_FOR_DELIVERY')) {
      mappedShipmentStatus = 'OUT_FOR_DELIVERY';
    } else if (status.includes('IN_TRANSIT') || status.includes('PICKED_UP') || status.includes('SHIPPED')) {
      mappedShipmentStatus = 'IN_TRANSIT';
      mappedOrderStatus = OrderStatus.SHIPPED;
    } else if (status.includes('BOOKED') || status.includes('MANIFEST')) {
      mappedShipmentStatus = 'BOOKED';
      mappedOrderStatus = OrderStatus.SHIPPED;
    } else if (status.includes('CANCELLED')) {
      mappedShipmentStatus = 'CANCELLED';
    }

    // Check if this was an unbooked manual order that now received an AWB
    const isNewBookingForManual = !shipment.awbNumber && awb;

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        shipmentStatus: mappedShipmentStatus,
        rawResponse: payload,
        ...(awb ? { awbNumber: awb, trackingNumber: awb } : {}),
        ...(courierName ? { courierName } : {}),
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
    });

    if (mappedOrderStatus !== shipment.order.orderStatus || isNewBookingForManual) {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          orderStatus: mappedOrderStatus,
          ...(awb ? { trackingNumber: awb } : {}),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      await prisma.orderTimeline.create({
        data: {
          orderId: shipment.orderId,
          status: mappedOrderStatus,
          title: isNewBookingForManual
            ? `Shipment Booked via NimbusPost (${courierName || 'Partner'}, AWB: ${awb})`
            : `Shipment Status: ${mappedShipmentStatus}`,
          description: payload.message || payload.activity || `Status updated via NimbusPost webhook.`,
        },
      });
    }

    return { success: true, message: `Webhook processed successfully for order #${shipment.order.orderNumber}.` };
  }

  /**
   * Option B: Dedicated Backend Function for NimbusPost Automated Shipment Booking
   * Validates order, calculates weight & dimensions, and communicates with NimbusPost API (/v1/shipments)
   * to book the shipment, assign a courier, generate an AWB, and mark order as SHIPPED.
   */
  async createNimbusPostAutomatedShipment(
    orderId: string,
    options?: {
      courierId?: number;
      courierName?: string;
      pickupPincode?: string;
      allowSimulation?: boolean;
    }
  ): Promise<ShipmentResult> {
    const result = await this.createShipmentForOrder(orderId, {
      ...options,
      providerName: 'NIMBUSPOST',
    });

    // Ensure shippingMethod is stored as NIMBUSPOST_AUTOMATED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMethod: 'NIMBUSPOST_AUTOMATED',
      },
    });

    await prisma.shipment.update({
      where: { orderId },
      data: {
        shippingMethod: 'NIMBUSPOST_AUTOMATED',
      },
    });

    return result;
  }

  /**
   * Option C: Dedicated Backend Function for NimbusPost Manual Order Ingestion
   * Sends complete order details to NimbusPost's New Orders queue only.
   *
   * STRICT BEHAVIOR ENFORCEMENT:
   * 1. Must NOT call automated shipment booking functions.
   * 2. Must NOT allocate a courier.
   * 3. Must NOT generate an AWB.
   * 4. Must NOT mark the order as SHIPPED (preserves order status as PROCESSING).
   * 5. Must NOT set order.trackingNumber or shipment.awbNumber.
   * 6. Database-backed idempotency prevents duplicate imports.
   * 7. The admin opens NimbusPost console (ship.nimbuspost.com/orders), clicks Ship Now,
   *    and selects the shipping partner directly in NimbusPost.
   */
  async pushOrderToNimbusPostNewOrders(
    orderId: string,
    options?: { pickupPincode?: string; forceRetry?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    orderId: string;
    orderNumber: string;
    nimbusOrderId: string;
    dashboardUrl: string;
    orderStatus: string;
    shipmentStatus: string;
    isBooked: boolean;
    awbNumber?: string | null;
    courierName?: string | null;
    apiLimitationNote?: string;
    importStatus?: 'NOT_IMPORTED' | 'IMPORTING' | 'IMPORTED_TO_NIMBUSPOST' | 'IMPORT_FAILED' | 'SHIPMENT_CREATED';
    downloadCsvUrl?: string;
    alreadyImported?: boolean;
    alreadyShipped?: boolean;
    data?: any;
  }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shipment: true,
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
        user: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new Error('Cannot process a cancelled order.');
    }

    const existingShipment = order.shipment;

    // 1. Idempotency Check: Prevent duplicate imports if already accepted
    if (
      (order.syncStatus === 'IMPORTED_TO_NIMBUSPOST' ||
        (existingShipment?.providerOrderId && existingShipment?.shippingMethod === 'NIMBUSPOST_MANUAL' && existingShipment?.syncStatus === 'IMPORTED_TO_NIMBUSPOST')) &&
      !options?.forceRetry
    ) {
      const existingRef = order.nimbusOrderId || existingShipment?.providerOrderId || `NP-ORD-${order.orderNumber}`;
      console.log(
        `[ShippingService] Idempotency Hit: Order #${order.orderNumber} already registered in NimbusPost New Orders (Ref: ${existingRef}).`
      );
      return {
        success: true,
        importStatus: 'IMPORTED_TO_NIMBUSPOST',
        message: `Order #${order.orderNumber} is already in NimbusPost New Orders queue (Ref: ${existingRef}). Open NimbusPost to choose your shipping partner and complete dispatch.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        nimbusOrderId: existingRef,
        dashboardUrl: 'https://ship.nimbuspost.com/orders',
        orderStatus: order.orderStatus,
        shipmentStatus: existingShipment?.shipmentStatus || 'READY_FOR_MANUAL_BOOKING',
        isBooked: Boolean(existingShipment?.awbNumber),
        awbNumber: existingShipment?.awbNumber || null,
        courierName: existingShipment?.courierName || null,
        data: {
          order,
          shipment: existingShipment,
        },
      };
    }

    // 2. Address & Destination Validation
    const shippingSnapshot = (order.shippingAddress as any) || {};
    const recipientAddr = shippingSnapshot.recipient || shippingSnapshot;
    const deliveryCountry = (
      shippingSnapshot.deliveryCountry ||
      recipientAddr.country ||
      shippingSnapshot.country ||
      (order as any).deliveryCountry ||
      order.country ||
      'IN'
    )
      .toString()
      .toUpperCase();

    if (deliveryCountry !== 'IN' && deliveryCountry !== 'INDIA') {
      throw new Error(
        `Domestic NimbusPost is configured for Indian domestic addresses only. Order destination is ${deliveryCountry}.`
      );
    }

    let candidateEmail = '';
    let emailSource = 'unknown';

    if (recipientAddr.email && typeof recipientAddr.email === 'string' && recipientAddr.email.trim()) {
      candidateEmail = recipientAddr.email.trim();
      emailSource = 'shippingAddress.recipient.email';
    } else if (shippingSnapshot.email && typeof shippingSnapshot.email === 'string' && shippingSnapshot.email.trim()) {
      candidateEmail = shippingSnapshot.email.trim();
      emailSource = 'shippingAddress.email';
    } else if (
      shippingSnapshot.buyer?.email &&
      typeof shippingSnapshot.buyer.email === 'string' &&
      shippingSnapshot.buyer.email.trim()
    ) {
      candidateEmail = shippingSnapshot.buyer.email.trim();
      emailSource = 'shippingAddress.buyer.email';
    } else if (order.guestEmail && typeof order.guestEmail === 'string' && order.guestEmail.trim()) {
      candidateEmail = order.guestEmail.trim();
      emailSource = 'order.guestEmail';
    } else if (order.user?.email && typeof order.user.email === 'string' && order.user.email.trim()) {
      candidateEmail = order.user.email.trim();
      emailSource = 'order.user.email';
    }

    const fallbackPhone = shippingSnapshot.buyer?.phone || (order.user as any)?.phone;
    const addressValidation = this.validateDeliveryAddress(recipientAddr, candidateEmail, emailSource, fallbackPhone);
    if (!addressValidation.isValid) {
      throw new Error(`Shipping Address Validation Error: ${addressValidation.error}`);
    }

    // 3. Authoritative Package Weight and Dimensions Calculation
    const packageDetails = await this.calculatePackageDetails(order);

    // 4. Generate Dedicated NimbusPost Order Reference
    const nimbusOrderId = `NP-ORD-${order.orderNumber}`;
    const preservedOrderStatus = order.orderStatus === 'PENDING' ? OrderStatus.PROCESSING : order.orderStatus;

    // 5. Build Complete, Genuine NimbusPost Order Payload
    const cleanPickupPhone = (nimbusPostConfig.defaultPickupPhone || '').replace(/\D/g, '').slice(-10).padStart(10, '9');
    const nimbusPayload = {
      order_number: order.orderNumber,
      shipping_charges: order.shippingFee || 0,
      discount: order.discount || 0,
      cod_charges: 0,
      payment_type: order.paymentStatus === 'PAID' ? 'prepaid' : 'cod',
      order_amount: order.total,
      package_weight: Math.round(packageDetails.weightKg * 1000),
      weight: packageDetails.weightKg,
      package_length: packageDetails.dimensions.length,
      package_breadth: packageDetails.dimensions.breadth,
      package_height: packageDetails.dimensions.height,
      length: packageDetails.dimensions.length,
      breadth: packageDetails.dimensions.breadth,
      height: packageDetails.dimensions.height,
      pickup: {
        warehouse_name: nimbusPostConfig.pickupLocation || 'Dhanyasree 1',
        name: nimbusPostConfig.pickupLocation || 'Dhanyasree 1',
        phone: cleanPickupPhone,
        address: nimbusPostConfig.defaultPickupAddress,
        city: nimbusPostConfig.defaultPickupCity,
        state: nimbusPostConfig.defaultPickupState,
        pincode: options?.pickupPincode || nimbusPostConfig.pickupPincode || '560001',
        country: 'India',
      },
      consignee: {
        name: addressValidation.cleanAddress.name,
        phone: addressValidation.cleanAddress.phone,
        email: addressValidation.cleanAddress.email,
        address: addressValidation.cleanAddress.addressLine1,
        address_2: addressValidation.cleanAddress.addressLine2 || '',
        city: addressValidation.cleanAddress.city,
        state: addressValidation.cleanAddress.state,
        pincode: addressValidation.cleanAddress.postalCode,
        country: 'India',
      },
      order_items: packageDetails.itemBreakdown.map((item) => ({
        name: item.name,
        qty: item.quantity,
        price: item.unitPrice,
        sku: item.sku || 'NCC-ITEM',
      })),
    };

    console.log('[NimbusPost Safe Diagnostics]', JSON.stringify({
      action: 'NIMBUSPOST_MANUAL_IMPORT_ATTEMPT',
      orderId: order.id,
      orderNumber: order.orderNumber,
      consigneePhone: addressValidation.cleanAddress.phone,
      consigneeEmail: addressValidation.cleanAddress.email,
      weightKg: packageDetails.weightKg,
      itemsCount: packageDetails.itemBreakdown.length,
    }));

    // 6. Inspect NimbusPost API Capability & Attempt Real Ingestion
    // NimbusPost Developer REST API (/v1/shipments) is strictly an automated shipment booking endpoint.
    // In NimbusPost architecture, unbooked orders in "New Orders" (ship.nimbuspost.com/orders) originate
    // from platform Sales Channels (Settings > Channel) or Bulk Order CSV upload.
    // Per Requirement 4 & 8: Do NOT return fake success or pretend the order was imported if NimbusPost does not support unbooked REST creation.
    const message =
      'NimbusPost order CSV generated successfully. Upload this file to NimbusPost > Bulk Upload to add the order to New Orders.';

    // Update status to CSV_GENERATED
    const savedShipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        providerOrderId: nimbusOrderId,
        nimbusPostShipmentId: nimbusOrderId,
        awbNumber: null,
        trackingNumber: null,
        courierName: null,
        courierId: null,
        shipmentStatus: 'READY_TO_SHIP',
        trackingUrl: null,
        labelUrl: null,
        manifestUrl: null,
        estimatedDelivery: null,
        weightKg: packageDetails.weightKg,
        pickupPincode: options?.pickupPincode || nimbusPostConfig.pickupPincode || '560001',
        deliveryPincode: addressValidation.cleanAddress.postalCode,
        syncStatus: 'CSV_GENERATED',
        lastSyncAt: new Date(),
        errorMessage: null,
      },
      create: {
        orderId: order.id,
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        providerOrderId: nimbusOrderId,
        nimbusPostShipmentId: nimbusOrderId,
        awbNumber: null,
        trackingNumber: null,
        courierName: null,
        courierId: null,
        shipmentStatus: 'READY_TO_SHIP',
        trackingUrl: null,
        labelUrl: null,
        manifestUrl: null,
        estimatedDelivery: null,
        weightKg: packageDetails.weightKg,
        pickupPincode: options?.pickupPincode || nimbusPostConfig.pickupPincode || '560001',
        deliveryPincode: addressValidation.cleanAddress.postalCode,
        syncStatus: 'CSV_GENERATED',
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingMethod: 'NIMBUSPOST_MANUAL',
        nimbusOrderId,
        nimbusShipmentId: nimbusOrderId,
        syncStatus: 'CSV_GENERATED',
        lastSyncAt: new Date(),
        orderStatus: preservedOrderStatus,
        trackingNumber: null,
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    // 7. Timeline Record
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: preservedOrderStatus,
        title: 'NimbusPost Order CSV Ready for Bulk Upload',
        description: `Order #${order.orderNumber} prepared for official NimbusPost Bulk Upload (${packageDetails.weightKg}kg). Download CSV and upload to NimbusPost > Bulk Upload.`,
      },
    });

    return {
      success: true,
      importStatus: 'CSV_GENERATED' as any,
      message,
      orderId: order.id,
      orderNumber: order.orderNumber,
      nimbusOrderId,
      dashboardUrl: 'https://ship.nimbuspost.com/orders',
      downloadCsvUrl: `/api/shipping/nimbus/export-csv/${order.id}`,
      orderStatus: preservedOrderStatus,
      shipmentStatus: 'READY_TO_SHIP',
      isBooked: false,
      awbNumber: null,
      courierName: null,
      apiLimitationNote: 'NimbusPost Developer REST API does not expose an unbooked draft order endpoint. Use NimbusPost Bulk Upload CSV.',
      data: {
        order: updatedOrder,
        shipment: savedShipment,
        downloadCsvUrl: `/api/shipping/nimbus/export-csv/${order.id}`,
      },
    };
  }

  /**
   * Generates official NimbusPost Bulk Order Import CSV for an order
   * Matches the exact 25-column specification required by NimbusPost:
   * Order ID, Order Date, Payment Mode, Sub Total / Order Value, Buyer Name, Buyer Phone, Buyer Email,
   * Billing Address, Billing Pincode, Billing City, Billing State, Shipping Address, Shipping Pincode,
   * Shipping City, Shipping State, Product Name, SKU, Quantity, Unit Price, COD Amount, Weight, Length, Breadth, Height, Pickup Warehouse / Location
   */
  async generateNimbusPostOrderCsv(orderId: string): Promise<string> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            hamper: true,
          },
        },
        shipment: true,
        user: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    // Requirement 7: Block orders with 0 items with the exact required error message
    if (!order.items || order.items.length === 0) {
      throw new Error('This order has no valid product items. Please verify the order details before generating the NimbusPost CSV.');
    }

    const packageDetails = await this.calculatePackageDetails(order);

    if (!packageDetails.itemBreakdown || packageDetails.itemBreakdown.length === 0) {
      throw new Error('This order has no valid product items. Please verify the order details before generating the NimbusPost CSV.');
    }

    const shippingSnapshot = (order.shippingAddress as any) || {};
    const recipientAddr = shippingSnapshot.recipient || shippingSnapshot;
    const buyer = shippingSnapshot.buyer || {};

    const cleanRecipientPhone = (recipientAddr.phone || shippingSnapshot.phone || '').replace(/\D/g, '').slice(-10).padStart(10, '9');
    const cleanBuyerPhone = (buyer.phone || order.guestPhone || cleanRecipientPhone).replace(/\D/g, '').slice(-10).padStart(10, '9');
    const recipientEmail = recipientAddr.email || shippingSnapshot.email || order.guestEmail || order.user?.email || 'customer@nestcareconnect.com';
    const buyerEmail = buyer.email || order.guestEmail || order.user?.email || recipientEmail;

    const paymentMode = order.paymentStatus === 'PAID' ? 'Prepaid' : 'COD';
    const codAmount = paymentMode === 'COD' ? order.total : 0;
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];

    const headers = [
      'Order ID',
      'Order Date',
      'Payment Mode',
      'Sub Total / Order Value',
      'Buyer Name',
      'Buyer Phone',
      'Buyer Email',
      'Billing Address',
      'Billing Pincode',
      'Billing City',
      'Billing State',
      'Shipping Address',
      'Shipping Pincode',
      'Shipping City',
      'Shipping State',
      'Product Name',
      'SKU',
      'Quantity',
      'Unit Price',
      'COD Amount',
      'Weight',
      'Length',
      'Breadth',
      'Height',
      'Pickup Warehouse / Location',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows: string[] = [];
    rows.push(headers.join(','));

    // Requirement 3: Use real items from database, never use dummy or hardcoded items
    const items = packageDetails.itemBreakdown;

    // Each order item gets a row in the CSV
    for (const item of items) {
      const row = [
        escapeCsv(order.orderNumber),
        escapeCsv(orderDate),
        escapeCsv(paymentMode),
        escapeCsv(order.total),
        escapeCsv(buyer.name || order.guestName || recipientAddr.name || 'Customer'),
        escapeCsv(cleanBuyerPhone),
        escapeCsv(buyerEmail),
        escapeCsv(recipientAddr.addressLine1 || 'Delivery Address'),
        escapeCsv(recipientAddr.postalCode || '560001'),
        escapeCsv(recipientAddr.city || 'Bengaluru'),
        escapeCsv(recipientAddr.state || 'Karnataka'),
        escapeCsv(`${recipientAddr.addressLine1 || ''} ${recipientAddr.addressLine2 || ''}`.trim()),
        escapeCsv(recipientAddr.postalCode || '560001'),
        escapeCsv(recipientAddr.city || 'Bengaluru'),
        escapeCsv(recipientAddr.state || 'Karnataka'),
        escapeCsv(item.name),
        escapeCsv(item.sku || 'NCC-ITEM'),
        escapeCsv(item.quantity),
        escapeCsv(item.unitPrice),
        escapeCsv(codAmount),
        escapeCsv(packageDetails.weightKg),
        escapeCsv(packageDetails.dimensions.length),
        escapeCsv(packageDetails.dimensions.breadth),
        escapeCsv(packageDetails.dimensions.height),
        escapeCsv(nimbusPostConfig.pickupLocation || 'Dhanyasree 1'),
      ];
      rows.push(row.join(','));
    }

    // Automatically update order status to CSV_GENERATED if not yet imported or shipped
    if (order.syncStatus !== 'IMPORTED_TO_NIMBUSPOST' && order.orderStatus !== 'SHIPPED') {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            shippingMethod: 'NIMBUSPOST_MANUAL',
            syncStatus: 'CSV_GENERATED',
            lastSyncAt: new Date(),
          },
        });

        await prisma.shipment.upsert({
          where: { orderId: order.id },
          update: {
            provider: 'NIMBUSPOST',
            shippingMethod: 'NIMBUSPOST_MANUAL',
            syncStatus: 'CSV_GENERATED',
            shipmentStatus: 'READY_TO_SHIP',
            weightKg: packageDetails.weightKg,
            lastSyncAt: new Date(),
          },
          create: {
            orderId: order.id,
            provider: 'NIMBUSPOST',
            shippingMethod: 'NIMBUSPOST_MANUAL',
            syncStatus: 'CSV_GENERATED',
            shipmentStatus: 'READY_TO_SHIP',
            weightKg: packageDetails.weightKg,
          },
        });

        await prisma.orderTimeline.create({
          data: {
            orderId: order.id,
            status: order.orderStatus,
            title: 'NimbusPost Order CSV Generated for Bulk Upload',
            description: `Generated official 25-column NimbusPost Bulk Order CSV for order #${order.orderNumber} (${packageDetails.weightKg} kg). Ready for upload to NimbusPost > Bulk Upload.`,
          },
        });
      } catch (err: any) {
        console.warn('[ShippingService] Non-critical error updating CSV_GENERATED status:', err.message);
      }
    }

    return rows.join('\r\n');
  }

  /**
   * Explicitly marks order as CSV_GENERATED
   */
  async markOrderCsvGenerated(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('This order has no valid product items. Please verify the order details before generating the NimbusPost CSV.');
    }

    const packageDetails = await this.calculatePackageDetails(order);

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingMethod: 'NIMBUSPOST_MANUAL',
        syncStatus: 'CSV_GENERATED',
        lastSyncAt: new Date(),
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        syncStatus: 'CSV_GENERATED',
        shipmentStatus: 'READY_TO_SHIP',
        weightKg: packageDetails.weightKg,
        lastSyncAt: new Date(),
      },
      create: {
        orderId: order.id,
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        syncStatus: 'CSV_GENERATED',
        shipmentStatus: 'READY_TO_SHIP',
        weightKg: packageDetails.weightKg,
      },
    });

    return {
      success: true,
      message: 'NimbusPost order CSV generated successfully. Upload this file to NimbusPost > Bulk Upload to add the order to New Orders.',
      order: updatedOrder,
    };
  }

  /**
   * Confirms order was uploaded to NimbusPost New Orders via Bulk Upload
   * Sets syncStatus to IMPORTED_TO_NIMBUSPOST without booking a courier or generating an AWB.
   */
  async confirmNimbusPostImported(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const nimbusOrderId = order.nimbusOrderId || `NP-ORD-${order.orderNumber}`;

    const updatedShipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      update: {
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        providerOrderId: nimbusOrderId,
        nimbusPostShipmentId: nimbusOrderId,
        syncStatus: 'IMPORTED_TO_NIMBUSPOST',
        shipmentStatus: 'READY_FOR_MANUAL_BOOKING',
        lastSyncAt: new Date(),
      },
      create: {
        orderId: order.id,
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        providerOrderId: nimbusOrderId,
        nimbusPostShipmentId: nimbusOrderId,
        syncStatus: 'IMPORTED_TO_NIMBUSPOST',
        shipmentStatus: 'READY_FOR_MANUAL_BOOKING',
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingMethod: 'NIMBUSPOST_MANUAL',
        nimbusOrderId,
        syncStatus: 'IMPORTED_TO_NIMBUSPOST',
        lastSyncAt: new Date(),
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: order.orderStatus,
        title: 'Order Uploaded to NimbusPost Bulk Upload',
        description: `Admin confirmed order #${order.orderNumber} was uploaded to NimbusPost New Orders. Ready for carrier selection and manual dispatch in NimbusPost.`,
      },
    });

    return {
      success: true,
      message: `Order #${order.orderNumber} confirmed as imported to NimbusPost New Orders. Open NimbusPost to click Ship Now and select your courier partner.`,
      order: updatedOrder,
      shipment: updatedShipment,
    };
  }

  /**
   * Helper to derive import status for any order
   */
  getNimbusImportStatus(order: any): 'NOT_IMPORTED' | 'CSV_GENERATED' | 'IMPORTED_TO_NIMBUSPOST' | 'IMPORT_FAILED' | 'SHIPMENT_CREATED' {
    if (!order) return 'NOT_IMPORTED';
    if (order.orderStatus === 'SHIPPED' || order.trackingNumber || order.shipment?.awbNumber) {
      return 'SHIPMENT_CREATED';
    }
    const sync = order.syncStatus || order.shipment?.syncStatus;
    if (sync === 'IMPORTED_TO_NIMBUSPOST' || sync === 'IMPORTED') {
      return 'IMPORTED_TO_NIMBUSPOST';
    }
    if (sync === 'CSV_GENERATED') {
      return 'CSV_GENERATED';
    }
    if (sync === 'IMPORT_FAILED' || sync === 'ERROR' || order.shipment?.shipmentStatus === 'SHIPMENT_CREATION_FAILED') {
      return 'IMPORT_FAILED';
    }
    return 'NOT_IMPORTED';
  }

  /**
   * Alias for backward compatibility
   */
  async pushOrderToNimbusManual(
    orderId: string,
    options?: { pickupPincode?: string; forceRetry?: boolean }
  ) {
    return this.pushOrderToNimbusPostNewOrders(orderId, options);
  }

  /**
   * Synchronize order & shipment tracking status from NimbusPost
   * Updates AWB, courier name, tracking URL, and status once booked in NimbusPost console.
   */
  async syncNimbusShipmentStatus(orderId: string): Promise<{
    success: boolean;
    message: string;
    order: any;
    shipment: any;
    isBooked: boolean;
  }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipment: true,
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const awb = order.shipment?.awbNumber || order.trackingNumber;
    const providerOrderId = order.nimbusOrderId || order.shipment?.providerOrderId;

    if (!awb && !providerOrderId) {
      throw new Error(`Order #${order.orderNumber} does not have a NimbusPost Reference or AWB to sync.`);
    }

    const provider = this.getProvider('NIMBUSPOST');
    let trackingInfo: any = null;

    if (awb) {
      try {
        trackingInfo = await provider.trackShipment(awb);
      } catch (err: any) {
        console.warn(`[ShippingService] Track shipment error for AWB ${awb}:`, err.message);
      }
    }

    // If order was queued for manual booking and has no AWB yet
    if (!awb) {
      return {
        success: true,
        message: `Order #${order.orderNumber} is registered in NimbusPost (Ref: ${providerOrderId}). It is unbooked and awaiting carrier selection in NimbusPost console. Open https://ship.nimbuspost.com/orders to click 'Ship Now'.`,
        order,
        shipment: order.shipment,
        isBooked: false,
      };
    }

    let updatedShipment = order.shipment;
    let newShipmentStatus = order.shipment?.shipmentStatus || 'BOOKED';
    let newOrderStatus = order.orderStatus;
    let courierName = order.shipment?.courierName;
    let trackingUrl = order.shipment?.trackingUrl || `https://nimbuspost.com/track/${awb}`;
    let estimatedDelivery = order.shipment?.estimatedDelivery;

    if (trackingInfo) {
      const trackStatus = (trackingInfo.status || '').toUpperCase();
      courierName = trackingInfo.courierName || courierName;
      estimatedDelivery = trackingInfo.estimatedDelivery || estimatedDelivery;

      if (trackStatus.includes('DELIVERED')) {
        newShipmentStatus = 'DELIVERED';
        newOrderStatus = OrderStatus.DELIVERED;
      } else if (trackStatus.includes('OUT_FOR_DELIVERY')) {
        newShipmentStatus = 'OUT_FOR_DELIVERY';
      } else if (
        trackStatus.includes('IN_TRANSIT') ||
        trackStatus.includes('PICKED_UP') ||
        trackStatus.includes('SHIPPED')
      ) {
        newShipmentStatus = 'IN_TRANSIT';
        newOrderStatus = OrderStatus.SHIPPED;
      } else if (trackStatus.includes('BOOKED') || trackStatus.includes('MANIFEST')) {
        newShipmentStatus = 'BOOKED';
        newOrderStatus = OrderStatus.SHIPPED;
      }
    }

    if (order.shipment) {
      updatedShipment = await prisma.shipment.update({
        where: { id: order.shipment.id },
        data: {
          shipmentStatus: newShipmentStatus,
          courierName: courierName || undefined,
          trackingUrl: trackingUrl || undefined,
          estimatedDelivery: estimatedDelivery || undefined,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: newOrderStatus,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        trackingNumber: awb,
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    return {
      success: true,
      message: `Shipment status synchronized from NimbusPost. Current status: ${newShipmentStatus} (AWB: ${awb})`,
      order: updatedOrder,
      shipment: updatedShipment,
      isBooked: true,
    };
  }
}

export const shippingService = new ShippingService();

