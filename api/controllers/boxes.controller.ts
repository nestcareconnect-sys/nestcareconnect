import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode, CurrencyCode, Status } from '@prisma/client';
import { pricingService } from '../services/pricing.service.js';
import { INITIAL_HAMPER_BOXES } from '../config/constants.js';

/**
 * Get all available hamper boxes for storefront or admin
 */
export async function getBoxes(req: Request, res: Response) {
  try {
    const { country = 'IN', currency = 'INR', includeInactive = 'false' } = req.query;

    const whereClause: any = {};
    if (includeInactive !== 'true') {
      whereClause.status = Status.ACTIVE;
    }

    let boxes = await prisma.hamperBox.findMany({
      where: whereClause,
      include: {
        countryPrices: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { basePriceINR: 'asc' }],
    });

    if (boxes.length === 0 && includeInactive !== 'true') {
      // Fallback to initial hamper boxes if database empty
      boxes = INITIAL_HAMPER_BOXES as any;
    }

    const rates = await pricingService.getExchangeRates();
    const curr = currency as CurrencyCode;
    const cntry = country as CountryCode;
    const rate = rates[curr] || 1;

    // Calculate country and currency-specific prices
    const enrichedBoxes = boxes.map((box: any) => {
      let calculatedPrice = box.basePriceINR;

      // 1. Check fixed country price override
      const cp = box.countryPrices?.find((p: any) => p.country === cntry);
      if (cp && cp.fixedPrice > 0) {
        calculatedPrice = cp.fixedPrice;
      } else {
        // 2. Exchange rate conversion
        calculatedPrice = curr === 'INR' ? box.basePriceINR : +(box.basePriceINR * rate).toFixed(2);
      }

      let calculatedCompareAtPrice = box.compareAtPriceINR ? (curr === 'INR' ? box.compareAtPriceINR : +(box.compareAtPriceINR * rate).toFixed(2)) : null;

      return {
        ...box,
        calculatedPrice,
        calculatedCompareAtPrice,
        currency: curr,
        isAvailableInCountry: !box.countryAvailability || box.countryAvailability.includes(cntry),
      };
    });

    return res.json({
      success: true,
      data: enrichedBoxes,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get single box by ID or Slug
 */
export async function getBoxById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { country = 'IN', currency = 'INR' } = req.query;

    const box = await prisma.hamperBox.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        countryPrices: true,
      },
    });

    if (!box) {
      return res.status(404).json({ success: false, message: 'Hamper box not found.' });
    }

    const rates = await pricingService.getExchangeRates();
    const curr = currency as CurrencyCode;
    const cntry = country as CountryCode;
    const rate = rates[curr] || 1;

    let calculatedPrice = box.basePriceINR;
    const cp = box.countryPrices?.find((p: any) => p.country === cntry);
    if (cp && cp.fixedPrice > 0) {
      calculatedPrice = cp.fixedPrice;
    } else {
      calculatedPrice = curr === 'INR' ? box.basePriceINR : +(box.basePriceINR * rate).toFixed(2);
    }

    return res.json({
      success: true,
      data: {
        ...box,
        calculatedPrice,
        currency: curr,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin: Create a new hamper box
 */
export async function createBox(req: Request, res: Response) {
  try {
    const {
      name,
      slug,
      description,
      size,
      color,
      material,
      dimensions,
      length,
      width,
      height,
      capacity,
      maxWeight,
      basePriceINR,
      compareAtPriceINR,
      stock,
      status = 'ACTIVE',
      sortOrder = 0,
      isRecommended = false,
      images = [],
      countryAvailability = ['IN', 'AE', 'US'],
      countryPrices = [],
    } = req.body;

    if (!name || !basePriceINR || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name, Base Price (INR), and Item Capacity are required.',
      });
    }

    const finalSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9]/g, '-') : name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const createdBox = await prisma.hamperBox.create({
      data: {
        name,
        slug: finalSlug,
        description: description || null,
        size: size || 'Medium',
        color: color || 'Green',
        material: material || 'Rigid Cardboard',
        dimensions: dimensions || null,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        capacity: parseInt(capacity, 10) || 10,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        basePriceINR: parseFloat(basePriceINR),
        compareAtPriceINR: compareAtPriceINR ? parseFloat(compareAtPriceINR) : null,
        stock: parseInt(stock || '50', 10),
        status: status as Status,
        sortOrder: parseInt(sortOrder || '0', 10),
        isRecommended: Boolean(isRecommended),
        images: Array.isArray(images) ? images.filter(Boolean) : [],
        countryAvailability: countryAvailability as CountryCode[],
        countryPrices: {
          create: Array.isArray(countryPrices)
            ? countryPrices
                .filter((cp: any) => cp.fixedPrice > 0)
                .map((cp: any) => ({
                  country: cp.country as CountryCode,
                  currency: cp.currency as CurrencyCode,
                  fixedPrice: parseFloat(cp.fixedPrice),
                }))
            : [],
        },
      },
      include: {
        countryPrices: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Hamper box created successfully.',
      data: createdBox,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin: Update an existing hamper box
 */
export async function updateBox(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      size,
      color,
      material,
      dimensions,
      length,
      width,
      height,
      capacity,
      maxWeight,
      basePriceINR,
      compareAtPriceINR,
      stock,
      status,
      sortOrder,
      isRecommended,
      images,
      countryAvailability,
      countryPrices,
    } = req.body;

    const existing = await prisma.hamperBox.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Hamper box not found.' });
    }

    const updated = await prisma.hamperBox.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        description: description !== undefined ? description : existing.description,
        size: size !== undefined ? size : existing.size,
        color: color !== undefined ? color : existing.color,
        material: material !== undefined ? material : existing.material,
        dimensions: dimensions !== undefined ? dimensions : existing.dimensions,
        length: length !== undefined ? (length ? parseFloat(length) : null) : existing.length,
        width: width !== undefined ? (width ? parseFloat(width) : null) : existing.width,
        height: height !== undefined ? (height ? parseFloat(height) : null) : existing.height,
        capacity: capacity !== undefined ? parseInt(capacity, 10) : existing.capacity,
        maxWeight: maxWeight !== undefined ? (maxWeight ? parseFloat(maxWeight) : null) : existing.maxWeight,
        basePriceINR: basePriceINR !== undefined ? parseFloat(basePriceINR) : existing.basePriceINR,
        compareAtPriceINR: compareAtPriceINR !== undefined ? (compareAtPriceINR ? parseFloat(compareAtPriceINR) : null) : existing.compareAtPriceINR,
        stock: stock !== undefined ? parseInt(stock, 10) : existing.stock,
        status: status !== undefined ? (status as Status) : existing.status,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : existing.sortOrder,
        isRecommended: isRecommended !== undefined ? Boolean(isRecommended) : existing.isRecommended,
        images: images !== undefined ? (Array.isArray(images) ? images.filter(Boolean) : []) : existing.images,
        countryAvailability: countryAvailability !== undefined ? (countryAvailability as CountryCode[]) : existing.countryAvailability,
      },
    });

    // Update country prices if provided
    if (Array.isArray(countryPrices)) {
      await prisma.hamperBoxCountryPrice.deleteMany({ where: { boxId: id } });
      for (const cp of countryPrices) {
        if (cp.fixedPrice > 0) {
          await prisma.hamperBoxCountryPrice.create({
            data: {
              boxId: id,
              country: cp.country as CountryCode,
              currency: cp.currency as CurrencyCode,
              fixedPrice: parseFloat(cp.fixedPrice),
            },
          });
        }
      }
    }

    const fullUpdated = await prisma.hamperBox.findUnique({
      where: { id },
      include: { countryPrices: true },
    });

    return res.json({
      success: true,
      message: 'Hamper box updated successfully.',
      data: fullUpdated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin: Delete a hamper box
 */
export async function deleteBox(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.hamperBox.delete({ where: { id } });
    return res.json({ success: true, message: 'Hamper box deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
