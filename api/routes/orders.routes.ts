import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  trackOrder,
  getOrderTracking,
  getSpecialMessageByToken,
  getAdminOrders,
  updateOrderStatus,
  updateOrderVideo,
  generateOrderQRCode,
} from '../controllers/order.controller.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', optionalAuth, createOrder);
router.get('/my', authenticate, getUserOrders);
router.post('/track', trackOrder);
router.get('/special-message/:token', getSpecialMessageByToken);
router.get('/:id/tracking', getOrderTracking);
router.get('/tracking/:id', getOrderTracking);
router.get('/:id', optionalAuth, getOrderById);

// Admin
router.get('/admin/all', authenticate, requireAdmin, getAdminOrders);
router.put('/admin/:id/status', authenticate, requireAdmin, updateOrderStatus);
router.put('/admin/:id/video', authenticate, requireAdmin, updateOrderVideo);
router.get('/admin/:id/qr-code', authenticate, requireAdmin, generateOrderQRCode);

export default router;
