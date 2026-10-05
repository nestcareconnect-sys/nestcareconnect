import { Router } from 'express';
import {
  getCustomHamperConfig,
  calculateCustomHamperQuote,
  updateCustomHamperConfig,
} from '../controllers/customHamper.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/config', getCustomHamperConfig);
router.post('/quote', calculateCustomHamperQuote);
router.put('/config', authenticate, requireAdmin, updateCustomHamperConfig);

export default router;
