import { Router } from 'express';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from '../controllers/heroSlide.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getHeroSlides);
router.post('/', authenticate, requireAdmin, createHeroSlide);
router.put('/:id', authenticate, requireAdmin, updateHeroSlide);
router.delete('/:id', authenticate, requireAdmin, deleteHeroSlide);

export default router;
