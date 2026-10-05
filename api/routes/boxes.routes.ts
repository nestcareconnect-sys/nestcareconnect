import { Router } from 'express';
import {
  getBoxes,
  getBoxById,
  createBox,
  updateBox,
  deleteBox,
} from '../controllers/boxes.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getBoxes);
router.get('/:id', getBoxById);
router.post('/', authenticate, requireAdmin, createBox);
router.put('/:id', authenticate, requireAdmin, updateBox);
router.delete('/:id', authenticate, requireAdmin, deleteBox);

export default router;
