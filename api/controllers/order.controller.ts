import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { pricingService } from '../services/pricing.service.js';
import { inventoryService } from '../services/inventory.service.js';
import { nimbusPostService } from '../services/shipping/nimbuspost.service.js';
import { CountryCode, CurrencyCode, OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { sanitizeAndValidateEmail, validatePhoneNumber } from '../utils/validation.js';
import { handleControllerError } from '../utils/dbError.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { cacheService } from '../services/cache.service.js';


/**
 * Helper to enrich order objects with buyer/recipient fields and normalized shipping/tracking details for UI consumption
 */
export function enrichOrderForResponse(order: any) {
  if (!order) return order;
  const shipping = order.shippingAddress || {};

  const isManualShipment =
    order.shippingMethod === 'MANUAL' ||
    order.shipment?.shippingMethod === 'MANUAL' ||
    order.shipment?.provider === 'MANUAL';

  const rawMethod = order.shippingMethod || order.shipment?.shippingMethod;
  const shippingMethod =
    rawMethod === 'NIMBUSPOST_AUTOMATED'
      ? 'NIMBUSPOST_AUTOMATED'
      : rawMethod === 'NIMBUSPOST_MANUAL'
      ? 'NIMBUSPOST_MANUAL'
      : (rawMethod === 'MANUAL' || order.shipment?.provider === 'MANUAL')
      ? 'MANUAL'
      : (rawMethod === 'NIMBUSPOST' || order.shipment?.provider === 'NIMBUSPOST')
      ? 'NIMBUSPOST_AUTOMATED'
      : (order.orderStatus === 'SHIPPED' && isManualShipment ? 'MANUAL' : (rawMethod || 'PENDING_SELECTION'));

  const shippingMethodLabel =
    shippingMethod === 'MANUAL'
      ? 'Manual'
      : (shippingMethod === 'NIMBUSPOST_AUTOMATED' || shippingMethod === 'NIMBUSPOST' || shippingMethod === 'NIMBUSPOST_MANUAL')
      ? 'NimbusPost'
      : 'Standard Fulfillment';

  const trackingNumber =
    order.shipment?.trackingNumber ||
    order.shipment?.awbNumber ||
    order.trackingNumber ||
    null;

  const courierName =
    order.shipment?.courierName ||
    (isManualShipment
      ? (trackingNumber ? 'Direct Courier Partner' : null)
      : (trackingNumber || order.shipment?.provider === 'NIMBUSPOST' ? 'NimbusPost Partner' : null));

  const trackingUrl = order.shipment?.trackingUrl || (trackingNumber && (shippingMethod === 'NIMBUSPOST_AUTOMATED' || shippingMethod === 'NIMBUSPOST_MANUAL') ? `https://nimbuspost.com/track/${trackingNumber}` : null);
  const dispatchedAt = order.shipment?.dispatchedAt || null;
  const estimatedDelivery = order.shipment?.estimatedDelivery || null;
  const shipmentStatus =
    order.shipment?.shipmentStatus ||
    (order.orderStatus === 'SHIPPED' ? 'SHIPPED' : order.orderStatus === 'DELIVERED' ? 'DELIVERED' : 'NOT_SHIPPED');

  // Derive manual import status for NimbusPost workflow:
  // NOT_IMPORTED | IMPORTING | IMPORTED_TO_NIMBUSPOST | IMPORT_FAILED | SHIPMENT_CREATED
  let importStatus: 'NOT_IMPORTED' | 'IMPORTING' | 'IMPORTED_TO_NIMBUSPOST' | 'IMPORT_FAILED' | 'SHIPMENT_CREATED' = 'NOT_IMPORTED';
  if (order.orderStatus === 'SHIPPED' || order.orderStatus === 'DELIVERED' || trackingNumber) {
    importStatus = 'SHIPMENT_CREATED';
  } else {
    const sync = order.syncStatus || order.shipment?.syncStatus;
    if (sync === 'IMPORTED_TO_NIMBUSPOST' || sync === 'IMPORTED') {
      importStatus = 'IMPORTED_TO_NIMBUSPOST';
    } else if (sync === 'IMPORT_FAILED' || sync === 'ERROR' || order.shipment?.shipmentStatus === 'SHIPMENT_CREATION_FAILED') {
      importStatus = 'IMPORT_FAILED';
    } else if (sync === 'IMPORTING') {
      importStatus = 'IMPORTING';
    }
  }

  const isHamperOrder =
    order.items?.some((i: any) =>
      i.itemType === 'HAMPER' ||
      i.itemType === 'CUSTOM_HAMPER' ||
      Boolean(i.hamperId) ||
      i.snapshot?.productType === 'hamper'
    ) ??
    (shipping.isHamperOrder ??
      Boolean(
        shipping.personalizationNote ||
        (Array.isArray(shipping.uploadedPhotos) && shipping.uploadedPhotos.length > 0) ||
        (Array.isArray(shipping.whatsappMedia) && shipping.whatsappMedia.length > 0)
      ));

  const enrichedItems = (order.items || []).map((i: any) => {
    let snap: any = i.snapshot || {};
    if (typeof snap === 'string') {
      try { snap = JSON.parse(snap); } catch {}
    }

    const isHamper =
      i.itemType === 'HAMPER' ||
      i.itemType === 'CUSTOM_HAMPER' ||
      Boolean(i.hamperId) ||
      snap.productType === 'hamper';

    const productType: 'hamper' | 'normal' = isHamper ? 'hamper' : 'normal';

    // Enrich breakdown if hamper
    let breakdown = snap.breakdown;
    if (isHamper && (!breakdown || breakdown.length === 0)) {
      if (i.hamper?.items && Array.isArray(i.hamper.items)) {
        breakdown = i.hamper.items.map((hi: any) => ({
          productId: hi.product?.id || hi.productId,
          name: hi.product?.name || 'Healthcare Item',
          sku: hi.product?.sku || null,
          image: hi.product?.images?.[0] || null,
          images: hi.product?.images || [],
          unit: hi.product?.unit || null,
          variant: hi.product?.unit || hi.product?.packageSize || 'Standard',
          packageSize: hi.product?.packageSize || null,
          brand: hi.product?.brand || null,
          quantity: (hi.quantity || 1) * (i.quantity || 1),
          unitPrice: hi.product?.basePriceINR || 0,
          totalPrice: +((hi.product?.basePriceINR || 0) * (hi.quantity || 1)).toFixed(2),
        }));
      }
    }

    // Default box for hamper if missing
    let box = snap.box;
    if (isHamper && !box) {
      const isSignature = String(i.hamper?.hamperType || '').includes('SIGNATURE');
      const isPremium = String(i.hamper?.hamperType || '').includes('PREMIUM');
      box = {
        name: isSignature
          ? 'Signature Heritage Gift Box'
          : isPremium
          ? 'Premium Magnetic Luxury Box'
          : 'Premium White Keepsake Box',
        size: (breakdown?.length || 0) > 8 ? 'Large' : 'Medium',
        color: isSignature ? 'Warm Cream & Gold' : isPremium ? 'Light Sage Green' : 'Pure White & Gold',
        material: 'Reinforced Matte Rigid Luxury Box',
      };
    }

    // For normal products, enrich image, sku, variant from product relation if missing in snapshot
    const itemImage = snap.image || snap.images?.[0] || i.product?.images?.[0] || null;
    const itemSku = i.sku || snap.sku || i.product?.sku || null;
    const itemVariant = snap.variant || snap.unit || i.product?.unit || i.product?.packageSize || 'Standard';

    return {
      ...i,
      productType,
      sku: itemSku,
      variant: itemVariant,
      image: itemImage,
      snapshot: {
        ...snap,
        productType,
        sku: itemSku,
        variant: itemVariant,
        image: itemImage,
        box,
        breakdown: breakdown || [],
      },
    };
  });

  return {
    ...order,
    items: enrichedItems,
    packingChecklist: (order as any).packingChecklist || { packedItems: {} },
    isHamperOrder,
    buyer: order.buyer || shipping.buyer || {
      name: order.guestName || order.user?.name || '',
      email: order.guestEmail || order.user?.email || '',
      phone: order.guestPhone || '',
      country: order.country,
    },
    recipient: order.recipient || shipping.recipient || shipping,
    buyerCountry: order.buyerCountry || shipping.buyerCountry || order.country,
    buyerCurrency: order.buyerCurrency || shipping.buyerCurrency || order.currency,
    deliveryCountry: order.deliveryCountry || shipping.deliveryCountry || 'IN',
    deliveryCurrency: order.deliveryCurrency || shipping.deliveryCurrency || 'INR',
    videoSecureToken: isHamperOrder ? (order.videoSecureToken || shipping.videoSecureToken) : null,
    videoStatus: isHamperOrder ? (order.videoStatus || shipping.videoStatus || 'NOT_REQUIRED') : 'NOT_REQUIRED',
    personalizationNote: isHamperOrder ? (order.personalizationNote || shipping.personalizationNote || null) : null,
    uploadedPhotos: isHamperOrder ? (order.uploadedPhotos || shipping.uploadedPhotos || []) : [],
    whatsappMedia: isHamperOrder ? (order.whatsappMedia || shipping.whatsappMedia || []) : [],
    whatsappStatus: isHamperOrder ? (order.whatsappStatus || shipping.whatsappStatus || 'NOT_SENT') : 'NOT_APPLICABLE',
    whatsappMessageId: isHamperOrder ? (order.whatsappMessageId || shipping.whatsappMessageId || null) : null,
    whatsappSentAt: isHamperOrder ? (order.whatsappSentAt || shipping.whatsappSentAt || null) : null,

    // Normalized tracking information guaranteed for all frontend views
    shippingMethod,
    shippingMethodLabel,
    trackingNumber,
    courierName,
    trackingUrl,
    dispatchedAt,
    dispatchDate: dispatchedAt,
    estimatedDelivery,
    shipmentStatus,
    importStatus,
    nimbusOrderId: order.nimbusOrderId || order.shipment?.nimbusPostShipmentId || (order.shipment as any)?.providerOrderId || null,
    errorMessage: order.errorMessage || order.shipment?.errorMessage || null,
    isManualShipment,
    manualShipment: isManualShipment && trackingNumber
      ? {
          courierName: courierName || 'Direct Courier Partner',
          trackingNumber,
          trackingUrl,
          estimatedDelivery,
          shippingNotes: order.shipment?.shippingNotes || null,
          dispatchedAt,
          dispatchDate: dispatchedAt,
        }
      : null,
    shipment: order.shipment
      ? {
          ...order.shipment,
          courierName: order.shipment.courierName || courierName,
          trackingNumber: order.shipment.trackingNumber || trackingNumber,
          trackingUrl: order.shipment.trackingUrl || trackingUrl,
          dispatchedAt: order.shipment.dispatchedAt || dispatchedAt,
          estimatedDelivery: order.shipment.estimatedDelivery || estimatedDelivery,
          shipmentStatus: order.shipment.shipmentStatus || shipmentStatus,
          shippingMethod: order.shipment.shippingMethod || shippingMethod,
          syncStatus: order.shipment.syncStatus || order.syncStatus,
        }
      : (trackingNumber
          ? {
              provider: isManualShipment ? 'MANUAL' : 'NIMBUSPOST',
              shippingMethod,
              courierName,
              trackingNumber,
              awbNumber: trackingNumber,
              trackingUrl,
              dispatchedAt,
              estimatedDelivery,
              shipmentStatus,
              syncStatus: order.syncStatus,
            }
          : null),
  };
}

export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const {
      buyer,
      recipient,
      buyerCountry = 'US',
      buyerCurrency = 'USD',
      deliveryCountry = 'IN',
      deliveryCurrency = 'INR',
      country = 'IN',
      currency = 'INR',
      shippingAddress,
      billingAddress,
      paymentProvider = 'RAZORPAY',
      couponCode,
      notes,
      personalizationNote,
      uploadedPhotos = [],
      whatsappMedia = [],
      items,
    } = req.body;

    const deliveryAddr = recipient || shippingAddress;

    if (!deliveryAddr || !deliveryAddr.name || !deliveryAddr.addressLine1 || !deliveryAddr.city) {
      return res.status(400).json({ success: false, message: 'Valid recipient delivery address is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to create an order.' });
    }

    // Authoritative customer email validation (Requirement 3)
    const rawEmail = buyer?.email || req.user?.email || deliveryAddr.email;
    const emailResult = sanitizeAndValidateEmail(rawEmail);
    if (!emailResult.isValid) {
      return res.status(400).json({
        success: false,
        message: emailResult.error || 'A valid customer email address is required to place an order.',
      });
    }
    const cleanCustomerEmail = emailResult.cleanEmail!;

    // Authoritative customer / sender phone validation
    const rawBuyerPhone = buyer?.phone || (req.user as any)?.phone;
    const phoneResult = validatePhoneNumber(rawBuyerPhone);
    if (!phoneResult.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneResult.error || 'Please enter your mobile number.',
      });
    }
    const cleanBuyerPhone = phoneResult.cleanPhone!;

    // 1. Authoritative server-side price calculation
    const calculation = await pricingService.calculateCartTotals({
      items,
      country: (buyerCountry || country) as CountryCode,
      currency: (buyerCurrency || currency) as CurrencyCode,
      couponCode,
    });

    // 2. Generate unique order number & secure video token
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `NCC-${dateStr}-${randomHex}`;
    const videoSecureToken = crypto.randomBytes(16).toString('hex');

    // Check if any hamper in order has video QR enabled
    const hasVideoQR = items.some((i: any) => i.hamper?.allowVideoQR || i.personalization?.videoStatus);
    const initialVideoStatus = hasVideoQR ? 'VIDEO_REQUIRED' : 'NOT_REQUIRED';

    const buyerData = {
      name: (buyer?.name || req.user?.name || deliveryAddr.name || '').trim(),
      email: cleanCustomerEmail,
      phone: cleanBuyerPhone,
      country: buyerCountry || country,
    };

    const recipientEmailResult = deliveryAddr.email ? sanitizeAndValidateEmail(deliveryAddr.email) : null;
    const cleanRecipientEmail = recipientEmailResult && recipientEmailResult.isValid
      ? recipientEmailResult.cleanEmail!
      : cleanCustomerEmail;

    const recipientData = {
      name: deliveryAddr.name.trim(),
      email: cleanRecipientEmail,
      phone: (deliveryAddr.phone || '').trim(),
      relationship: deliveryAddr.relationship || 'Loved One / Parents',
      addressLine1: deliveryAddr.addressLine1.trim(),
      addressLine2: (deliveryAddr.addressLine2 || '').trim() || undefined,
      city: deliveryAddr.city.trim(),
      state: deliveryAddr.state?.trim() || 'Kerala',
      postalCode: (deliveryAddr.postalCode || '').trim(),
      country: deliveryCountry || country,
    };

    const hasHampers = calculation.items.some((itm: any) =>
      itm.itemType === 'HAMPER' ||
      itm.itemType === 'CUSTOM_HAMPER' ||
      Boolean(itm.hamperId) ||
      itm.productType === 'hamper' ||
      itm.snapshot?.productType === 'hamper'
    );

    const mediaImageUrls = hasHampers && Array.isArray(whatsappMedia)
      ? whatsappMedia.filter((m: any) => m.mediaType === 'IMAGE').map((m: any) => m.url)
      : [];
    const combinedPhotos = hasHampers
      ? Array.from(new Set([...(Array.isArray(uploadedPhotos) ? uploadedPhotos : []), ...mediaImageUrls]))
      : [];
    const effectiveWhatsappMedia = hasHampers && Array.isArray(whatsappMedia) ? whatsappMedia : [];

    const combinedShippingSnapshot = {
      ...recipientData,
      email: cleanRecipientEmail,
      buyer: buyerData,
      recipient: recipientData,
      buyerCountry: (buyerCountry || country) as CountryCode,
      buyerCurrency: (buyerCurrency || currency) as CurrencyCode,
      deliveryCountry: (deliveryCountry || country) as CountryCode,
      deliveryCurrency: (deliveryCurrency || currency) as CurrencyCode,
      isHamperOrder: hasHampers,
      personalizationNote: hasHampers ? (personalizationNote?.trim() || null) : null,
      uploadedPhotos: combinedPhotos,
      whatsappMedia: effectiveWhatsappMedia,
      whatsappStatus: hasHampers ? 'PENDING' : 'NOT_APPLICABLE',
      videoSecureToken: hasHampers ? videoSecureToken : null,
      videoStatus: hasHampers ? initialVideoStatus : 'NOT_REQUIRED',
    };

    const effectivePaymentProvider =
      (paymentProvider as PaymentProvider) && (paymentProvider as string).toUpperCase() !== 'DEMO'
        ? (paymentProvider as PaymentProvider)
        : PaymentProvider.RAZORPAY;

    // 3. Create Order in database (Strictly conforming to Prisma Schema)
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        guestEmail: userId ? (req.user?.email || cleanCustomerEmail) : cleanCustomerEmail,
        guestName: userId ? req.user?.name : buyerData.name,
        guestPhone: cleanBuyerPhone,
        country: (buyerCountry || country) as CountryCode,
        currency: (buyerCurrency || currency) as CurrencyCode,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        shippingFee: calculation.shippingFee,
        tax: calculation.tax,
        total: calculation.total,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        paymentProvider: effectivePaymentProvider,
        shippingAddress: combinedShippingSnapshot,
        billingAddress: billingAddress || combinedShippingSnapshot,
        couponCode: calculation.couponApplied?.code || null,
        notes: notes || (hasHampers ? personalizationNote : null) || null,
        items: {
          create: calculation.items.map((item: any) => {
            const isHamper =
              item.itemType === 'HAMPER' ||
              item.itemType === 'CUSTOM_HAMPER' ||
              Boolean(item.hamperId) ||
              item.productType === 'hamper' ||
              item.snapshot?.productType === 'hamper';

            const itemProdType = isHamper ? 'hamper' : 'normal';

            let itemPersonalization: any = null;
            if (isHamper) {
              const existingPers = item.personalization || item.snapshot?.personalization || {};
              const existingPhotos = existingPers.photos || existingPers.attachedPhotos || [];
              const itemPhotos = existingPhotos.length > 0 ? existingPhotos : combinedPhotos;
              const itemMsg = existingPers.customMessage || existingPers.message || (personalizationNote?.trim() || null);
              itemPersonalization = {
                ...existingPers,
                photos: itemPhotos,
                customMessage: itemMsg,
                whatsappMedia: item.whatsappMedia || (effectiveWhatsappMedia.length > 0 ? effectiveWhatsappMedia : undefined),
              };
            }

            return {
              itemType: item.itemType,
              productId: item.productId || null,
              hamperId: item.hamperId || null,
              name: item.name,
              sku: item.sku || null,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
              snapshot: {
                ...(item.snapshot || {}),
                productType: itemProdType,
                personalization: itemPersonalization,
              },
            };
          }),
        },
        timeline: {
          create: {
            status: OrderStatus.PENDING,
            title: 'Order Placed',
            description: `Order created for recipient ${recipientData.name} in ${recipientData.city}, India.`,
          },
        },
      },
      include: {
        items: true,
        timeline: true,
      },
    });

    // Persist HamperPersonalizationPhoto records for order items
    if (order.items && order.items.length > 0) {
      for (const orderItem of order.items) {
        const snapshot: any = orderItem.snapshot || {};
        if (snapshot.productType === 'normal') continue;
        const pers = snapshot.personalization || {};
        const photoUrls: string[] = pers.photos || pers.attachedPhotos || snapshot.attachedPhotos || [];
        if (Array.isArray(photoUrls) && photoUrls.length > 0) {
          try {
            await prisma.hamperPersonalizationPhoto.createMany({
              data: photoUrls.map((url, pIdx) => ({
                orderItemId: orderItem.id,
                hamperId: orderItem.hamperId || undefined,
                url,
                sortOrder: pIdx,
              })),
            });
          } catch (pErr) {
            console.warn('[ORDER_PHOTOS_PERSIST_WARN]', pErr);
          }
        }
      }
    }

    // Update coupon usage if applied
    if (calculation.couponApplied?.code) {
      try {
        const coupon = await prisma.coupon.findUnique({
          where: { code: calculation.couponApplied.code },
        });
        if (coupon) {
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } },
          });
          await prisma.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId: userId || null,
              orderId: order.id,
            },
          });
        }
      } catch (cErr) {
        console.warn('[ORDER_COUPON_WARN]', cErr);
      }
    }

    // Automatically send order details to Business WhatsApp
    try {
      const waPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyer: buyerData,
        recipient: recipientData,
        items: calculation.items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
        subtotal: calculation.subtotal,
        shippingFee: calculation.shippingFee,
        total: calculation.total,
        currency: order.currency,
        notes: notes || personalizationNote || undefined,
        media: Array.isArray(whatsappMedia) ? whatsappMedia : [],
      };

      const waResult = await whatsappService.sendOrderToBusiness(waPayload);
      if (waResult.success) {
        await prisma.orderTimeline.create({
          data: {
            orderId: order.id,
            status: order.orderStatus,
            title: 'WhatsApp Notification Sent',
            description: `Order #${order.orderNumber} automatically sent to Business WhatsApp. Message ID: ${waResult.messageId || 'N/A'}`,
          },
        });
      }
    } catch (waErr) {
      console.warn('[ORDER_WHATSAPP_AUTO_SEND_WARN]', waErr);
    }

    const enriched = enrichOrderForResponse(order);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: enriched,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Unable to create order. Please review your cart and try again.');
  }
}

export async function getUserOrders(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: true,
      },
    });

    const enrichedOrders = orders.map(enrichOrderForResponse);
    return res.json({ success: true, data: enrichedOrders });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch orders.');
  }
}

export async function getOrderById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: {
          include: {
            product: true,
            hamper: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            personalizationPhotos: true,
          },
        },
        timeline: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.userId) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required to view this order.' });
      }
      if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else {
      // Guest order protection: require admin OR verification of matching guest email
      const verifyEmail = (req.query.email as string || '').toLowerCase().trim();
      const userEmail = (req.user?.email || '').toLowerCase().trim();
      const guestEmail = (order.guestEmail || '').toLowerCase().trim();
      const isAuthorized =
        req.user?.role === 'ADMIN' ||
        (userEmail && userEmail === guestEmail) ||
        (verifyEmail && verifyEmail === guestEmail);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Please provide the customer email associated with this order to view full order details.',
        });
      }
    }

    return res.json({ success: true, data: enrichOrderForResponse(order) });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch order.');
  }
}

export async function trackOrder(req: Request, res: Response) {
  try {
    const { orderNumber, emailOrPhone } = req.body;

    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    if (!emailOrPhone || !emailOrPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer email or phone number is required to verify order tracking access.',
      });
    }

    const cleanInput = emailOrPhone.trim();
    const whereClause: any = {
      orderNumber: orderNumber.trim(),
      OR: [
        { guestEmail: { equals: cleanInput, mode: 'insensitive' } },
        { guestPhone: { contains: cleanInput } },
        { user: { email: { equals: cleanInput, mode: 'insensitive' } } },
      ],
    };

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        items: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No matching order found for this order number and contact information.',
      });
    }

    const isManualShipment =
      order.shippingMethod === 'MANUAL' ||
      order.shipment?.shippingMethod === 'MANUAL' ||
      order.shipment?.provider === 'MANUAL';

    let nimbusTracking = null;
    if (!isManualShipment && (order.trackingNumber || order.shipment?.awbNumber)) {
      const awb = order.shipment?.awbNumber || order.trackingNumber;
      try {
        nimbusTracking = await nimbusPostService.trackShipment(awb!);
      } catch (err: any) {
        console.warn('[trackOrder] NimbusPost tracking note:', err.message);
      }
    }

    return res.json({
      success: true,
      data: {
        ...enrichOrderForResponse(order),
        isManualShipment,
        manualShipment: isManualShipment
          ? {
              courierName: order.shipment?.courierName || 'Direct Courier Partner',
              trackingNumber: order.shipment?.trackingNumber || order.trackingNumber,
              trackingUrl: order.shipment?.trackingUrl,
              estimatedDelivery: order.shipment?.estimatedDelivery,
              shippingNotes: order.shipment?.shippingNotes,
              dispatchedAt: order.shipment?.dispatchedAt,
            }
          : null,
        nimbusTracking,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to track order.');
  }
}

/**
 * Live Shipment Tracking Endpoint
 */
export async function getOrderTracking(req: Request, res: Response) {
  try {
    const orderId = req.params.id || req.params.orderId;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }, { trackingNumber: orderId }],
      },
      include: {
        items: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isManualShipment =
      order.shippingMethod === 'MANUAL' ||
      order.shipment?.shippingMethod === 'MANUAL' ||
      order.shipment?.provider === 'MANUAL';

    let nimbusTracking = null;
    if (!isManualShipment && (order.trackingNumber || order.shipment?.awbNumber)) {
      const awb = order.shipment?.awbNumber || order.trackingNumber;
      try {
        nimbusTracking = await nimbusPostService.trackShipment(awb!);
      } catch (err: any) {
        console.warn('[getOrderTracking] NimbusPost tracking note:', err.message);
      }
    }

    // Strip sensitive buyer/guest details if not authorized
    const verifyEmail = ((req.query.email as string) || '').toLowerCase().trim();
    const userEmail = (((req as any).user?.email as string) || '').toLowerCase().trim();
    const guestEmail = (order.guestEmail || '').toLowerCase().trim();
    const isAuthorized =
      (req as any).user?.role === 'ADMIN' ||
      ((req as any).user?.id && order.userId === (req as any).user?.id) ||
      (userEmail && userEmail === guestEmail) ||
      (verifyEmail && verifyEmail === guestEmail);

    const o: any = order;
    const safeOrder = isAuthorized
      ? order
      : {
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.orderStatus || o.status,
          currency: o.currency,
          createdAt: o.createdAt,
          shippingMethod: o.shippingMethod,
          trackingNumber: o.shipment?.trackingNumber || o.trackingNumber,
          courierName: o.shipment?.courierName || o.courierName,
          estimatedDelivery: o.shipment?.estimatedDelivery || o.estimatedDelivery,
          dispatchedAt: o.shipment?.dispatchedAt || o.dispatchedAt,
        };

    return res.json({
      success: true,
      data: {
        order: safeOrder,
        shipment: isAuthorized
          ? order.shipment
          : order.shipment
          ? {
              courierName: order.shipment.courierName,
              trackingNumber: order.shipment.trackingNumber,
              trackingUrl: order.shipment.trackingUrl,
              dispatchedAt: order.shipment.dispatchedAt,
              estimatedDelivery: order.shipment.estimatedDelivery,
              shipmentStatus: order.shipment.shipmentStatus,
              syncStatus: order.shipment.syncStatus,
            }
          : null,
        isManualShipment,
        tracking: nimbusTracking,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve tracking information.');
  }
}

export async function getSpecialMessageByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const rawOrders = await prisma.order.findMany({
      take: 200,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const matched = rawOrders.find((o: any) => {
      const shipping = (o.shippingAddress as any) || {};
      return shipping.videoSecureToken === token || o.id === token;
    });

    if (!matched) {
      return res.status(404).json({
        success: false,
        message: 'Special message not found or link has expired.',
      });
    }

    const enriched = enrichOrderForResponse(matched);
    const hamperItem = matched.items?.find((i: any) => i.itemType === 'HAMPER' || i.itemType === 'CUSTOM_HAMPER');

    return res.json({
      success: true,
      data: {
        token: enriched.videoSecureToken,
        orderNumber: enriched.orderNumber,
        buyerName: enriched.buyer?.name || 'Your Family',
        recipientName: enriched.recipient?.name || 'Beloved Family',
        hamperName: hamperItem?.name || 'Nest Care Gift Hamper',
        message: enriched.personalizationNote || 'With love and warmest wishes from your family across the miles.',
        photos: enriched.uploadedPhotos || [],
        videoUrl: enriched.videoUrl || null,
        videoStatus: enriched.videoStatus || 'VIDEO_READY',
        createdAt: enriched.createdAt,
      },
    });
  } catch (error: any) {

    return handleControllerError(res, error, 'Failed to load special message.');
  }
}

export async function getAdminOrders(req: Request, res: Response) {
  try {
    const { status, paymentStatus, videoStatus, country, search, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `admin:orders:${status || ''}:${paymentStatus || ''}:${videoStatus || ''}:${country || ''}:${search || ''}:${pageNum}:${limitNum}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where: any = {};
    if (status) where.orderStatus = status as OrderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus as PaymentStatus;
    if (videoStatus) where.videoStatus = videoStatus as any;
    if (country) where.deliveryCountry = country as CountryCode;

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          items: {
            include: {
              personalizationPhotos: true,
            },
          },
          timeline: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
          payments: {
            take: 2,
            orderBy: { createdAt: 'desc' },
          },
          shipment: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    const result = {
      orders: orders.map(enrichOrderForResponse),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    cacheService.set(cacheKey, result, 30); // 30 second cache for fast tab navigation

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch admin orders.');
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, videoStatus, videoUrl, trackingNumber, note } = req.body;

    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const updateData: any = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (videoStatus) updateData.videoStatus = videoStatus;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true, timeline: true, shipment: true, payments: true },
    });

    // Add timeline record
    if (orderStatus && orderStatus !== existingOrder.orderStatus) {
      await prisma.orderTimeline.create({
        data: {
          orderId: id,
          status: orderStatus,
          title: `Status changed to ${orderStatus}`,
          description: note || `Order status updated to ${orderStatus}.`,
        },
      });

      if (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED') {
        await inventoryService.restoreOrderInventory(id);
      }
    }

    if (paymentStatus === 'PAID' && existingOrder.paymentStatus !== 'PAID') {
      await inventoryService.deductOrderInventory(id);
    }

    return res.json({ success: true, message: 'Order updated.', data: enrichOrderForResponse(updatedOrder) });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update order status.');
  }
}

export async function updateOrderVideo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { videoUrl, videoStatus = 'VIDEO_READY' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: 'Video URL is required.' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentShipping = (order.shippingAddress as any) || {};
    const updated = await prisma.order.update({
      where: { id },
      data: {
        shippingAddress: {
          ...currentShipping,
          videoUrl: videoUrl.trim(),
          videoStatus,
        },
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: order.orderStatus,
        title: 'Personalised Family Video Ready',
        description: 'Private family video link linked and QR code ready for card printout.',
      },
    });

    return res.json({
      success: true,
      message: 'Video updated successfully.',
      data: enrichOrderForResponse(updated),
    });
  } catch (error: any) {

    return handleControllerError(res, error, 'Failed to update order video.');
  }
}

export async function generateOrderQRCode(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const enriched = enrichOrderForResponse(order);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const targetUrl = `${appUrl}/special-message/${enriched.videoSecureToken || order.id}`;

    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#237A3B',
        light: '#FFFFFF',
      },
    });

    return res.json({
      success: true,
      data: {
        token: enriched.videoSecureToken || order.id,
        targetUrl,
        qrDataUrl,
      },
    });
  } catch (error: any) {

    return handleControllerError(res, error, 'Failed to generate order QR code.');
  }
}

/**
 * Admin Safe Address & Customer Email Correction Mechanism (Requirement 4)
 * Allows updating shipping address, recipient contact, and email for failed/pending orders.
 */
export async function updateOrderAddress(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { email, name, phone, addressLine1, addressLine2, city, state, postalCode } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { shipment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentShipping: any = order.shippingAddress || {};
    const currentRecipient: any = currentShipping.recipient || currentShipping || {};
    const currentBuyer: any = currentShipping.buyer || {};

    let cleanEmail: string | undefined = undefined;
    if (email !== undefined && email !== null) {
      const emailResult = sanitizeAndValidateEmail(email);
      if (!emailResult.isValid) {
        return res.status(400).json({ success: false, message: emailResult.error });
      }
      cleanEmail = emailResult.cleanEmail;
    }

    const updatedRecipient = {
      ...currentRecipient,
      name: name !== undefined ? name.trim() : currentRecipient.name,
      phone: phone !== undefined ? phone.trim() : currentRecipient.phone,
      email: cleanEmail || currentRecipient.email || cleanEmail,
      addressLine1: addressLine1 !== undefined ? addressLine1.trim() : currentRecipient.addressLine1,
      addressLine2: addressLine2 !== undefined ? addressLine2.trim() : currentRecipient.addressLine2,
      city: city !== undefined ? city.trim() : currentRecipient.city,
      state: state !== undefined ? state.trim() : currentRecipient.state,
      postalCode: postalCode !== undefined ? postalCode.trim() : currentRecipient.postalCode,
    };

    const updatedBuyer = {
      ...currentBuyer,
      email: cleanEmail || currentBuyer.email,
    };

    const updatedShippingSnapshot = {
      ...currentShipping,
      ...updatedRecipient,
      email: cleanEmail || currentShipping.email || updatedRecipient.email,
      buyer: updatedBuyer,
      recipient: updatedRecipient,
    };

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        guestEmail: cleanEmail || order.guestEmail,
        shippingAddress: updatedShippingSnapshot,
        billingAddress: updatedShippingSnapshot,
      },
      include: {
        shipment: true,
        timeline: true,
        items: true,
      },
    });

    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: order.orderStatus,
        title: 'Shipping Address & Email Updated',
        description: cleanEmail
          ? `Shipping details and customer email updated by administrator to ${cleanEmail}.`
          : 'Shipping address details updated by administrator.',
      },
    });

    return res.json({
      success: true,
      message: 'Order address and customer email updated successfully.',
      data: enrichOrderForResponse(updatedOrder),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update order address.');
  }
}

/**
 * Admin Packing Checklist Update Handler
 * Allows packers to independently check/uncheck packing items and persist progress
 */
export async function updateOrderPackingChecklist(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { packedItems, resetAll } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentChecklist: any = (existingOrder as any).packingChecklist || {};
    const newPackedItems = resetAll ? {} : { ...(currentChecklist.packedItems || {}), ...(packedItems || {}) };
    const packedCount = Object.values(newPackedItems).filter(Boolean).length;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        packingChecklist: {
          packedItems: newPackedItems,
          packedCount,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user?.name || 'Packing Team',
        },
      },
      include: {
        items: {
          include: {
            product: true,
            hamper: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            personalizationPhotos: true,
          },
        },
        timeline: true,
        payments: true,
        shipment: true,
      },
    });

    return res.json({
      success: true,
      message: 'Packing checklist updated successfully.',
      data: enrichOrderForResponse(updated),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update packing checklist.');
  }
}


