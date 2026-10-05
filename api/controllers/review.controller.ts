import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { ReviewStatus } from '@prisma/client';

export async function getProductReviews(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createReview(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Must be logged in to review.' });
    const { productId, rating, comment, images } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Product ID, rating, and review comment are required.' });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user.id,
        userName: req.user.name,
        rating: Math.max(1, Math.min(5, parseInt(rating, 10))),
        comment: comment.trim(),
        images: Array.isArray(images) ? images : [],
        status: ReviewStatus.APPROVED, // Auto approve or PENDING for moderation
      },
    });

    return res.status(201).json({ success: true, message: 'Review submitted successfully.', data: review });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAdminReviews(req: Request, res: Response) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
      },
    });
    return res.json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateReviewStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const review = await prisma.review.update({
      where: { id },
      data: { status: status as ReviewStatus },
    });

    return res.json({ success: true, message: 'Review status updated.', data: review });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
