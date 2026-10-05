import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { pricingService } from '../services/pricing.service.js';
import { CountryCode, CurrencyCode } from '@prisma/client';

export async function getCustomHamperConfig(req: Request, res: Response) {
  try {
    let config = await prisma.customHamperConfig.findFirst({
      where: { active: true },
    });

    if (!config) {
      // create default config
      config = await prisma.customHamperConfig.create({
        data: {
          title: 'Build Your Own Healthcare Hamper',
          description: 'Choose certified health monitors, testing supplies, and nutritious snacks to create your personalized care package.',
          minItems: 2,
          maxItems: 12,
          minPriceINR: 500,
          allowedCountries: [CountryCode.IN, CountryCode.AE, CountryCode.US],
          active: true,
        },
      });
    }

    // Get eligible products categorized
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        stock: { gt: 0 },
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        countryPrices: true,
      },
      orderBy: [{ categoryId: 'asc' }, { basePriceINR: 'asc' }],
    });

    return res.json({
      success: true,
      data: {
        config,
        products,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function calculateCustomHamperQuote(req: Request, res: Response) {
  try {
    const { items, boxId, boxType, country = 'IN', currency = 'INR', title, occasion, message, personalization } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one product.' });
    }

    if (!boxId && !boxType) {
      return res.status(400).json({
        success: false,
        message: 'Please select a hamper box before continuing.',
      });
    }

    const calculation = await pricingService.calculateCustomHamper(
      { title, boxId: boxId || boxType, items, personalization },
      country as CountryCode,
      currency as CurrencyCode
    );

    return res.json({
      success: true,
      data: {
        title: title || 'Custom Healthcare Hamper',
        occasion,
        message,
        boxId: calculation.box.id,
        box: calculation.box,
        boxPrice: calculation.boxPrice,
        productsSubtotal: calculation.productsSubtotal,
        personalisationPrice: calculation.personalisationPrice,
        unitPrice: calculation.unitPrice,
        totalPrice: calculation.unitPrice,
        currency,
        country,
        breakdown: calculation.breakdown,
        totalItemsCount: calculation.totalItemQuantity,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function updateCustomHamperConfig(req: Request, res: Response) {
  try {
    const { title, description, minItems, maxItems, minPriceINR, maxPriceINR, allowedCategoryIds, allowedProductIds, allowedCountries, active } = req.body;

    let config = await prisma.customHamperConfig.findFirst();

    if (config) {
      config = await prisma.customHamperConfig.update({
        where: { id: config.id },
        data: {
          title,
          description,
          minItems: minItems !== undefined ? parseInt(minItems, 10) : undefined,
          maxItems: maxItems !== undefined ? parseInt(maxItems, 10) : undefined,
          minPriceINR: minPriceINR !== undefined ? parseFloat(minPriceINR) : undefined,
          maxPriceINR: maxPriceINR !== undefined ? (maxPriceINR ? parseFloat(maxPriceINR) : null) : undefined,
          allowedCategoryIds: allowedCategoryIds || undefined,
          allowedProductIds: allowedProductIds || undefined,
          allowedCountries: allowedCountries || undefined,
          active: active !== undefined ? active : undefined,
        },
      });
    } else {
      config = await prisma.customHamperConfig.create({
        data: {
          title: title || 'Build Your Custom Hamper',
          description,
          minItems: minItems || 2,
          maxItems: maxItems || 12,
          minPriceINR: minPriceINR || 500,
          maxPriceINR,
          allowedCountries: allowedCountries || [CountryCode.IN, CountryCode.AE, CountryCode.US],
          active: active !== undefined ? active : true,
        },
      });
    }

    return res.json({ success: true, message: 'Custom hamper settings saved.', data: config });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
