import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode, CurrencyCode } from '@prisma/client';
import { handleControllerError } from '../utils/dbError.js';
import { cacheService } from '../services/cache.service.js';
import {
  calculateProductShippingDetails,
  normalizeWeightToKg,
  normalizeDimensionToCm,
  WeightUnit,
  DimensionUnit,
} from '../utils/shippingCalculation.js';

function handleDbError(res: Response, error: any, action = 'Query') {
  return handleControllerError(res, error, `Failed to execute ${action}.`);
}


export async function getProducts(req: Request, res: Response) {
  try {
    const cacheKey = `product:list:${JSON.stringify(req.query)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const {
      categorySlug,
      category,
      subcategory,
      categoryId,
      brand,
      featured,
      isAddOn,
      addOnCategory,
      isCustomHamperEligible,
      search,
      q,
      minPrice,
      maxPrice,
      inStock,
      availability,
      sortBy = 'newest',
      sort,
      cursor,
      page = '1',
      limit = '20',
      status = 'ACTIVE',
      occasion,
      recipient,
      tag,
      productType,
    } = req.query;

    const limitNum = Math.min(50, Math.max(1, parseInt((limit as string) || '20', 10)));
    const targetCategory = (categorySlug || category || subcategory) as string | undefined;
    const searchTerm = (search || q) as string | undefined;
    const sortParam = ((sort || sortBy) as string || 'newest').toLowerCase();

    const where: any = {};

    if (productType) {
      where.productType = productType as string;
    }

    if (status) {
      where.status = status as any;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (isAddOn !== undefined) {
      where.isAddOn = isAddOn === 'true';
    }

    if (addOnCategory) {
      where.addOnCategory = addOnCategory as string;
    }

    if (isCustomHamperEligible !== undefined) {
      where.isCustomHamperEligible = isCustomHamperEligible === 'true';
    }

    if (brand) {
      where.brand = { equals: brand as string, mode: 'insensitive' };
    }

    if (inStock === 'true' || availability === 'in_stock') {
      where.stock = { gt: 0 };
    }

    if (targetCategory) {
      const cat = await prisma.category.findUnique({ where: { slug: targetCategory } });
      if (cat) {
        // Collect category and all child category IDs
        const childCats = await prisma.category.findMany({ where: { parentCategoryId: cat.id } });
        const catIds = [cat.id, ...childCats.map((c: any) => c.id)];
        where.categoryId = { in: catIds };
      }
    } else if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (searchTerm) {
      const query = searchTerm.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    if (tag) {
      where.tags = { has: tag as string };
    }

    if (occasion) {
      where.tags = { has: occasion as string };
    }

    if (recipient) {
      where.tags = { has: recipient as string };
    }

    if (minPrice || maxPrice) {
      where.basePriceINR = {};
      if (minPrice) where.basePriceINR.gte = parseFloat(minPrice as string);
      if (maxPrice) where.basePriceINR.lte = parseFloat(maxPrice as string);
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sortParam) {
      case 'price_asc':
      case 'price-low':
      case 'price_low':
      case 'price-asc':
        orderBy = { basePriceINR: 'asc' };
        break;
      case 'price_desc':
      case 'price-high':
      case 'price_high':
      case 'price-desc':
        orderBy = { basePriceINR: 'desc' };
        break;
      case 'popular':
      case 'featured':
      case 'best-sellers':
        orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'name_asc':
      case 'a-z':
      case 'name-asc':
        orderBy = { name: 'asc' };
        break;
      case 'relevance':
        orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Determine pagination logic (Cursor-based or Offset-based)
    let skip = 0;
    let cursorObj: any = undefined;

    if (cursor) {
      const cursorStr = cursor as string;
      // Check if cursor is a product ID (UUID or cuid/string ID)
      if (cursorStr.length >= 10 && isNaN(Number(cursorStr))) {
        cursorObj = { id: cursorStr };
        skip = 1; // skip the cursor record itself
      } else {
        const pageIndex = Math.max(1, parseInt(cursorStr, 10));
        skip = (pageIndex - 1) * limitNum;
      }
    } else {
      const pageNum = Math.max(1, parseInt(page as string, 10));
      skip = (pageNum - 1) * limitNum;
    }

    // Fetch limitNum + 1 to check if hasMore
    const [productsWithExtra, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        cursor: cursorObj,
        skip,
        take: limitNum + 1,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          countryPrices: true,
          _count: {
            select: { reviews: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const hasMore = productsWithExtra.length > limitNum;
    const products = hasMore ? productsWithExtra.slice(0, limitNum) : productsWithExtra;
    const nextCursor = hasMore && products.length > 0 ? products[products.length - 1].id : null;

    const currentPage = cursor && !isNaN(Number(cursor)) ? parseInt(cursor as string, 10) : Math.max(1, parseInt(page as string, 10));

    const responseData = {
      products,
      nextCursor,
      hasMore,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore,
        nextCursor,
      },
    };

    cacheService.set(cacheKey, responseData, 300); // 5 min cache

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    return handleDbError(res, error, 'getProducts');
  }
}

export async function getProductBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const cacheKey = `product:slug:${slug}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        countryPrices: true,
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let relatedProducts: any[] = [];
    if (product.categoryId) {
      relatedProducts = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          status: 'ACTIVE',
        },
        take: 4,
        include: { countryPrices: true },
      });
    }

    const responseData = {
      product,
      relatedProducts,
    };

    cacheService.set(cacheKey, responseData, 600); // 10 min cache

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    return handleDbError(res, error, 'getProductBySlug');
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const {
      name,
      slug,
      sku,
      description,
      shortDescription,
      images,
      basePriceINR,
      compareAtPriceINR,
      stock,
      lowStockThreshold,
      categoryId,
      brand,
      unit,
      weight,
      weightUnit = 'kg',
      length,
      width,
      height,
      dimensionUnit = 'cm',
      dimensions,
      status,
      featured,
      isAddOn,
      addOnCategory,
      isCustomHamperEligible,
      tags,
      specifications,
      countryPrices,
      seoTitle,
      seoDescription,
      productType = 'normal',
    } = req.body;

    if (!name || !sku || basePriceINR === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, SKU, and base price (INR) are required.' });
    }

    // Shipping dimensions & weight validation
    const parsedWeight = weight !== undefined && weight !== null && weight !== '' ? parseFloat(weight) : null;
    const parsedLength = length !== undefined && length !== null && length !== '' ? parseFloat(length) : null;
    const parsedWidth = width !== undefined && width !== null && width !== '' ? parseFloat(width) : null;
    const parsedHeight = height !== undefined && height !== null && height !== '' ? parseFloat(height) : null;

    if (parsedWeight !== null && (isNaN(parsedWeight) || parsedWeight <= 0)) {
      return res.status(400).json({ success: false, message: 'Product weight must be a positive number greater than zero.' });
    }
    if (parsedLength !== null && (isNaN(parsedLength) || parsedLength <= 0)) {
      return res.status(400).json({ success: false, message: 'Product length must be a positive number greater than zero.' });
    }
    if (parsedWidth !== null && (isNaN(parsedWidth) || parsedWidth <= 0)) {
      return res.status(400).json({ success: false, message: 'Product width must be a positive number greater than zero.' });
    }
    if (parsedHeight !== null && (isNaN(parsedHeight) || parsedHeight <= 0)) {
      return res.status(400).json({ success: false, message: 'Product height must be a positive number greater than zero.' });
    }

    const wUnit: WeightUnit = weightUnit === 'g' ? 'g' : 'kg';
    const dUnit: DimensionUnit = dimensionUnit === 'in' ? 'in' : 'cm';

    let shippingData: any = {};
    if (parsedWeight !== null || (parsedLength !== null && parsedWidth !== null && parsedHeight !== null)) {
      const calc = calculateProductShippingDetails({
        weight: parsedWeight || 0,
        weightUnit: wUnit,
        length: parsedLength || 0,
        width: parsedWidth || 0,
        height: parsedHeight || 0,
        dimensionUnit: dUnit,
      });

      const formattedDimensions = calc.lengthCm > 0 && calc.widthCm > 0 && calc.heightCm > 0
        ? `${calc.lengthCm} x ${calc.widthCm} x ${calc.heightCm} cm`
        : dimensions?.trim() || null;

      shippingData = {
        weight: calc.weightKg > 0 ? calc.weightKg : null,
        weightUnit: wUnit,
        length: calc.lengthCm > 0 ? calc.lengthCm : null,
        width: calc.widthCm > 0 ? calc.widthCm : null,
        height: calc.heightCm > 0 ? calc.heightCm : null,
        dimensionUnit: dUnit,
        volumetricWeight: calc.volumetricWeightKg > 0 ? calc.volumetricWeightKg : null,
        chargeableWeight: calc.chargeableWeightKg > 0 ? calc.chargeableWeightKg : null,
        dimensions: formattedDimensions,
        packageLength: calc.lengthCm > 0 ? calc.lengthCm : null,
        packageWidth: calc.widthCm > 0 ? calc.widthCm : null,
        packageHeight: calc.heightCm > 0 ? calc.heightCm : null,
        packageWeight: calc.chargeableWeightKg > 0 ? calc.chargeableWeightKg : (calc.weightKg > 0 ? calc.weightKg : null),
        packageVolume: calc.lengthCm > 0 && calc.widthCm > 0 && calc.heightCm > 0
          ? Math.round(calc.lengthCm * calc.widthCm * calc.heightCm * 100) / 100
          : null,
      };
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    const existingSku = await prisma.product.findUnique({ where: { sku: sku.trim() } });
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists.' });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: generatedSlug,
        sku: sku.trim(),
        description: description || '',
        shortDescription,
        images: images || [],
        basePriceINR: parseFloat(basePriceINR),
        compareAtPriceINR: compareAtPriceINR ? parseFloat(compareAtPriceINR) : null,
        stock: parseInt(stock || '0', 10),
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 5,
        categoryId: categoryId || null,
        brand: brand?.trim() || null,
        unit: unit?.trim() || null,
        ...shippingData,
        status: status || 'ACTIVE',
        featured: featured || false,
        isAddOn: isAddOn || false,
        addOnCategory: addOnCategory || null,
        isCustomHamperEligible: isCustomHamperEligible ?? true,
        productType: productType === 'hamper' ? 'hamper' : 'normal',
        tags: Array.isArray(tags) ? tags : [],
        specifications: specifications || {},
        seoTitle,
        seoDescription,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        countryPrices: true,
      },
    });

    if (Array.isArray(countryPrices) && countryPrices.length > 0) {
      for (const cp of countryPrices) {
        if (cp.country && cp.fixedPrice > 0) {
          await prisma.productCountryPrice.create({
            data: {
              productId: product.id,
              country: cp.country as CountryCode,
              currency: cp.currency as CurrencyCode,
              fixedPrice: parseFloat(cp.fixedPrice),
            },
          });
        }
      }
    }

    const freshProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        countryPrices: true,
      },
    });

    cacheService.delPrefix('product:');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: freshProduct || product,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const {
      name,
      slug,
      sku,
      description,
      shortDescription,
      images,
      basePriceINR,
      compareAtPriceINR,
      stock,
      lowStockThreshold,
      categoryId,
      brand,
      unit,
      weight,
      weightUnit,
      length,
      width,
      height,
      dimensionUnit,
      dimensions,
      status,
      featured,
      isAddOn,
      addOnCategory,
      isCustomHamperEligible,
      tags,
      specifications,
      countryPrices,
      seoTitle,
      seoDescription,
      productType,
    } = req.body;

    const shippingPayloadProvided =
      weight !== undefined ||
      length !== undefined ||
      width !== undefined ||
      height !== undefined ||
      weightUnit !== undefined ||
      dimensionUnit !== undefined;

    let shippingUpdates: any = {};
    if (shippingPayloadProvided) {
      const targetWeightUnit: WeightUnit = (weightUnit || existing.weightUnit || 'kg') === 'g' ? 'g' : 'kg';
      const targetDimUnit: DimensionUnit = (dimensionUnit || existing.dimensionUnit || 'cm') === 'in' ? 'in' : 'cm';

      // Parse incoming or retain existing
      const candidateWeight = weight !== undefined ? (weight !== null && weight !== '' ? parseFloat(weight) : null) : existing.weight;
      const candidateLength = length !== undefined ? (length !== null && length !== '' ? parseFloat(length) : null) : existing.length;
      const candidateWidth = width !== undefined ? (width !== null && width !== '' ? parseFloat(width) : null) : existing.width;
      const candidateHeight = height !== undefined ? (height !== null && height !== '' ? parseFloat(height) : null) : existing.height;

      if (candidateWeight !== null && (isNaN(candidateWeight) || candidateWeight <= 0)) {
        return res.status(400).json({ success: false, message: 'Product weight must be a positive number greater than zero.' });
      }
      if (candidateLength !== null && (isNaN(candidateLength) || candidateLength <= 0)) {
        return res.status(400).json({ success: false, message: 'Product length must be a positive number greater than zero.' });
      }
      if (candidateWidth !== null && (isNaN(candidateWidth) || candidateWidth <= 0)) {
        return res.status(400).json({ success: false, message: 'Product width must be a positive number greater than zero.' });
      }
      if (candidateHeight !== null && (isNaN(candidateHeight) || candidateHeight <= 0)) {
        return res.status(400).json({ success: false, message: 'Product height must be a positive number greater than zero.' });
      }

      if (candidateWeight !== null || (candidateLength !== null && candidateWidth !== null && candidateHeight !== null)) {
        // If candidate values came from existing (which was already in kg/cm), calculate accordingly
        const calc = calculateProductShippingDetails({
          weight: candidateWeight || 0,
          weightUnit: weight !== undefined ? targetWeightUnit : 'kg',
          length: candidateLength || 0,
          width: candidateWidth || 0,
          height: candidateHeight || 0,
          dimensionUnit: length !== undefined ? targetDimUnit : 'cm',
        });

        const formattedDimensions = calc.lengthCm > 0 && calc.widthCm > 0 && calc.heightCm > 0
          ? `${calc.lengthCm} x ${calc.widthCm} x ${calc.heightCm} cm`
          : dimensions !== undefined ? dimensions : existing.dimensions;

        shippingUpdates = {
          weight: calc.weightKg > 0 ? calc.weightKg : null,
          weightUnit: targetWeightUnit,
          length: calc.lengthCm > 0 ? calc.lengthCm : null,
          width: calc.widthCm > 0 ? calc.widthCm : null,
          height: calc.heightCm > 0 ? calc.heightCm : null,
          dimensionUnit: targetDimUnit,
          volumetricWeight: calc.volumetricWeightKg > 0 ? calc.volumetricWeightKg : null,
          chargeableWeight: calc.chargeableWeightKg > 0 ? calc.chargeableWeightKg : null,
          dimensions: formattedDimensions,
          packageLength: calc.lengthCm > 0 ? calc.lengthCm : null,
          packageWidth: calc.widthCm > 0 ? calc.widthCm : null,
          packageHeight: calc.heightCm > 0 ? calc.heightCm : null,
          packageWeight: calc.chargeableWeightKg > 0 ? calc.chargeableWeightKg : (calc.weightKg > 0 ? calc.weightKg : null),
          packageVolume: calc.lengthCm > 0 && calc.widthCm > 0 && calc.heightCm > 0
            ? Math.round(calc.lengthCm * calc.widthCm * calc.heightCm * 100) / 100
            : null,
        };
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name?.trim(),
        slug: slug?.trim(),
        sku: sku?.trim(),
        description,
        shortDescription,
        images: images ? (Array.isArray(images) ? images : [images]) : undefined,
        basePriceINR: basePriceINR !== undefined ? parseFloat(basePriceINR) : undefined,
        compareAtPriceINR: compareAtPriceINR !== undefined ? (compareAtPriceINR ? parseFloat(compareAtPriceINR) : null) : undefined,
        stock: stock !== undefined ? parseInt(stock, 10) : undefined,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : undefined,
        categoryId: categoryId === undefined ? undefined : categoryId || null,
        brand: brand !== undefined ? brand : undefined,
        unit: unit !== undefined ? unit : undefined,
        ...shippingUpdates,
        status: status || undefined,
        featured: featured !== undefined ? featured : undefined,
        isAddOn: isAddOn !== undefined ? isAddOn : undefined,
        addOnCategory: addOnCategory !== undefined ? addOnCategory : undefined,
        isCustomHamperEligible: isCustomHamperEligible !== undefined ? isCustomHamperEligible : undefined,
        productType: productType !== undefined ? (productType === 'hamper' ? 'hamper' : 'normal') : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        specifications: specifications !== undefined ? specifications : undefined,
        seoTitle,
        seoDescription,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        countryPrices: true,
      },
    });

    if (Array.isArray(countryPrices)) {
      for (const cp of countryPrices) {
        if (cp.country && cp.fixedPrice !== undefined) {
          await prisma.productCountryPrice.upsert({
            where: {
              productId_country: {
                productId: id,
                country: cp.country as CountryCode,
              },
            },
            update: {
              fixedPrice: parseFloat(cp.fixedPrice),
              currency: cp.currency as CurrencyCode,
            },
            create: {
              productId: id,
              country: cp.country as CountryCode,
              currency: cp.currency as CurrencyCode,
              fixedPrice: parseFloat(cp.fixedPrice),
            },
          });
        }
      }
    }

    const freshProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        countryPrices: true,
      },
    });

    cacheService.delPrefix('product:');
    return res.json({ success: true, message: 'Product updated successfully.', data: freshProduct || product });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    cacheService.delPrefix('product:');
    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
