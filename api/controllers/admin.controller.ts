import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export async function getDashboardStats(req: Request, res: Response) {
  try {
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
        include: { items: true },
      }),
      prisma.product.findMany({
        where: {
          stock: { lte: 10 },
          status: 'ACTIVE',
        },
        take: 5,
      }),
    ]);

    // Calculate total revenue across paid orders
    const paidOrdersList = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { total: true, currency: true },
    });

    const totalRevenueINR = paidOrdersList.reduce((acc: number, o: any) => {
      // rough INR normalization for dashboard metric
      const multiplier = o.currency === 'AED' ? 22.7 : o.currency === 'USD' ? 83.5 : 1;
      return acc + o.total * multiplier;
    }, 0);

    return res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCustomers(req: Request, res: Response) {
  try {
    const { search, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

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

    return res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
