import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAddresses,
  createAddress,
  deleteAddress,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

router.get('/addresses', authenticate, getAddresses);
router.post('/addresses', authenticate, createAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);

export default router;
