import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { CountryCode, CurrencyCode } from '@prisma/client';

export async function getProducts(req: Request, res: Response) {
  try {
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
    } = req.query;

    const limitNum = Math.min(50, Math.max(1, parseInt((limit as string) || '20', 10)));
    const targetCategory = (categorySlug || category || subcategory) as string | undefined;
    const searchTerm = (search || q) as string | undefined;
    const sortParam = ((sort || sortBy) as string || 'newest').toLowerCase();

    const where: any = {};

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

    return res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getProductBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

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

    return res.json({
      success: true,
      data: {
        product,
        relatedProducts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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
    } = req.body;

    if (!name || !sku || basePriceINR === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, SKU, and base price (INR) are required.' });
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
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions?.trim() || null,
        status: status || 'ACTIVE',
        featured: featured || false,
        isAddOn: isAddOn || false,
        addOnCategory: addOnCategory || null,
        isCustomHamperEligible: isCustomHamperEligible ?? true,
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
    } = req.body;

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
        weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : undefined,
        dimensions: dimensions !== undefined ? dimensions : undefined,
        status: status || undefined,
        featured: featured !== undefined ? featured : undefined,
        isAddOn: isAddOn !== undefined ? isAddOn : undefined,
        addOnCategory: addOnCategory !== undefined ? addOnCategory : undefined,
        isCustomHamperEligible: isCustomHamperEligible !== undefined ? isCustomHamperEligible : undefined,
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

    return res.json({ success: true, message: 'Product updated successfully.', data: freshProduct || product });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
