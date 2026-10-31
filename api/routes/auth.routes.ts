import { Router } from 'express';
import {
  register,
  initiateRegister,
  completeRegister,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  verifyEmailAddress,
  resendVerificationEmail,
  getAddresses,
  createAddress,
  deleteAddress,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/initiate-register', authLimiter, initiateRegister);
router.post('/complete-register', authLimiter, completeRegister);
router.post('/login', authLimiter, login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/forgot-password-otp', passwordResetLimiter, forgotPassword);
router.post('/verify-reset-otp', passwordResetLimiter, verifyResetOtp);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/complete-password-reset', passwordResetLimiter, resetPassword);
router.post('/verify-email', authLimiter, verifyEmailAddress);
router.get('/verify-email', verifyEmailAddress);
router.post('/resend-verification-email', authLimiter, resendVerificationEmail);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, authLimiter, changePassword);

router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, createAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);

export default router;
