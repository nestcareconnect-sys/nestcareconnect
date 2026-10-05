import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { Status } from '@prisma/client';

export async function getHeroSlides(req: Request, res: Response) {
  try {
    const { includeInactive } = req.query;

    const slides = await prisma.heroSlide.findMany({
      where: includeInactive === 'true' ? {} : { status: Status.ACTIVE },
      orderBy: { displayOrder: 'asc' },
    });

    return res.json({ success: true, data: slides });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createHeroSlide(req: Request, res: Response) {
  try {
    const { title, subtitle, badge, ctaText, ctaUrl, desktopImage, mobileImage, displayOrder, status } = req.body;

    if (!title || !desktopImage || !mobileImage) {
      return res.status(400).json({
        success: false,
        message: 'Title, desktop image URL, and mobile image URL are required.',
      });
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title: title.trim(),
        subtitle: subtitle || '',
        badge,
        ctaText: ctaText || 'Shop Now',
        ctaUrl: ctaUrl || '/shop',
        desktopImage,
        mobileImage,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
        status: status || Status.ACTIVE,
      },
    });

    return res.status(201).json({ success: true, message: 'Hero slide created.', data: slide });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateHeroSlide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, subtitle, badge, ctaText, ctaUrl, desktopImage, mobileImage, displayOrder, status } = req.body;

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: {
        title: title?.trim(),
        subtitle,
        badge,
        ctaText,
        ctaUrl,
        desktopImage,
        mobileImage,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : undefined,
        status: status || undefined,
      },
    });

    return res.json({ success: true, message: 'Hero slide updated.', data: slide });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteHeroSlide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.heroSlide.delete({ where: { id } });
    return res.json({ success: true, message: 'Hero slide deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
