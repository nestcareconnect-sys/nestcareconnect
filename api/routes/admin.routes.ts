import { Router } from 'express';
import {
  getDashboardStats,
  getCustomers,
  getOrderEmailNotifications,
  retryEmailNotification,
  getEmailStatus,
  sendOrderTrackingEmail,
} from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, requireAdmin, getDashboardStats);
router.get('/customers', authenticate, requireAdmin, getCustomers);
router.get('/orders/:id/emails', authenticate, requireAdmin, getOrderEmailNotifications);
router.post('/emails/:id/retry', authenticate, requireAdmin, retryEmailNotification);
router.get('/email-status', authenticate, requireAdmin, getEmailStatus);
router.post('/orders/:id/send-tracking', authenticate, requireAdmin, sendOrderTrackingEmail);

export default router;
