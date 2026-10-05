import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { pricingService } from '../services/pricing.service.js';
import { inventoryService } from '../services/inventory.service.js';
import { nimbusPostService } from '../services/shipping/nimbuspost.service.js';
import { CountryCode, CurrencyCode, OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';

/**
 * Helper to enrich order objects with buyer/recipient fields for UI consumption
 */
function enrichOrderForResponse(order: any) {
  if (!order) return order;
  const shipping = order.shippingAddress || {};
  return {
    ...order,
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
    videoSecureToken: order.videoSecureToken || shipping.videoSecureToken,
    videoStatus: order.videoStatus || shipping.videoStatus || 'NOT_REQUIRED',
    personalizationNote: order.personalizationNote || shipping.personalizationNote,
    uploadedPhotos: order.uploadedPhotos || shipping.uploadedPhotos || [],
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
      items,
    } = req.body;

    const deliveryAddr = recipient || shippingAddress;

    if (!deliveryAddr || !deliveryAddr.name || !deliveryAddr.addressLine1 || !deliveryAddr.city) {
      return res.status(400).json({ success: false, message: 'Valid recipient delivery address is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to create an order.' });
    }

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

    const buyerData = buyer || {
      name: req.user?.name || deliveryAddr.name,
      email: req.user?.email || deliveryAddr.email || 'customer@nestcareconnect.com',
      phone: (req.user as any)?.phone || deliveryAddr.phone,
      country: buyerCountry || country,
    };

    const recipientData = recipient || {
      name: deliveryAddr.name,
      phone: deliveryAddr.phone,
      relationship: deliveryAddr.relationship || 'Loved One / Parents',
      addressLine1: deliveryAddr.addressLine1,
      addressLine2: deliveryAddr.addressLine2,
      city: deliveryAddr.city,
      state: deliveryAddr.state,
      postalCode: deliveryAddr.postalCode,
      country: deliveryCountry || country,
    };

    const combinedShippingSnapshot = {
      ...recipientData,
      buyer: buyerData,
      recipient: recipientData,
      buyerCountry: (buyerCountry || country) as CountryCode,
      buyerCurrency: (buyerCurrency || currency) as CurrencyCode,
      deliveryCountry: (deliveryCountry || country) as CountryCode,
      deliveryCurrency: (deliveryCurrency || currency) as CurrencyCode,
      personalizationNote: personalizationNote || null,
      uploadedPhotos: Array.isArray(uploadedPhotos) ? uploadedPhotos : [],
      videoSecureToken,
      videoStatus: initialVideoStatus,
    };

    const isDemo = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'demo';
    const effectivePaymentProvider = isDemo
      ? PaymentProvider.DEMO
      : ((paymentProvider as PaymentProvider) || PaymentProvider.RAZORPAY);

    // 3. Create Order in database (Strictly conforming to Prisma Schema)
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        guestEmail: userId ? req.user?.email : buyerData.email,
        guestName: userId ? req.user?.name : buyerData.name,
        guestPhone: buyerData.phone || recipientData.phone,
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
        notes: notes || personalizationNote || null,
        items: {
          create: calculation.items.map((item: any) => ({
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
              personalization: item.personalization || null,
            },
          })),
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

    const enriched = enrichOrderForResponse(order);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: enriched,
    });
  } catch (error: any) {
    console.error('[ORDER_CREATE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create order. Please review your cart and try again.',
    });
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
    console.error('[GET_USER_ORDERS_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
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
        items: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (req.user && req.user.role !== 'ADMIN' && order.userId && order.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, data: enrichOrderForResponse(order) });
  } catch (error: any) {
    console.error('[GET_ORDER_BY_ID_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function trackOrder(req: Request, res: Response) {
  try {
    const { orderNumber, emailOrPhone } = req.body;

    if (!orderNumber || !emailOrPhone) {
      return res.status(400).json({ success: false, message: 'Order number and email or phone are required.' });
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim(),
        OR: [
          { guestEmail: { equals: emailOrPhone.trim(), mode: 'insensitive' } },
          { guestPhone: { contains: emailOrPhone.trim() } },
          { user: { email: { equals: emailOrPhone.trim(), mode: 'insensitive' } } },
        ],
      },
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
        message: 'No matching order found. Please verify your order number and contact details.',
      });
    }

    let nimbusTracking = null;
    if (order.trackingNumber || order.shipment?.awbNumber) {
      const awb = order.shipment?.awbNumber || order.trackingNumber;
      nimbusTracking = await nimbusPostService.trackShipment(awb!);
    }

    return res.json({
      success: true,
      data: {
        ...enrichOrderForResponse(order),
        nimbusTracking,
      },
    });
  } catch (error: any) {
    console.error('[TRACK_ORDER_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
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

    let nimbusTracking = null;
    if (order.trackingNumber || order.shipment?.awbNumber) {
      const awb = order.shipment?.awbNumber || order.trackingNumber;
      nimbusTracking = await nimbusPostService.trackShipment(awb!);
    }

    return res.json({
      success: true,
      data: {
        order,
        shipment: order.shipment,
        tracking: nimbusTracking,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSpecialMessageByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { videoSecureToken: token },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Special message not found or link has expired.',
      });
    }

    const hamperItem = order.items?.find((i: any) => i.itemType === 'HAMPER' || i.itemType === 'CUSTOM_HAMPER');

    return res.json({
      success: true,
      data: {
        token: order.videoSecureToken,
        orderNumber: order.orderNumber,
        buyerName: order.buyer?.name || order.guestName || 'Your Family',
        recipientName: order.recipient?.name || 'Beloved Family',
        hamperName: hamperItem?.name || 'Nest Care Gift Hamper',
        message: order.personalizationNote || 'With love and warmest wishes from your family across the miles.',
        photos: order.uploadedPhotos || [],
        videoUrl: order.videoUrl || null,
        videoStatus: order.videoStatus || 'VIDEO_READY',
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAdminOrders(req: Request, res: Response) {
  try {
    const { status, paymentStatus, videoStatus, country, search, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

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
          items: true,
          timeline: true,
          payments: true,
          shipment: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        orders: orders.map(enrichOrderForResponse),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('[GET_ADMIN_ORDERS_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
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
      include: { items: true, timeline: true },
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

    return res.json({ success: true, message: 'Order updated.', data: updatedOrder });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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

    const updated = await prisma.order.update({
      where: { id },
      data: {
        videoUrl: videoUrl.trim(),
        videoStatus,
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
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function generateOrderQRCode(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const targetUrl = `${appUrl}/special-message/${order.videoSecureToken}`;

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
        token: order.videoSecureToken,
        targetUrl,
        qrDataUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
