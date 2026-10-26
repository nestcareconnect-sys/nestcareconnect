import { Router } from 'express';
import {
  getHeroSlides,
  getAdminHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  toggleHeroSlideStatus,
} from '../controllers/heroSlide.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: Retrieve active slides (or all if ?includeInactive=true)
router.get('/', getHeroSlides);

// Admin: Retrieve all slides
router.get('/admin', authenticate, requireAdmin, getAdminHeroSlides);

// Admin: Reorder slides (must precede /:id)
router.put('/reorder', authenticate, requireAdmin, reorderHeroSlides);

// Admin: Quick status toggle
router.patch('/:id/status', authenticate, requireAdmin, toggleHeroSlideStatus);

// Admin: Create, Update, Delete
router.post('/', authenticate, requireAdmin, createHeroSlide);
router.put('/:id', authenticate, requireAdmin, updateHeroSlide);
router.delete('/:id', authenticate, requireAdmin, deleteHeroSlide);

export default router;
