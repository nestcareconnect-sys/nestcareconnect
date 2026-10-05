import { Router } from 'express';
import {
  validateCoupon,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/validate', validateCoupon);

// Admin
router.get('/admin', authenticate, requireAdmin, getAdminCoupons);
router.post('/admin', authenticate, requireAdmin, createCoupon);
router.put('/admin/:id', authenticate, requireAdmin, updateCoupon);
router.delete('/admin/:id', authenticate, requireAdmin, deleteCoupon);

export default router;
