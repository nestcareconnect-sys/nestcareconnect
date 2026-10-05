import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode } from '@prisma/client';
import { shippingService } from '../services/shipping/shipping.service.js';
import { NimbusPostShippingProvider } from '../services/shipping/nimbuspost.provider.js';

export async function getShippingRules(req: Request, res: Response) {
  try {
    const rules = await prisma.shippingRule.findMany({
      orderBy: { country: 'asc' },
    });
    return res.json({ success: true, data: rules });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getShippingRuleByCountry(req: Request, res: Response) {
  try {
    const { country } = req.params;
    const rule = await prisma.shippingRule.findUnique({
      where: { country: country.toUpperCase() as CountryCode },
    });

    if (!rule) {
      return res.json({
        success: true,
        data: {
          country,
          shippingFee: country === 'IN' ? 99 : country === 'AE' ? 25 : 9.99,
          freeShippingThreshold: country === 'IN' ? 999 : country === 'AE' ? 200 : 75,
          estimatedDays: '3-5 business days',
          active: true,
        },
      });
    }

    return res.json({ success: true, data: rule });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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

    return res.json({ success: true, message: 'Shipping rule saved.', data: rule });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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
    const { pincode, pickupPincode, weightKg, destinationPincode } = req.body;
    const destPin = pincode || destinationPincode;

    if (!destPin) {
      return res.status(400).json({ success: false, message: 'Delivery PIN code is required.' });
    }

    const result = await shippingService.checkServiceability({
      destinationPincode: destPin,
      originPincode: pickupPincode,
      weightKg: weightKg ? parseFloat(weightKg) : 1.0,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Dispatch / Book Shipment on NimbusPost for an Order
 */
export async function createNimbusShipment(req: Request, res: Response) {
  try {
    const { orderId, courierId, courierName, pickupPincode } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const shipment = await shippingService.createShipmentForOrder(orderId, {
      courierId: courierId ? parseInt(courierId, 10) : undefined,
      courierName,
      pickupPincode,
    });

    const isTest = shipment.isTestMode;
    const message = isTest
      ? `TEST shipment created with ${shipment.courierName}. AWB: ${shipment.awbNumber} (NimbusPost Test Mode)`
      : `Shipment created with ${shipment.courierName}. AWB: ${shipment.awbNumber}`;

    return res.json({
      success: true,
      message,
      data: shipment,
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
    const { orderId, courierId, courierName } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    // Check existing shipment status
    const existing = await prisma.shipment.findUnique({ where: { orderId } });
    if (existing && existing.awbNumber && existing.shipmentStatus !== 'SHIPMENT_CREATION_FAILED' && existing.shipmentStatus !== 'FAILED') {
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
    });

    return res.json({
      success: true,
      message: `Shipment retried successfully. AWB: ${shipment.awbNumber}`,
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
 * Get NimbusPost Configuration Settings
 */
export async function getNimbusSettings(req: Request, res: Response) {
  try {
    const nimbusProvider = new NimbusPostShippingProvider();
    const config = await nimbusProvider.getConfig();

    return res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update NimbusPost Configuration Settings
 */
export async function updateNimbusSettings(req: Request, res: Response) {
  try {
    const settingsData = req.body;

    await prisma.siteSetting.upsert({
      where: { key: 'nimbuspost_config' },
      update: { value: settingsData },
      create: { key: 'nimbuspost_config', value: settingsData },
    });

    return res.json({
      success: true,
      message: 'NimbusPost configuration updated successfully.',
      data: settingsData,
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
