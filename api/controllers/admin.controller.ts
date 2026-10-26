import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { handleControllerError } from '../utils/dbError.js';
import { cacheService } from '../services/cache.service.js';

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
