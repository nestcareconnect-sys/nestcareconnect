import { Router } from 'express';
import { getDashboardStats, getCustomers } from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, requireAdmin, getDashboardStats);
router.get('/customers', authenticate, requireAdmin, getCustomers);

export default router;
