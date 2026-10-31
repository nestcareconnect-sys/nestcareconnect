import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode, OrderStatus } from '@prisma/client';
import { shippingService } from '../services/shipping/shipping.service.js';
import { NimbusPostShippingProvider } from '../services/shipping/nimbuspost.provider.js';
import { handleControllerError } from '../utils/dbError.js';
import { enrichOrderForResponse } from './order.controller.js';
import { cacheService } from '../services/cache.service.js';
import { emailService } from '../services/email.service.js';

export async function getShippingRules(req: Request, res: Response) {
  try {
    const cached = cacheService.get('shipping:rules');
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const rules = await prisma.shippingRule.findMany({
      orderBy: { country: 'asc' },
    });

    cacheService.set('shipping:rules', rules, 3600); // 1 hour cache
    return res.json({ success: true, data: rules });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch shipping rules.');
  }
}

export async function getShippingRuleByCountry(req: Request, res: Response) {
  try {
    const { country } = req.params;
    const cacheKey = `shipping:rule:${country.toUpperCase()}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const rule = await prisma.shippingRule.findUnique({
      where: { country: country.toUpperCase() as CountryCode },
    });

    if (!rule) {
      const defaultRule = {
        country,
        shippingFee: country === 'IN' ? 99 : country === 'AE' ? 25 : (country === 'UK' || country === 'GB') ? 7.99 : 9.99,
        freeShippingThreshold: country === 'IN' ? 999 : country === 'AE' ? 200 : (country === 'UK' || country === 'GB') ? 60 : 75,
        estimatedDays: (country === 'UK' || country === 'GB') ? '3-5 business days across UK' : '3-5 business days',
        active: true,
      };
      cacheService.set(cacheKey, defaultRule, 3600);
      return res.json({
        success: true,
        data: defaultRule,
      });
    }

    cacheService.set(cacheKey, rule, 3600);
    return res.json({ success: true, data: rule });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch shipping rule.');
  }
}

export async function upsertShippingRule(req: Request, res: Response) {
  try {
    const { country, minOrderAmount, shippingFee, freeShippingThreshold, estimatedDays, active } = req.body;

    if (!country) {
      return res.status(400).json({ success: false, message: 'Country code is required.' });
    }

    const rule = await prisma.shippingRule.upsert({
      where: { country: country.toUpperCase() as CountryCode },
      update: {
        minOrderAmount: minOrderAmount !== undefined ? parseFloat(minOrderAmount) : undefined,
        shippingFee: shippingFee !== undefined ? parseFloat(shippingFee) : undefined,
        freeShippingThreshold:
          freeShippingThreshold !== undefined
            ? freeShippingThreshold
              ? parseFloat(freeShippingThreshold)
              : null
            : undefined,
        estimatedDays: estimatedDays || undefined,
        active: active !== undefined ? active : undefined,
      },
      create: {
        country: country.toUpperCase() as CountryCode,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        shippingFee: shippingFee ? parseFloat(shippingFee) : 0,
        freeShippingThreshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        estimatedDays: estimatedDays || '3-5 business days',
        active: active !== undefined ? active : true,
      },
    });

    cacheService.delPrefix('shipping:rule');
    return res.json({ success: true, message: 'Shipping rule saved.', data: rule });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to save shipping rule.');
  }
}

// -------------------------------------------------------------
// NIMBUSPOST LOGISTICS & SHIPPING PROVIDER ENDPOINTS
// -------------------------------------------------------------

/**
 * Get Shipping Provider Info & Test Mode Status
 */
export async function getShippingInfo(req: Request, res: Response) {
  try {
    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();

    return res.json({
      success: true,
      data: {
        provider: 'nimbuspost',
        providerName: 'NimbusPost Logistics',
        env: config.env,
        isTestMode: config.env === 'test',
        baseUrl: config.baseUrl,
        dashboardUrl: 'https://ship.nimbuspost.com/orders',
        pickupLocation: config.pickupLocation,
        pickupCity: config.pickupCity,
        pickupPincode: config.pickupPincode,
        defaultCourier: config.defaultCourier,
        sandboxMode: config.sandboxMode,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Check Pincode Serviceability & Courier Rates
 */
export async function checkNimbusServiceability(req: Request, res: Response) {
  try {
    const { pincode, pickupPincode, weightKg, destinationPincode, items, cartId, paymentType } = req.body;
    const destPin = pincode || destinationPincode;

    if (!destPin) {
      return res.status(400).json({ success: false, message: 'Delivery PIN code is required.' });
    }

    const itemsSig = Array.isArray(items)
      ? items.map((i: any) => `${i.productId || i.hamperId}:${i.quantity}`).sort().join(',')
      : (cartId || 'none');
    const cacheKey = `shipping:nimbus:${destPin}:${pickupPincode || 'def'}:${paymentType || 'prepaid'}:${weightKg || 'auto'}:${itemsSig}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    let calculatedPackage: any = null;
    let targetWeightKg = weightKg ? parseFloat(weightKg) : 1.0;
    let dimensions: { length: number; breadth: number; height: number } | undefined = undefined;

    // If cart items or cartId provided, compute real weight & dimensions from database
    let itemsToProcess = Array.isArray(items) ? items : null;
    if (!itemsToProcess && cartId) {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true },
      });
      if (cart && cart.items.length > 0) {
        itemsToProcess = cart.items;
      }
    }

    if (itemsToProcess && itemsToProcess.length > 0) {
      calculatedPackage = await shippingService.calculateCartPackageDetails(itemsToProcess);
      targetWeightKg = calculatedPackage.chargeableWeightKg;
      dimensions = {
        length: calculatedPackage.lengthCm,
        breadth: calculatedPackage.breadthCm,
        height: calculatedPackage.heightCm,
      };
    }

    const result = await shippingService.checkServiceability({
      destinationPincode: destPin,
      originPincode: pickupPincode,
      weightKg: targetWeightKg,
      dimensions,
      paymentType: paymentType || 'prepaid',
    });

    const responseData = {
      ...result,
      packageDetails: calculatedPackage,
      missingShippingDetails: calculatedPackage ? !calculatedPackage.isComplete : false,
      missingProducts: calculatedPackage ? calculatedPackage.missingProducts : [],
    };

    cacheService.set(cacheKey, responseData, 1800); // 30 min cache

    return res.json({ success: true, data: responseData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Option B: Dispatch / Book Shipment on NimbusPost (Automated) for an Order
 * Validates order state, reviews chargeable weight, and communicates with NimbusPost API
 */
export async function createNimbusShipment(req: Request, res: Response) {
  try {
    const { orderId, courierId, courierName, pickupPincode, allowSimulation } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${orderId} not found.` });
    }

    if (order.orderStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot create a shipment for a cancelled order.' });
    }

    // Duplicate shipment creation check (idempotency safety)
    if (
      order.shipment &&
      order.shipment.awbNumber &&
      order.shipment.shipmentStatus !== 'FAILED' &&
      order.shipment.shipmentStatus !== 'SHIPMENT_CREATION_FAILED' &&
      order.shipment.shipmentStatus !== 'SIMULATED_TEST'
    ) {
      return res.status(400).json({
        success: false,
        message: `Order #${order.orderNumber} already has an active live shipment with AWB ${order.shipment.awbNumber}. Duplicate booking prevented.`,
      });
    }

    const shipment = await shippingService.createShipmentForOrder(orderId, {
      courierId: courierId ? parseInt(courierId, 10) : undefined,
      courierName,
      pickupPincode,
      allowSimulation: allowSimulation === true,
    });

    const isSimulated = shipment.isSimulated || shipment.shipmentStatus === 'SIMULATED_TEST';
    const finalShipmentStatus = isSimulated ? 'SIMULATED_TEST' : (shipment.shipmentStatus || 'SHIPPED');

    // Update order status and shipping method to NIMBUSPOST_AUTOMATED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMethod: 'NIMBUSPOST_AUTOMATED',
        orderStatus: OrderStatus.SHIPPED,
        trackingNumber: shipment.awbNumber,
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    await prisma.shipment.update({
      where: { orderId },
      data: {
        shippingMethod: 'NIMBUSPOST_AUTOMATED',
        provider: 'NIMBUSPOST',
        shipmentStatus: finalShipmentStatus,
        dispatchedAt: new Date(),
      },
    });

    if (shipment.awbNumber) {
      emailService.sendShipmentTrackingEmail({
        order: updatedOrder,
        courierName: shipment.courierName || 'NimbusPost Courier Partner',
        trackingNumber: shipment.awbNumber,
        trackingUrl: shipment.trackingUrl || `https://nimbuspost.com/track/${shipment.awbNumber}`,
        estimatedDelivery: shipment.estimatedDelivery || undefined,
      }).catch((eErr) => console.warn('[createNimbusShipment] Tracking email dispatch warning:', eErr.message));
    }

    const message = isSimulated
      ? `Sandbox simulation generated with ${shipment.courierName}. Reference: ${shipment.awbNumber} (Note: Not booked with live courier)`
      : `Live shipment booked with ${shipment.courierName}. AWB: ${shipment.awbNumber}`;

    return res.json({
      success: true,
      message,
      data: enrichOrderForResponse(updatedOrder),
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create NimbusPost shipment.',
    });
  }
}

/**
 * Admin Manual Retry for Failed Shipments (with Idempotency Protection)
 */
export async function retryShipment(req: Request, res: Response) {
  try {
    const { orderId, courierId, courierName, allowSimulation } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    // Check existing shipment status (prevent duplicate if already booked with live courier)
    const existing = await prisma.shipment.findUnique({ where: { orderId } });
    if (
      existing &&
      existing.awbNumber &&
      existing.shipmentStatus !== 'SHIPMENT_CREATION_FAILED' &&
      existing.shipmentStatus !== 'FAILED' &&
      existing.shipmentStatus !== 'SIMULATED_TEST'
    ) {
      return res.json({
        success: true,
        message: `Shipment already exists with AWB ${existing.awbNumber}. Duplicate creation prevented.`,
        data: existing,
      });
    }

    const shipment = await shippingService.createShipmentForOrder(orderId, {
      courierId: courierId ? parseInt(courierId, 10) : undefined,
      courierName,
      isManualRetry: true,
      allowSimulation: allowSimulation === true,
    });

    const isSimulated = shipment.isSimulated || shipment.shipmentStatus === 'SIMULATED_TEST';
    const message = isSimulated
      ? `Sandbox simulation generated. Reference: ${shipment.awbNumber}`
      : `Shipment retried and booked successfully. AWB: ${shipment.awbNumber}`;

    return res.json({
      success: true,
      message,
      data: shipment,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retry shipment creation.',
    });
  }
}

/**
 * Track NimbusPost Shipment by AWB or Order Number
 */
export async function trackNimbusShipment(req: Request, res: Response) {
  try {
    const { awb } = req.params;

    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB or Order number is required.' });
    }

    const trackingData = await shippingService.trackShipment(awb);

    if (!trackingData) {
      return res.status(404).json({ success: false, message: 'No tracking details found.' });
    }

    return res.json({ success: true, data: trackingData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Cancel NimbusPost Shipment
 */
export async function cancelNimbusShipment(req: Request, res: Response) {
  try {
    const { awb } = req.body;

    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB number is required.' });
    }

    const result = await shippingService.cancelShipment(awb);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Request Courier Pickup Scheduling on NimbusPost
 */
export async function requestNimbusPickup(req: Request, res: Response) {
  try {
    const { pickupLocation, pickupPincode, pickupDate, pickupTime, expectedPackageCount } = req.body;
    const result = await shippingService.requestPickup({
      pickupLocation,
      pickupPincode,
      pickupDate,
      pickupTime,
      expectedPackageCount: expectedPackageCount ? parseInt(expectedPackageCount, 10) : undefined,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get NimbusPost Configuration Settings
 * Masks passwords, API keys, and secrets so credentials are never leaked to client
 */
export async function getNimbusSettings(req: Request, res: Response) {
  try {
    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();

    // Sanitize credentials before responding to frontend
    const sanitizedConfig = {
      ...config,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 6)}••••••••` : '',
      secret: config.secret ? '••••••••••••••••' : '',
      password: config.password ? '••••••••' : '',
      hasApiKey: !!config.apiKey,
      hasSecret: !!config.secret,
      hasPassword: !!config.password,
    };

    return res.json({
      success: true,
      data: sanitizedConfig,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update NimbusPost Configuration Settings
 * Preserves existing credentials if incoming payload has masked/empty values
 */
export async function updateNimbusSettings(req: Request, res: Response) {
  try {
    const settingsData = { ...req.body };

    // Fetch existing settings to preserve passwords/keys if masked
    const existing = await prisma.siteSetting.findUnique({
      where: { key: 'nimbuspost_config' },
    });
    const existingVal = (existing?.value && typeof existing.value === 'object') ? (existing.value as any) : {};

    if (!settingsData.apiKey || settingsData.apiKey.includes('••••')) {
      settingsData.apiKey = existingVal.apiKey || process.env.NIMBUSPOST_API_KEY || '';
    }
    if (!settingsData.secret || settingsData.secret.includes('••••')) {
      settingsData.secret = existingVal.secret || process.env.NIMBUSPOST_SECRET || '';
    }
    if (!settingsData.password || settingsData.password.includes('••••')) {
      settingsData.password = existingVal.password || process.env.NIMBUSPOST_PASSWORD || '';
    }

    await prisma.siteSetting.upsert({
      where: { key: 'nimbuspost_config' },
      update: { value: settingsData },
      create: { key: 'nimbuspost_config', value: settingsData },
    });

    const safeResponse = {
      ...settingsData,
      apiKey: settingsData.apiKey ? `${settingsData.apiKey.slice(0, 6)}••••••••` : '',
      secret: settingsData.secret ? '••••••••••••••••' : '',
      password: settingsData.password ? '••••••••' : '',
      hasApiKey: !!settingsData.apiKey,
      hasSecret: !!settingsData.secret,
      hasPassword: !!settingsData.password,
    };

    return res.json({
      success: true,
      message: 'NimbusPost configuration updated successfully.',
      data: safeResponse,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Handle NimbusPost Webhook Callback
 */
export async function handleNimbusWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;
    const result = await shippingService.handleWebhook(payload);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * -------------------------------------------------------------
 * MANUAL SHIPMENT DISPATCH ENDPOINT
 * -------------------------------------------------------------
 * Allows admin to manually ship with any courier (India Post, DTDC, Blue Dart, etc.)
 * and publish the tracking ID to the web so the customer can track it online.
 */
export async function createManualShipment(req: Request, res: Response) {
  try {
    const {
      orderId,
      courierName,
      trackingNumber,
      trackingUrl,
      dispatchDate,
      dispatchedAt,
      estimatedDelivery,
      estimatedDeliveryDate,
      shippingNotes,
      notifyCustomer = true,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }
    if (!courierName || !courierName.trim()) {
      return res.status(400).json({ success: false, message: 'Courier or Carrier name is required.' });
    }
    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Tracking ID / Consignment number is required.' });
    }

    const cleanCourier = courierName.trim();
    const cleanTracking = trackingNumber.trim();
    
    // Validate tracking URL safely
    let cleanTrackingUrl: string | null = null;
    if (trackingUrl && typeof trackingUrl === 'string' && trackingUrl.trim()) {
      const trimmedUrl = trackingUrl.trim();
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          cleanTrackingUrl = trimmedUrl;
        }
      } catch {
        cleanTrackingUrl = null;
      }
    }

    const cleanEstimatedDelivery = estimatedDelivery ? estimatedDelivery.trim() : null;
    const cleanNotes = shippingNotes ? shippingNotes.trim() : null;

    // Parse dispatch date
    let parsedDispatchedAt: Date = new Date();
    const rawDispatchDate = dispatchDate || dispatchedAt;
    if (rawDispatchDate) {
      const parsed = new Date(rawDispatchDate);
      if (!isNaN(parsed.getTime())) {
        parsedDispatchedAt = parsed;
      }
    }

    let parsedEstimatedDeliveryAt: Date | null = null;
    if (estimatedDeliveryDate) {
      const parsed = new Date(estimatedDeliveryDate);
      if (!isNaN(parsed.getTime())) {
        parsedEstimatedDeliveryAt = parsed;
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${orderId} not found.` });
    }

    // Upsert shipment record with MANUAL provider
    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      update: {
        provider: 'MANUAL',
        shippingMethod: 'MANUAL',
        courierName: cleanCourier,
        trackingNumber: cleanTracking,
        awbNumber: cleanTracking,
        trackingUrl: cleanTrackingUrl,
        estimatedDelivery: cleanEstimatedDelivery,
        estimatedDeliveryAt: parsedEstimatedDeliveryAt,
        shippingNotes: cleanNotes,
        shipmentStatus: 'SHIPPED',
        dispatchedAt: parsedDispatchedAt,
        errorMessage: null,
      },
      create: {
        orderId,
        provider: 'MANUAL',
        shippingMethod: 'MANUAL',
        courierName: cleanCourier,
        trackingNumber: cleanTracking,
        awbNumber: cleanTracking,
        trackingUrl: cleanTrackingUrl,
        estimatedDelivery: cleanEstimatedDelivery,
        estimatedDeliveryAt: parsedEstimatedDeliveryAt,
        shippingNotes: cleanNotes,
        shipmentStatus: 'SHIPPED',
        dispatchedAt: parsedDispatchedAt,
      },
    });

    // Update order status to SHIPPED with tracking number & manual shipping method
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.SHIPPED,
        shippingMethod: 'MANUAL',
        trackingNumber: cleanTracking,
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Format dispatch date for timeline record
    const formattedDate = parsedDispatchedAt.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Append to order timeline
    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.SHIPPED,
        title: `Dispatched via ${cleanCourier} (Tracking ID: ${cleanTracking})`,
        description: `Package shipped manually via ${cleanCourier}. Tracking ID: ${cleanTracking}. Dispatched on: ${formattedDate}.${
          cleanTrackingUrl ? ` Carrier tracking portal: ${cleanTrackingUrl}` : ''
        }${cleanEstimatedDelivery ? ` Estimated delivery: ${cleanEstimatedDelivery}.` : ''}${cleanNotes ? ` Note: ${cleanNotes}` : ''}`,
      },
    });

    // Send shipment tracking email to customer via MSG91
    emailService.sendShipmentTrackingEmail({
      order: updatedOrder,
      courierName: cleanCourier,
      trackingNumber: cleanTracking,
      trackingUrl: cleanTrackingUrl || undefined,
      estimatedDelivery: cleanEstimatedDelivery || undefined,
    }).catch((eErr) => console.warn('[createManualShipment] Shipment tracking email warning:', eErr.message));

    return res.json({
      success: true,
      message: `Order #${order.orderNumber} successfully shipped via ${cleanCourier}! Tracking ID (${cleanTracking}) is now published to the web.`,
      data: {
        order: enrichOrderForResponse(updatedOrder),
        shipment,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to save manual shipment.');
  }
}

/**
 * Reset shipment status back to PENDING_SELECTION / unbooked
 * Allows admin to change fulfillment method or redo shipment details.
 */
export async function resetShipment(req: Request, res: Response) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Reset order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMethod: 'PENDING_SELECTION',
        trackingNumber: null,
        orderStatus: OrderStatus.CONFIRMED,
      },
      include: {
        items: true,
        shipment: true,
      },
    });

    // Reset or delete existing shipment
    if (order.shipment) {
      await prisma.shipment.update({
        where: { orderId },
        data: {
          shipmentStatus: 'NOT_SHIPPED',
          shippingMethod: 'PENDING_SELECTION',
          awbNumber: null,
          trackingNumber: null,
          trackingUrl: null,
          dispatchedAt: null,
          labelUrl: null,
          errorMessage: null,
        },
      });
    }

    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.CONFIRMED,
        title: 'Shipment Fulfillment Reset',
        description: 'Shipment selection was reset by admin. Ready for new fulfillment selection.',
      },
    });

    return res.json({
      success: true,
      message: `Shipment for order #${order.orderNumber} has been reset to pending.`,
      data: updatedOrder,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to reset shipment.');
  }
}

/**
 * Option C: Record Manually Created NimbusPost Shipment
 * Admin manually creates consignment on NimbusPost web console and records AWB / details here
 */
export async function recordNimbusManualShipment(req: Request, res: Response) {
  try {
    const {
      orderId,
      awbNumber,
      trackingNumber,
      courierName,
      trackingUrl,
      nimbusPostShipmentId,
      dispatchDate,
      dispatchedAt,
      estimatedDelivery,
      shippingNotes,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const cleanAwb = (awbNumber || trackingNumber || '').trim();
    if (!cleanAwb) {
      return res.status(400).json({ success: false, message: 'NimbusPost AWB / tracking number is required.' });
    }

    const cleanCourier = (courierName || 'NimbusPost Courier Partner').trim();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${orderId} not found.` });
    }

    if (order.orderStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot ship a cancelled order.' });
    }

    // Validate or construct tracking URL safely
    let cleanTrackingUrl: string = `https://nimbuspost.com/track/${cleanAwb}`;
    if (trackingUrl && typeof trackingUrl === 'string' && trackingUrl.trim()) {
      const trimmedUrl = trackingUrl.trim();
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          cleanTrackingUrl = trimmedUrl;
        }
      } catch {
        // Keep default safe URL
      }
    }

    // Parse dispatch date
    let parsedDispatchedAt: Date = new Date();
    const rawDispatchDate = dispatchDate || dispatchedAt;
    if (rawDispatchDate) {
      const parsed = new Date(rawDispatchDate);
      if (!isNaN(parsed.getTime())) {
        parsedDispatchedAt = parsed;
      }
    }

    const cleanNotes = shippingNotes ? shippingNotes.trim() : null;
    const cleanEstimatedDelivery = estimatedDelivery ? estimatedDelivery.trim() : null;
    const cleanShipmentId = nimbusPostShipmentId ? String(nimbusPostShipmentId).trim() : null;

    // Upsert Shipment record with NIMBUSPOST_MANUAL
    await prisma.shipment.upsert({
      where: { orderId },
      update: {
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        courierName: cleanCourier,
        awbNumber: cleanAwb,
        trackingNumber: cleanAwb,
        trackingUrl: cleanTrackingUrl,
        nimbusPostShipmentId: cleanShipmentId,
        estimatedDelivery: cleanEstimatedDelivery,
        shippingNotes: cleanNotes,
        shipmentStatus: 'SHIPPED',
        dispatchedAt: parsedDispatchedAt,
        errorMessage: null,
      },
      create: {
        orderId,
        provider: 'NIMBUSPOST',
        shippingMethod: 'NIMBUSPOST_MANUAL',
        courierName: cleanCourier,
        awbNumber: cleanAwb,
        trackingNumber: cleanAwb,
        trackingUrl: cleanTrackingUrl,
        nimbusPostShipmentId: cleanShipmentId,
        estimatedDelivery: cleanEstimatedDelivery,
        shippingNotes: cleanNotes,
        shipmentStatus: 'SHIPPED',
        dispatchedAt: parsedDispatchedAt,
      },
    });

    // Update Order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.SHIPPED,
        shippingMethod: 'NIMBUSPOST_MANUAL',
        trackingNumber: cleanAwb,
      },
      include: {
        items: true,
        shipment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Format dispatch date for timeline record
    const formattedDate = parsedDispatchedAt.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Append to OrderTimeline
    await prisma.orderTimeline.create({
      data: {
        orderId,
        status: OrderStatus.SHIPPED,
        title: `Dispatched via NimbusPost (Manual) - ${cleanCourier}`,
        description: `Shipment processed manually on NimbusPost console with ${cleanCourier}. AWB: ${cleanAwb}. Dispatched on: ${formattedDate}.${
          cleanShipmentId ? ` NimbusPost Shipment ID: ${cleanShipmentId}.` : ''
        }${cleanTrackingUrl ? ` Tracking: ${cleanTrackingUrl}` : ''}${cleanNotes ? ` Note: ${cleanNotes}` : ''}`,
      },
    });

    // Send shipment tracking notification via MSG91
    emailService.sendShipmentTrackingEmail({
      order: updatedOrder,
      courierName: cleanCourier,
      trackingNumber: cleanAwb,
      trackingUrl: cleanTrackingUrl,
      estimatedDelivery: cleanEstimatedDelivery || undefined,
      isUpdate: Boolean(order.trackingNumber && order.trackingNumber !== cleanAwb),
    }).catch((eErr) => console.warn('[recordNimbusManualShipment] Shipment email warning:', eErr.message));

    return res.json({
      success: true,
      message: `Order #${order.orderNumber} successfully recorded as dispatched via NimbusPost (Manual). AWB: ${cleanAwb}`,
      data: enrichOrderForResponse(updatedOrder),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to record manual NimbusPost shipment.');
  }
}

/**
 * Get Authoritative Package Details for Order
 * Provides weight, dimensions, chargeable weight, and copyable summary for admin review
 */
export async function getOrderPackageDetails(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

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
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Requirement 7: Block orders with 0 items
    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This order has no valid product items. Please verify the order details before generating the NimbusPost CSV.',
      });
    }

    const pkg = await shippingService.calculatePackageDetails(order);
    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();

    const volWeight = (pkg.dimensions.length * pkg.dimensions.breadth * pkg.dimensions.height) / 5000;
    const chargeableWeight = Math.max(pkg.weightKg, Math.round(volWeight * 100) / 100);

    const shipping = (order.shippingAddress as any) || {};

    const fullAddress = [
      shipping.name || order.guestName,
      shipping.addressLine1,
      shipping.addressLine2,
      shipping.city,
      shipping.state,
      shipping.postalCode ? `PIN: ${shipping.postalCode}` : '',
      shipping.country || order.country,
    ]
      .filter(Boolean)
      .join(', ');

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderValue: order.total,
        currency: order.currency,
        country: order.country,
        customerName: order.guestName || shipping.name || 'Valued Customer',
        customerPhone: order.guestPhone || shipping.phone || '',
        customerEmail: order.guestEmail || shipping.email || '',
        shippingAddress: {
          name: shipping.name || order.guestName || '',
          phone: shipping.phone || order.guestPhone || '',
          addressLine1: shipping.addressLine1 || '',
          addressLine2: shipping.addressLine2 || '',
          city: shipping.city || '',
          state: shipping.state || '',
          postalCode: shipping.postalCode || '',
          country: shipping.country || order.country,
        },
        fullAddressString: fullAddress,
        pickupHub: {
          hubName: config.pickupLocation,
          city: config.pickupCity,
          pincode: config.pickupPincode,
        },
        packageWeightKg: pkg.weightKg,
        dimensions: pkg.dimensions,
        dimensionsString: `${pkg.dimensions.length} x ${pkg.dimensions.breadth} x ${pkg.dimensions.height} cm`,
        chargeableWeightKg: chargeableWeight,
        items: (order.items || []).map((itm) => ({
          name: itm.name,
          quantity: itm.quantity,
          unitPrice: itm.unitPrice,
          totalPrice: itm.totalPrice,
          sku: itm.sku,
        })),
        isCustomHamper: pkg.isCustomHamper,
        boxDetails: pkg.boxDetails,
        existingShipment: order.shipment,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        shippingMethod: order.shippingMethod,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to calculate order package details.');
  }
}

/**
 * Option C: Dedicated Controller Function for NimbusPost Manual Order Ingestion
 * Registers order in NimbusPost New Orders queue without assigning a courier or generating an AWB.
 */
export async function pushOrderToNimbusPostNewOrders(req: Request, res: Response) {
  try {
    const { orderId, pickupPincode, forceRetry } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const result = await shippingService.pushOrderToNimbusPostNewOrders(orderId, {
      pickupPincode,
      forceRetry,
    });

    return res.json({
      success: result.success,
      importStatus: result.importStatus,
      message: result.message,
      apiLimitation: result.apiLimitationNote,
      data: {
        order: enrichOrderForResponse(result.data?.order),
        shipment: result.data?.shipment,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        nimbusOrderId: result.nimbusOrderId,
        dashboardUrl: result.dashboardUrl,
        downloadCsvUrl: result.downloadCsvUrl,
        orderStatus: result.orderStatus,
        shipmentStatus: result.shipmentStatus,
        isBooked: result.isBooked,
        awbNumber: result.awbNumber,
        courierName: result.courierName,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to process order for NimbusPost New Orders.');
  }
}

/**
 * Export official NimbusPost Bulk Order CSV for 1-click import into NimbusPost New Orders
 */
export async function exportNimbusOrderCsv(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, items: { select: { id: true } } },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This order has no valid product items. Please verify the order details before generating the NimbusPost CSV.',
      });
    }

    const csvContent = await shippingService.generateNimbusPostOrderCsv(orderId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nimbuspost_order_${order.orderNumber}.csv"`);
    return res.send(csvContent);
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to export NimbusPost order CSV.');
  }
}

/**
 * Confirm Order was Uploaded to NimbusPost Bulk Upload
 */
export async function confirmNimbusPostImported(req: Request, res: Response) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const result = await shippingService.confirmNimbusPostImported(orderId);
    return res.json({
      success: true,
      message: result.message,
      data: {
        order: enrichOrderForResponse(result.order),
        shipment: result.shipment,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to confirm NimbusPost import.');
  }
}

/**
 * Mark Order CSV as Generated
 */
export async function markOrderCsvGenerated(req: Request, res: Response) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const result = await shippingService.markOrderCsvGenerated(orderId);
    return res.json({
      success: true,
      message: result.message,
      data: {
        order: enrichOrderForResponse(result.order),
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to mark order CSV as generated.');
  }
}

/**
 * Backward compatible alias for pushOrderToNimbusPostNewOrders
 */
export const pushOrderToNimbusManual = pushOrderToNimbusPostNewOrders;

/**
 * Option B: Dedicated Controller Function for NimbusPost Automated Dispatch
 */
export async function createNimbusPostAutomatedShipment(req: Request, res: Response) {
  return createNimbusShipment(req, res);
}

/**
 * Synchronize Order / Shipment Tracking Status from NimbusPost
 */
export async function syncNimbusShipment(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId || req.body.orderId;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const result = await shippingService.syncNimbusShipmentStatus(orderId);

    return res.json({
      success: true,
      message: result.message,
      data: {
        order: enrichOrderForResponse(result.order),
        shipment: result.shipment,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to sync shipment status with NimbusPost.');
  }
}



