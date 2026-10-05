import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { Prisma, HamperType, PricingType, CountryCode, CurrencyCode, Status } from '@prisma/client';

export async function getHampers(req: Request, res: Response) {
  try {
    const { hamperType, recipientType, occasion, featured, status = 'ACTIVE', country } = req.query;

    const where: any = {};
    if (status) where.status = status as Status;
    if (hamperType) where.hamperType = hamperType as HamperType;
    if (recipientType) where.recipientType = recipientType as string;
    if (occasion) where.occasion = occasion as string;
    if (featured === 'true') where.featured = true;
    if (country) {
      where.countryAvailability = { has: country as CountryCode };
    }

    const hampers = await prisma.hamper.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        countryPrices: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                basePriceINR: true,
                images: true,
                unit: true,
                countryPrices: true,
              },
            },
          },
        },
      },
    });

    return res.json({ success: true, data: hampers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHamperBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const hamper = await prisma.hamper.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      include: {
        countryPrices: true,
        items: {
          include: {
            product: {
              include: {
                countryPrices: true,
              },
            },
          },
        },
      },
    });

    if (!hamper) {
      return res.status(404).json({ success: false, message: 'Healthcare hamper not found.' });
    }

    // Fetch add-on products for personalization upsell
    const addOnProducts = await prisma.product.findMany({
      where: {
        isAddOn: true,
        status: Status.ACTIVE,
      },
      take: 8,
      include: { countryPrices: true },
    });

    return res.json({ success: true, data: { ...hamper, eligibleAddOns: addOnProducts } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createHamper(req: Request, res: Response) {
  try {
    const {
      name,
      slug,
      hamperType,
      recipientType,
      recipientTypes,
      occasion,
      occasions,
      recipientVariant,
      description,
      shortDescription,
      images,
      pricingType,
      fixedPriceINR,
      startingPriceINR,
      stock,
      status,
      featured,
      allowCustomMessage,
      allowPhotos,
      allowPhotoUpload,
      maxPhotos,
      photoRequired,
      photoInstructions,
      photoCardEnabled,
      allowVideoQR,
      countryAvailability,
      items,
      countryPrices,
      seoTitle,
      seoDescription,
    } = req.body;

    if (!name || !hamperType) {
      return res.status(400).json({ success: false, message: 'Hamper name and type are required.' });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    const photoToggle = allowPhotoUpload !== undefined ? Boolean(allowPhotoUpload) : (allowPhotos !== undefined ? Boolean(allowPhotos) : true);

    const normalizedRecipientType = recipientType !== undefined
      ? (recipientType || null)
      : (Array.isArray(recipientTypes) && recipientTypes.length > 0 ? recipientTypes[0] : null);

    const normalizedOccasion = occasion !== undefined
      ? (occasion || null)
      : (Array.isArray(occasions) && occasions.length > 0 ? occasions[0] : null);

    // Validate Items
    let processedItems: { productId: string; quantity: number }[] = [];
    if (Array.isArray(items) && items.length > 0) {
      const rawProductIds = items
        .map((i: any) => i?.productId)
        .filter((pid: any): pid is string => typeof pid === 'string' && pid.trim().length > 0);

      if (rawProductIds.length > 0) {
        const existingProducts = await prisma.product.findMany({
          where: {
            OR: [{ id: { in: rawProductIds } }, { slug: { in: rawProductIds } }],
          },
          select: { id: true, slug: true },
        });

        const validIdSet = new Set(existingProducts.map((p: { id: string; slug: string }) => p.id));
        const slugMap = new Map(existingProducts.map((p: { id: string; slug: string }) => [p.slug, p.id]));
        const missingIds: string[] = [];
        const itemMap = new Map<string, number>();

        for (const itm of items) {
          if (!itm || !itm.productId) continue;
          let pId = itm.productId;
          if (!validIdSet.has(pId)) {
            if (slugMap.has(pId)) {
              pId = slugMap.get(pId)!;
            } else {
              missingIds.push(itm.productId);
              continue;
            }
          }
          const qty = Math.max(1, parseInt(String(itm.quantity || 1), 10) || 1);
          itemMap.set(pId, (itemMap.get(pId) || 0) + qty);
        }

        if (missingIds.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Unable to create hamper: Referenced product(s) do not exist (${missingIds.join(', ')}).`,
            errorCode: 'INVALID_PRODUCT_IDS',
          });
        }

        processedItems = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
          productId,
          quantity,
        }));
      }
    }

    // Validate Country Prices
    const processedCountryPrices: { country: CountryCode; currency: CurrencyCode; fixedPrice: number }[] = [];
    if (Array.isArray(countryPrices)) {
      for (const cp of countryPrices) {
        if (!cp || !cp.country) continue;
        const priceVal = typeof cp.fixedPrice === 'number' ? cp.fixedPrice : parseFloat(cp.fixedPrice);
        if (!isNaN(priceVal) && priceVal >= 0) {
          processedCountryPrices.push({
            country: cp.country as CountryCode,
            currency: (cp.currency || (cp.country === 'AE' ? 'AED' : cp.country === 'US' ? 'USD' : 'INR')) as CurrencyCode,
            fixedPrice: priceVal,
          });
        }
      }
    }

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const hamper = await tx.hamper.create({
        data: {
          name: name.trim(),
          slug: generatedSlug,
          hamperType: hamperType as HamperType,
          recipientType: normalizedRecipientType,
          occasion: normalizedOccasion,
          recipientVariant: recipientVariant || null,
          description: description || '',
          shortDescription: shortDescription || null,
          images: Array.isArray(images) ? images.filter(Boolean) : (images ? [images] : []),
          pricingType: (pricingType as PricingType) || 'FIXED',
          fixedPriceINR: fixedPriceINR !== undefined && fixedPriceINR !== null && !isNaN(Number(fixedPriceINR)) ? Number(fixedPriceINR) : null,
          startingPriceINR: startingPriceINR !== undefined && startingPriceINR !== null && !isNaN(Number(startingPriceINR))
            ? Number(startingPriceINR)
            : (fixedPriceINR !== undefined && fixedPriceINR !== null && !isNaN(Number(fixedPriceINR)) ? Number(fixedPriceINR) : null),
          stock: stock !== undefined && !isNaN(parseInt(String(stock), 10)) ? Math.max(0, parseInt(String(stock), 10)) : 50,
          status: status || Status.ACTIVE,
          featured: featured !== undefined ? Boolean(featured) : false,
          allowCustomMessage: allowCustomMessage !== undefined ? Boolean(allowCustomMessage) : true,
          allowPhotos: photoToggle,
          allowPhotoUpload: photoToggle,
          maxPhotos: maxPhotos !== undefined && !isNaN(parseInt(String(maxPhotos), 10)) ? Math.max(0, parseInt(String(maxPhotos), 10)) : 3,
          photoRequired: photoRequired !== undefined ? Boolean(photoRequired) : false,
          photoInstructions: typeof photoInstructions === 'string' ? photoInstructions : 'Add a special family photo to include inside the hamper greeting card.',
          photoCardEnabled: photoCardEnabled !== undefined ? Boolean(photoCardEnabled) : true,
          allowVideoQR: allowVideoQR !== undefined ? Boolean(allowVideoQR) : false,
          countryAvailability: Array.isArray(countryAvailability) && countryAvailability.length > 0
            ? countryAvailability
            : [CountryCode.IN, CountryCode.AE, CountryCode.US],
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
        },
      });

      if (processedItems.length > 0) {
        await tx.hamperItem.createMany({
          data: processedItems.map((item) => ({
            hamperId: hamper.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
      }

      if (processedCountryPrices.length > 0) {
        await tx.hamperCountryPrice.createMany({
          data: processedCountryPrices.map((cp) => ({
            hamperId: hamper.id,
            country: cp.country,
            currency: cp.currency,
            fixedPrice: cp.fixedPrice,
          })),
        });
      }

      return await tx.hamper.findUnique({
        where: { id: hamper.id },
        include: {
          items: { include: { product: true } },
          countryPrices: true,
        },
      });
    });

    return res.status(201).json({ success: true, message: 'Hamper created successfully.', data: created, hamper: created });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A hamper with this slug already exists.', errorCode: 'P2002' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateHamper(req: Request, res: Response) {
  const { id } = req.params;

  console.log('[HAMPER_UPDATE_START]', {
    slug: id,
    adminUserId: (req as any).user?.id || 'anonymous',
    requestBodyKeys: Object.keys(req.body || {}),
  });

  try {
    const {
      name,
      slug,
      hamperType,
      recipientType,
      recipientTypes,
      occasion,
      occasions,
      recipientVariant,
      description,
      shortDescription,
      images,
      pricingType,
      fixedPriceINR,
      startingPriceINR,
      stock,
      status,
      featured,
      allowCustomMessage,
      allowPhotos,
      allowPhotoUpload,
      maxPhotos,
      photoRequired,
      photoInstructions,
      photoCardEnabled,
      allowVideoQR,
      countryAvailability,
      items,
      countryPrices,
      seoTitle,
      seoDescription,
    } = req.body;

    // 1. Locate the existing Hamper by ID or Slug
    const existingHamper = await prisma.hamper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        items: true,
        countryPrices: true,
      },
    });

    if (!existingHamper) {
      return res.status(404).json({
        success: false,
        message: `Hamper '${id}' not found.`,
        errorCode: 'HAMPER_NOT_FOUND',
      });
    }

    const hamperDbId = existingHamper.id;

    // 2. Validate photo & personalization settings
    const photoToggle = allowPhotoUpload !== undefined
      ? Boolean(allowPhotoUpload)
      : (allowPhotos !== undefined ? Boolean(allowPhotos) : undefined);

    const normalizedRecipientType = recipientType !== undefined
      ? (recipientType || null)
      : (Array.isArray(recipientTypes) ? (recipientTypes[0] || null) : undefined);

    const normalizedOccasion = occasion !== undefined
      ? (occasion || null)
      : (Array.isArray(occasions) ? (occasions[0] || null) : undefined);

    // 3. Construct explicitly validated update object
    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) {
      updateData.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    if (hamperType !== undefined) updateData.hamperType = hamperType as HamperType;
    if (normalizedRecipientType !== undefined) updateData.recipientType = normalizedRecipientType;
    if (normalizedOccasion !== undefined) updateData.occasion = normalizedOccasion;
    if (recipientVariant !== undefined) updateData.recipientVariant = recipientVariant || null;
    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription || null;
    if (images !== undefined) {
      updateData.images = Array.isArray(images) ? images.filter(Boolean) : (images ? [images] : []);
    }
    if (pricingType !== undefined) updateData.pricingType = pricingType as PricingType;
    if (fixedPriceINR !== undefined) {
      updateData.fixedPriceINR = fixedPriceINR !== null && !isNaN(Number(fixedPriceINR)) ? Number(fixedPriceINR) : null;
    }
    if (startingPriceINR !== undefined) {
      updateData.startingPriceINR = startingPriceINR !== null && !isNaN(Number(startingPriceINR)) ? Number(startingPriceINR) : null;
    }
    if (stock !== undefined) {
      updateData.stock = !isNaN(parseInt(String(stock), 10)) ? Math.max(0, parseInt(String(stock), 10)) : 50;
    }
    if (status !== undefined) updateData.status = status as Status;
    if (featured !== undefined) updateData.featured = Boolean(featured);
    if (allowCustomMessage !== undefined) updateData.allowCustomMessage = Boolean(allowCustomMessage);
    if (photoToggle !== undefined) {
      updateData.allowPhotos = photoToggle;
      updateData.allowPhotoUpload = photoToggle;
    }
    if (maxPhotos !== undefined) {
      updateData.maxPhotos = !isNaN(parseInt(String(maxPhotos), 10)) ? Math.max(0, parseInt(String(maxPhotos), 10)) : 3;
    }
    if (photoRequired !== undefined) updateData.photoRequired = Boolean(photoRequired);
    if (photoInstructions !== undefined) updateData.photoInstructions = photoInstructions;
    if (photoCardEnabled !== undefined) updateData.photoCardEnabled = Boolean(photoCardEnabled);
    if (allowVideoQR !== undefined) updateData.allowVideoQR = Boolean(allowVideoQR);
    if (countryAvailability !== undefined && Array.isArray(countryAvailability)) {
      updateData.countryAvailability = countryAvailability;
    }
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle || null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription || null;

    // 4. Validate items & verify products exist
    let processedItems: { productId: string; quantity: number }[] | null = null;
    if (Array.isArray(items)) {
      processedItems = [];
      const rawProductIds = items
        .map((i: any) => i?.productId)
        .filter((pid: any): pid is string => typeof pid === 'string' && pid.trim().length > 0);

      if (rawProductIds.length > 0) {
        const existingProducts = await prisma.product.findMany({
          where: {
            OR: [{ id: { in: rawProductIds } }, { slug: { in: rawProductIds } }],
          },
          select: { id: true, slug: true },
        });

        const validIdSet = new Set(existingProducts.map((p: { id: string; slug: string }) => p.id));
        const slugMap = new Map(existingProducts.map((p: { id: string; slug: string }) => [p.slug, p.id]));
        const missingIds: string[] = [];
        const itemMap = new Map<string, number>();

        for (const itm of items) {
          if (!itm || !itm.productId) continue;
          let pId = itm.productId;
          if (!validIdSet.has(pId)) {
            if (slugMap.has(pId)) {
              pId = slugMap.get(pId)!;
            } else {
              missingIds.push(itm.productId);
              continue;
            }
          }
          const qty = Math.max(1, parseInt(String(itm.quantity || 1), 10) || 1);
          itemMap.set(pId, (itemMap.get(pId) || 0) + qty);
        }

        if (missingIds.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Unable to update hamper: Referenced product(s) do not exist: ${missingIds.join(', ')}`,
            errorCode: 'INVALID_PRODUCT_IDS',
          });
        }

        processedItems = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
          productId,
          quantity,
        }));
      }
    }

    // 5. Validate country prices
    let processedCountryPrices: { country: CountryCode; currency: CurrencyCode; fixedPrice: number }[] | null = null;
    if (Array.isArray(countryPrices)) {
      processedCountryPrices = [];
      for (const cp of countryPrices) {
        if (!cp || !cp.country) continue;
        const priceVal = typeof cp.fixedPrice === 'number' ? cp.fixedPrice : parseFloat(cp.fixedPrice);
        if (!isNaN(priceVal) && priceVal >= 0) {
          processedCountryPrices.push({
            country: cp.country as CountryCode,
            currency: (cp.currency || (cp.country === 'AE' ? 'AED' : cp.country === 'US' ? 'USD' : 'INR')) as CurrencyCode,
            fixedPrice: priceVal,
          });
        }
      }
    }

    // 6. Execute atomic transaction
    const updatedHamper = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.hamper.update({
        where: { id: hamperDbId },
        data: updateData,
      });

      if (processedItems !== null) {
        await tx.hamperItem.deleteMany({ where: { hamperId: hamperDbId } });
        if (processedItems.length > 0) {
          await tx.hamperItem.createMany({
            data: processedItems.map((item) => ({
              hamperId: hamperDbId,
              productId: item.productId,
              quantity: item.quantity,
            })),
          });
        }
      }

      if (processedCountryPrices !== null) {
        await tx.hamperCountryPrice.deleteMany({ where: { hamperId: hamperDbId } });
        if (processedCountryPrices.length > 0) {
          await tx.hamperCountryPrice.createMany({
            data: processedCountryPrices.map((cp) => ({
              hamperId: hamperDbId,
              country: cp.country,
              currency: cp.currency,
              fixedPrice: cp.fixedPrice,
            })),
          });
        }
      }

      return await tx.hamper.findUnique({
        where: { id: hamperDbId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  countryPrices: true,
                },
              },
            },
          },
          countryPrices: true,
        },
      });
    });

    return res.json({
      success: true,
      message: 'Hamper updated successfully.',
      data: updatedHamper,
      hamper: updatedHamper,
    });
  } catch (error: any) {
    console.error('[HAMPER_UPDATE_ERROR]', {
      message: error.message,
      name: error.name,
      prismaCode: error.code || null,
      operation: 'updateHamper',
    });

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Hamper not found in database.',
        errorCode: 'P2025',
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A hamper with this slug already exists.',
        errorCode: 'P2002',
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Foreign key constraint failed. A referenced product or relation does not exist.',
        errorCode: 'P2003',
      });
    }

    return res.status(500).json({
      success: false,
      message: `Unable to update hamper: ${error.message || 'Unknown database error'}`,
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      errorCode: error.code || 'HAMPER_UPDATE_FAILED',
    });
  }
}

export async function deleteHamper(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existingHamper = await prisma.hamper.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existingHamper) {
      return res.status(404).json({
        success: false,
        message: `Hamper '${id}' not found.`,
        errorCode: 'HAMPER_NOT_FOUND',
      });
    }

    await prisma.hamper.delete({
      where: { id: existingHamper.id },
    });

    return res.json({ success: true, message: 'Hamper deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete hamper',
      errorCode: error.code || 'HAMPER_DELETE_FAILED',
    });
  }
}
