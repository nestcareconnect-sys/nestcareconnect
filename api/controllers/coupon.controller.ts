import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode, DiscountType } from '@prisma/client';

export async function validateCoupon(req: Request, res: Response) {
  try {
    const { code, country = 'IN', subtotal = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
    }

    if (coupon.applicableCountries && !coupon.applicableCountries.includes(country as CountryCode)) {
      return res.status(400).json({ success: false, message: `Coupon is not valid for ${country}.` });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired.' });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached.' });
    }

    return res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValueINR: coupon.minOrderValueINR,
        maxDiscountINR: coupon.maxDiscountINR,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAdminCoupons(req: Request, res: Response) {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } },
      },
    });
    return res.json({ success: true, data: coupons });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createCoupon(req: Request, res: Response) {
  try {
    const { code, discountType, discountValue, minOrderValueINR, maxDiscountINR, expiryDate, usageLimit, perUserLimit, applicableCountries, active } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ success: false, message: 'Code and discount value are required.' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType: discountType as DiscountType,
        discountValue: parseFloat(discountValue),
        minOrderValueINR: minOrderValueINR ? parseFloat(minOrderValueINR) : 0,
        maxDiscountINR: maxDiscountINR ? parseFloat(maxDiscountINR) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
        applicableCountries: applicableCountries || [CountryCode.IN, CountryCode.AE, CountryCode.US],
        active: active !== undefined ? active : true,
      },
    });

    return res.status(201).json({ success: true, message: 'Coupon created successfully.', data: coupon });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, minOrderValueINR, maxDiscountINR, expiryDate, usageLimit, perUserLimit, applicableCountries, active } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        discountType: discountType as DiscountType,
        discountValue: discountValue ? parseFloat(discountValue) : undefined,
        minOrderValueINR: minOrderValueINR !== undefined ? parseFloat(minOrderValueINR) : undefined,
        maxDiscountINR: maxDiscountINR !== undefined ? (maxDiscountINR ? parseFloat(maxDiscountINR) : null) : undefined,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit, 10) : null) : undefined,
        perUserLimit: perUserLimit !== undefined ? parseInt(perUserLimit, 10) : undefined,
        applicableCountries,
        active,
      },
    });

    return res.json({ success: true, message: 'Coupon updated.', data: coupon });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    return res.json({ success: true, message: 'Coupon deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
