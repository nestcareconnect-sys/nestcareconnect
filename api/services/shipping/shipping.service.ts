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
} from './shippingProvider.interface.js';
import { NimbusPostShippingProvider } from './nimbuspost.provider.js';

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
          if (item.productId) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (product) {
              pWeight = product.packageWeight || product.weight || DEFAULT_PRODUCT_WEIGHT_KG;
              if (product.packageLength && product.packageWidth && product.packageHeight) {
                maxDim = {
                  length: Math.max(maxDim.length, product.packageLength),
                  breadth: Math.max(maxDim.breadth, product.packageWidth),
                  height: Math.max(maxDim.height, product.packageHeight),
                };
              }
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

    // Safety fallback: Never send zero or negative weight to shipping API
    if (totalWeightKg <= 0 || isNaN(totalWeightKg)) {
      console.warn(`[ShippingService] Calculated package weight for order ${order.orderNumber} was invalid (${totalWeightKg}kg). Applying safe fallback: 1.0kg.`);
      totalWeightKg = 1.0;
    }

    return {
      weightKg: Math.round(totalWeightKg * 100) / 100,
      dimensions: maxDim,
      itemBreakdown,
      isCustomHamper,
      boxDetails: selectedBoxDetails,
    };
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
  validateDeliveryAddress(address: any): { isValid: boolean; error?: string; cleanAddress?: any } {
    if (!address) {
      return { isValid: false, error: 'Recipient shipping address is missing.' };
    }

    const name = (address.name || '').trim();
    const phone = (address.phone || '').trim();
    const addressLine1 = (address.addressLine1 || address.address || '').trim();
    const city = (address.city || '').trim();
    const state = (address.state || '').trim();
    const postalCode = (address.postalCode || address.pincode || address.zip || '').replace(/\D/g, '').slice(0, 6);
    const country = (address.country || 'IN').toUpperCase();

    if (!name || name.length < 2) {
      return { isValid: false, error: 'Recipient contact name is required (min 2 chars).' };
    }
    if (!phone || phone.length < 8) {
      return { isValid: false, error: 'Valid recipient phone number is required.' };
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
        phone,
        email: address.email || '',
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
    }
  ): Promise<ShipmentResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shipment: true },
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
      };
    }

    // 3. DOMESTIC DESTINATION CHECK: Domestic NimbusPost is strictly for Indian delivery addresses
    const shippingSnapshot = (order.shippingAddress as any) || {};
    const deliveryCountry = (
      order.country ||
      (order as any).deliveryCountry ||
      shippingSnapshot.deliveryCountry ||
      shippingSnapshot.country ||
      'IN'
    ).toString().toUpperCase();

    if (deliveryCountry !== 'IN' && deliveryCountry !== 'INDIA') {
      console.log(`[ShippingService] Order #${order.orderNumber} destination is international (${deliveryCountry}). Skipping domestic NimbusPost dispatch.`);
      throw new Error(
        `Domestic NimbusPost is configured for Indian domestic addresses only. Order destination is ${deliveryCountry}.`
      );
    }

    // 4. ADDRESS VALIDATION
    const recipientAddr = shippingSnapshot.recipient || shippingSnapshot;
    const addressValidation = this.validateDeliveryAddress(recipientAddr);
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: OrderStatus.SHIPPED,
        trackingNumber: result.awbNumber,
      },
    });

    const isTestMode = provider.isTestMode;
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: OrderStatus.SHIPPED,
        title: `Dispatched via ${result.courierName} (NimbusPost${isTestMode ? ' Test Mode' : ''})`,
        description: `AWB Tracking Number: ${result.awbNumber}. Expected Delivery: ${result.estimatedDelivery || '3 business days'}.`,
      },
    });

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
    return await provider.checkServiceability(params);
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
   */
  async handleWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'Invalid payload.' };
    }

    const awb = payload.awb || payload.awb_number || payload.tracking_number;
    const status = (payload.status || payload.current_status || '').toUpperCase();

    if (!awb) {
      return { success: false, message: 'AWB number missing in webhook payload.' };
    }

    const shipment = await prisma.shipment.findFirst({
      where: { awbNumber: awb },
      include: { order: true },
    });

    if (!shipment) {
      return { success: false, message: `Shipment with AWB ${awb} not found.` };
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
    } else if (status.includes('CANCELLED')) {
      mappedShipmentStatus = 'CANCELLED';
    }

    // Idempotent update
    if (mappedShipmentStatus !== shipment.shipmentStatus || mappedOrderStatus !== shipment.order.orderStatus) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          shipmentStatus: mappedShipmentStatus,
          rawResponse: payload,
        },
      });

      if (mappedOrderStatus !== shipment.order.orderStatus) {
        await prisma.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: mappedOrderStatus },
        });

        await prisma.orderTimeline.create({
          data: {
            orderId: shipment.orderId,
            status: mappedOrderStatus,
            title: `Shipment Status: ${mappedShipmentStatus}`,
            description: payload.message || payload.activity || `Status updated via NimbusPost webhook.`,
          },
        });
      }
    }

    return { success: true, message: `Webhook processed for AWB ${awb}.` };
  }
}

export const shippingService = new ShippingService();
