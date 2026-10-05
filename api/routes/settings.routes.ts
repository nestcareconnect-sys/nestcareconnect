import { Router } from 'express';
import {
  getSiteSettings,
  updateSiteSettings,
  updateExchangeRates,
} from '../controllers/settings.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getSiteSettings);
router.put('/', authenticate, requireAdmin, updateSiteSettings);
router.put('/exchange-rates', authenticate, requireAdmin, updateExchangeRates);

export default router;
