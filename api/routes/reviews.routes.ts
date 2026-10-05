import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  getAdminReviews,
  updateReviewStatus,
} from '../controllers/review.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/product/:productId', getProductReviews);
router.post('/', authenticate, createReview);

// Admin
router.get('/admin', authenticate, requireAdmin, getAdminReviews);
router.put('/admin/:id/status', authenticate, requireAdmin, updateReviewStatus);

export default router;
