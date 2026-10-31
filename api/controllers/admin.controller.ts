import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { handleControllerError } from '../utils/dbError.js';
import { cacheService } from '../services/cache.service.js';
import { emailService } from '../services/email.service.js';
import { enrichOrderForResponse } from './order.controller.js';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const cacheKey = 'admin:dashboard:stats';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      totalProducts,
      totalCategories,
      totalHampers,
      totalCustomers,
      recentOrders,
      lowStockProducts,
      paidOrdersList,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: 'PENDING' } }),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count({ where: { status: 'ACTIVE' } }),
      prisma.hamper.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          orderStatus: true,
          paymentStatus: true,
          guestName: true,
          guestEmail: true,
          shippingAddress: true,
          createdAt: true,
          items: {
            take: 3,
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        where: {
          stock: { lte: 10 },
          status: 'ACTIVE',
        },
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          basePriceINR: true,
          images: true,
        },
      }),
      prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        select: { total: true, currency: true },
      }),
    ]);

    const totalRevenueINR = paidOrdersList.reduce((acc: number, o: any) => {
      // rough INR normalization for dashboard metric
      const multiplier = o.currency === 'AED' ? 22.7 : o.currency === 'USD' ? 83.5 : 1;
      return acc + (o.total || 0) * multiplier;
    }, 0);

    const dashboardData = {
      metrics: {
        totalOrders,
        pendingOrders,
        paidOrders,
        totalRevenueINR: Math.round(totalRevenueINR),
        totalProducts,
        totalCategories,
        totalHampers,
        totalCustomers,
      },
      recentOrders,
      lowStockProducts,
    };

    // Cache dashboard stats for 45 seconds for fast subsequent tab switches
    cacheService.set(cacheKey, dashboardData, 45);

    return res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch dashboard stats.');
  }
}

export async function getCustomers(req: Request, res: Response) {
  try {
    const { search, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `admin:customers:${search || ''}:${pageNum}:${limitNum}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where: any = { role: 'CUSTOMER' };
    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const result = {
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    cacheService.set(cacheKey, result, 60);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch customers.');
  }
}

/**
 * Fetch all email notifications for an order (audit logs, provider IDs, statuses)
 */
export async function getOrderEmailNotifications(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const notifications = await prisma.emailNotification.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: notifications });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch order email notifications.');
  }
}

/**
 * Retry sending a failed or pending email notification (Admin only)
 */
export async function retryEmailNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await emailService.retryFailedEmail(id);
    return res.json({
      success: result.success,
      message: result.success ? 'Email re-sent successfully via MSG91.' : `Retry failed: ${result.error}`,
      data: result,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retry email notification.');
  }
}

/**
 * Get MSG91 email integration status and statistics
 */
export async function getEmailStatus(_req: Request, res: Response) {
  try {
    const config = emailService.getPublicConfig();
    const [totalNotifications, failedCount, acceptedCount, deliveredCount] = await Promise.all([
      prisma.emailNotification.count(),
      prisma.emailNotification.count({ where: { status: 'FAILED' } }),
      prisma.emailNotification.count({ where: { status: 'ACCEPTED' } }),
      prisma.emailNotification.count({ where: { status: 'DELIVERED' } }),
    ]);

    return res.json({
      success: true,
      data: {
        ...config,
        stats: {
          total: totalNotifications,
          failed: failedCount,
          accepted: acceptedCount,
          delivered: deliveredCount,
        },
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch email service status.');
  }
}

/**
 * Send shipment tracking email with tracking number and courier details directly to the customer (Admin one-click trigger)
 */
export async function sendOrderTrackingEmail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      trackingNumber,
      courierName = 'India Post (Speed Post)',
      trackingUrl,
      estimatedDelivery,
      updateStatusToShipped = true,
      note,
    } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, timeline: true, shipment: true, payments: true, user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const finalTracking = (trackingNumber || order.trackingNumber || order.shipment?.awbNumber || '').trim();
    if (!finalTracking) {
      return res.status(400).json({
        success: false,
        message: 'Tracking ID / AWB number is required to send tracking email.',
      });
    }

    const finalCourier = (courierName || order.shipment?.courierName || 'India Post (Speed Post)').trim();
    const finalTrackingUrl = (trackingUrl || order.shipment?.trackingUrl || '').trim();

    // Check customer email
    const shipping = (order.shippingAddress as any) || {};
    const buyer = shipping.buyer || {};
    const recipientEmail = buyer.email || order.guestEmail || shipping.email || order.user?.email;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email address not found on this order.',
      });
    }

    // Update order with tracking details and optionally mark SHIPPED
    const orderUpdateData: any = {
      trackingNumber: finalTracking,
    };
    if (updateStatusToShipped && order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED') {
      orderUpdateData.orderStatus = 'SHIPPED';
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: orderUpdateData,
      include: { items: true, timeline: true, shipment: true, payments: true, user: true },
    });

    // Upsert shipment record
    await prisma.shipment.upsert({
      where: { orderId: id },
      update: {
        courierName: finalCourier,
        trackingNumber: finalTracking,
        awbNumber: finalTracking,
        trackingUrl: finalTrackingUrl || undefined,
        shipmentStatus: updatedOrder.orderStatus === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED',
        dispatchedAt: order.shipment?.dispatchedAt || new Date(),
        estimatedDelivery: estimatedDelivery || order.shipment?.estimatedDelivery,
      },
      create: {
        orderId: id,
        provider: 'MANUAL',
        shippingMethod: 'MANUAL',
        courierName: finalCourier,
        trackingNumber: finalTracking,
        awbNumber: finalTracking,
        trackingUrl: finalTrackingUrl || undefined,
        shipmentStatus: updatedOrder.orderStatus === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED',
        dispatchedAt: new Date(),
        estimatedDelivery: estimatedDelivery,
      },
    });

    // Record in OrderTimeline
    await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status: updatedOrder.orderStatus,
        title: `Tracking Details Sent to Customer (${finalCourier})`,
        description: `Shipment tracking details sent to ${recipientEmail} with Tracking ID: ${finalTracking} via ${finalCourier}.${note ? ` Note: ${note}` : ''}`,
      },
    });

    // Send shipment tracking email with MSG91 template
    const emailResult = await emailService.sendShipmentTrackingEmail({
      order: updatedOrder,
      courierName: finalCourier,
      trackingNumber: finalTracking,
      trackingUrl: finalTrackingUrl || undefined,
      estimatedDelivery: estimatedDelivery || undefined,
      isUpdate: Boolean(order.trackingNumber && order.trackingNumber !== finalTracking),
    });

    return res.json({
      success: emailResult.success,
      message: emailResult.success
        ? `Tracking details successfully emailed to ${recipientEmail} (${emailResult.mode === 'MSG91_LIVE' ? 'Live MSG91 Delivery' : 'Simulated Sandbox Delivery'})!`
        : `Email delivery queued or failed: ${emailResult.error}`,
      data: {
        order: enrichOrderForResponse(updatedOrder),
        emailResult,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to send shipment tracking email.');
  }
}

