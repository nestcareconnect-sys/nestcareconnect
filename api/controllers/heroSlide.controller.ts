import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { Status } from '@prisma/client';
import { handleControllerError } from '../utils/dbError.js';
import { cacheService } from '../services/cache.service.js';

function invalidateHeroSlideCaches() {
  cacheService.del('hero_slides:public');
  cacheService.del('hero_slides:admin');
}

function formatSlide(slide: any) {
  if (!slide) return null;
  const desktopImage = slide.desktopImage || slide.bannerImageUrl || '';
  const mobileImage = slide.mobileImage || slide.mobileImageUrl || '';
  const title = slide.title || '';
  const description = slide.description || slide.subtitle || '';
  const subtitle = slide.subtitle || slide.description || '';
  const buttonText = slide.buttonText || slide.ctaText || '';
  const ctaText = slide.ctaText || slide.buttonText || '';
  const destinationUrl = slide.destinationUrl || slide.ctaUrl || '';
  const ctaUrl = slide.ctaUrl || slide.destinationUrl || '';
  const linkType = slide.linkType || (destinationUrl ? 'CUSTOM' : 'NONE');

  return {
    ...slide,
    desktopImage,
    bannerImageUrl: desktopImage,
    mobileImage,
    mobileImageUrl: mobileImage,
    title,
    description,
    subtitle,
    buttonText,
    ctaText,
    destinationUrl,
    ctaUrl,
    linkType,
  };
}

export async function getHeroSlides(req: Request, res: Response) {
  try {
    const { includeInactive } = req.query;
    const isPublic = includeInactive !== 'true';

    const cacheKey = isPublic ? 'hero_slides:public' : 'hero_slides:admin';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const slides = await prisma.heroSlide.findMany({
      where: isPublic ? { status: Status.ACTIVE } : {},
      orderBy: { displayOrder: 'asc' },
    });

    const formatted = slides.map(formatSlide);
    cacheService.set(cacheKey, formatted, 300); // 5 min cache

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch hero slides.');
  }
}

export async function getAdminHeroSlides(_req: Request, res: Response) {
  try {
    const cacheKey = 'hero_slides:admin';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const slides = await prisma.heroSlide.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const formatted = slides.map(formatSlide);
    cacheService.set(cacheKey, formatted, 300);

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to fetch all hero slides for admin.');
  }
}

export async function createHeroSlide(req: Request, res: Response) {
  try {
    const {
      title,
      subtitle,
      description,
      badge,
      ctaText,
      buttonText,
      ctaUrl,
      destinationUrl,
      desktopImage,
      bannerImageUrl,
      mobileImage,
      mobileImageUrl,
      linkType = 'CUSTOM',
      linkedProductId,
      linkedCategoryId,
      displayOrder,
      status = Status.ACTIVE,
    } = req.body;

    const finalDesktopImage = (desktopImage || bannerImageUrl || '').trim();
    if (!finalDesktopImage) {
      return res.status(400).json({
        success: false,
        message: 'A desktop banner image is required.',
      });
    }

    const finalMobileImage = (mobileImage || mobileImageUrl || '').trim();
    const finalTitle = title !== undefined && title !== null ? String(title).trim() : null;
    const finalDescription = (description !== undefined && description !== null ? String(description) : (subtitle || '')).trim();
    const finalButtonText = (buttonText !== undefined && buttonText !== null ? String(buttonText) : (ctaText || '')).trim();
    
    // Resolve URL depending on linkType
    let finalDestinationUrl: string | null = null;
    if (linkType !== 'NONE') {
      finalDestinationUrl = (destinationUrl !== undefined && destinationUrl !== null ? String(destinationUrl) : (ctaUrl || '')).trim() || null;
    }

    // Determine displayOrder if not provided
    let orderNum = displayOrder !== undefined ? parseInt(displayOrder, 10) : undefined;
    if (orderNum === undefined || isNaN(orderNum)) {
      const highestSlide = await prisma.heroSlide.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      orderNum = highestSlide ? highestSlide.displayOrder + 1 : 1;
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title: finalTitle,
        subtitle: finalDescription,
        description: finalDescription,
        badge: badge ? String(badge).trim() : null,
        ctaText: finalButtonText || (finalDestinationUrl ? 'Shop Now' : null),
        buttonText: finalButtonText || null,
        ctaUrl: finalDestinationUrl || '',
        destinationUrl: finalDestinationUrl,
        desktopImage: finalDesktopImage,
        bannerImageUrl: finalDesktopImage,
        mobileImage: finalMobileImage || null,
        mobileImageUrl: finalMobileImage || null,
        linkType: linkType || 'CUSTOM',
        linkedProductId: linkType === 'PRODUCT' ? (linkedProductId || null) : null,
        linkedCategoryId: linkType === 'CATEGORY' ? (linkedCategoryId || null) : null,
        displayOrder: orderNum,
        status: status || Status.ACTIVE,
      },
    });

    invalidateHeroSlideCaches();

    return res.status(201).json({
      success: true,
      message: 'Hero slide created successfully.',
      data: formatSlide(slide),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to create hero slide.');
  }
}

export async function updateHeroSlide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      badge,
      ctaText,
      buttonText,
      ctaUrl,
      destinationUrl,
      desktopImage,
      bannerImageUrl,
      mobileImage,
      mobileImageUrl,
      linkType,
      linkedProductId,
      linkedCategoryId,
      displayOrder,
      status,
    } = req.body;

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Hero slide not found.' });
    }

    const finalDesktopImage = desktopImage !== undefined || bannerImageUrl !== undefined
      ? (desktopImage || bannerImageUrl || '').trim()
      : undefined;

    if (finalDesktopImage !== undefined && !finalDesktopImage) {
      return res.status(400).json({
        success: false,
        message: 'A desktop banner image cannot be empty.',
      });
    }

    const finalMobileImage = mobileImage !== undefined || mobileImageUrl !== undefined
      ? (mobileImage || mobileImageUrl || '').trim()
      : undefined;

    const finalTitle = title !== undefined ? (title ? String(title).trim() : null) : undefined;
    const finalDescription = description !== undefined || subtitle !== undefined
      ? ((description ?? subtitle) ? String(description ?? subtitle).trim() : null)
      : undefined;
    const finalButtonText = buttonText !== undefined || ctaText !== undefined
      ? ((buttonText ?? ctaText) ? String(buttonText ?? ctaText).trim() : null)
      : undefined;

    const finalLinkType = linkType !== undefined ? linkType : existing.linkType;
    let finalDestinationUrl: string | null | undefined = undefined;
    if (destinationUrl !== undefined || ctaUrl !== undefined || linkType !== undefined) {
      if (finalLinkType === 'NONE') {
        finalDestinationUrl = null;
      } else {
        const urlCandidate = destinationUrl !== undefined ? destinationUrl : ctaUrl;
        finalDestinationUrl = urlCandidate ? String(urlCandidate).trim() : null;
      }
    }

    const dataToUpdate: any = {};
    if (finalTitle !== undefined) dataToUpdate.title = finalTitle;
    if (finalDescription !== undefined) {
      dataToUpdate.description = finalDescription;
      dataToUpdate.subtitle = finalDescription;
    }
    if (badge !== undefined) dataToUpdate.badge = badge ? String(badge).trim() : null;
    if (finalButtonText !== undefined) {
      dataToUpdate.buttonText = finalButtonText;
      dataToUpdate.ctaText = finalButtonText;
    }
    if (finalDestinationUrl !== undefined) {
      dataToUpdate.destinationUrl = finalDestinationUrl;
      dataToUpdate.ctaUrl = finalDestinationUrl || '';
    }
    if (finalDesktopImage !== undefined) {
      dataToUpdate.desktopImage = finalDesktopImage;
      dataToUpdate.bannerImageUrl = finalDesktopImage;
    }
    if (finalMobileImage !== undefined) {
      dataToUpdate.mobileImage = finalMobileImage || null;
      dataToUpdate.mobileImageUrl = finalMobileImage || null;
    }
    if (linkType !== undefined) {
      dataToUpdate.linkType = linkType;
      dataToUpdate.linkedProductId = linkType === 'PRODUCT' ? (linkedProductId || null) : null;
      dataToUpdate.linkedCategoryId = linkType === 'CATEGORY' ? (linkedCategoryId || null) : null;
    } else {
      if (linkedProductId !== undefined) dataToUpdate.linkedProductId = linkedProductId || null;
      if (linkedCategoryId !== undefined) dataToUpdate.linkedCategoryId = linkedCategoryId || null;
    }
    if (displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder, 10);
      if (!isNaN(parsedOrder)) dataToUpdate.displayOrder = parsedOrder;
    }
    if (status !== undefined) {
      dataToUpdate.status = status;
    }

    const updated = await prisma.heroSlide.update({
      where: { id },
      data: dataToUpdate,
    });

    invalidateHeroSlideCaches();

    return res.json({
      success: true,
      message: 'Hero slide updated successfully.',
      data: formatSlide(updated),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to update hero slide.');
  }
}

export async function deleteHeroSlide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.heroSlide.delete({ where: { id } });
    invalidateHeroSlideCaches();
    return res.json({ success: true, message: 'Hero slide deleted successfully.' });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete hero slide.');
  }
}

export async function toggleHeroSlideStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Hero slide not found.' });
    }

    const newStatus = status || (existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE);

    const updated = await prisma.heroSlide.update({
      where: { id },
      data: { status: newStatus },
    });

    invalidateHeroSlideCaches();

    return res.json({
      success: true,
      message: `Hero slide ${newStatus === Status.ACTIVE ? 'enabled' : 'disabled'}.`,
      data: formatSlide(updated),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to toggle hero slide status.');
  }
}

export async function reorderHeroSlides(req: Request, res: Response) {
  try {
    const { order, items } = req.body;

    if (Array.isArray(order) && order.length > 0) {
      const updates = order.map((slideId: string, idx: number) =>
        prisma.heroSlide.update({
          where: { id: slideId },
          data: { displayOrder: idx + 1 },
        })
      );
      await Promise.all(updates);
    } else if (Array.isArray(items) && items.length > 0) {
      const updates = items.map((item: { id: string; displayOrder: number }) =>
        prisma.heroSlide.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      );
      await Promise.all(updates);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid reorder payload. Provide "order" array of slide IDs or "items" array.',
      });
    }

    const updatedSlides = await prisma.heroSlide.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    invalidateHeroSlideCaches();

    return res.json({
      success: true,
      message: 'Hero slide order updated successfully.',
      data: updatedSlides.map(formatSlide),
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to reorder hero slides.');
  }
}
