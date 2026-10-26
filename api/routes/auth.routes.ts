import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getAddresses,
  createAddress,
  deleteAddress,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, authLimiter, changePassword);

router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, createAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);

export default router;
