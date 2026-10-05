import { Router } from 'express';
import {
  getHampers,
  getHamperBySlug,
  createHamper,
  updateHamper,
  deleteHamper,
} from '../controllers/hamper.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getHampers);
router.get('/:slug', getHamperBySlug);

// Admin
router.post('/', authenticate, requireAdmin, createHamper);
router.put('/:id', authenticate, requireAdmin, updateHamper);
router.delete('/:id', authenticate, requireAdmin, deleteHamper);

export default router;
