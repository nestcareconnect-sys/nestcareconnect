import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  mergeGuestCart,
} from '../controllers/cart.controller.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getCart);
router.post('/add', optionalAuth, addToCart);
router.put('/items/:id', optionalAuth, updateCartItemQuantity);
router.delete('/items/:id', optionalAuth, removeCartItem);
router.post('/clear', optionalAuth, clearCart);
router.post('/merge', authenticate, mergeGuestCart);

export default router;
