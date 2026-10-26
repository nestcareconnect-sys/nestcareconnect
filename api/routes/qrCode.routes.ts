import { Router } from 'express';
import { getQrCodes, createQrCode, deleteQrCode } from '../controllers/qrCode.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Admin-protected QR code routes
router.get('/', authenticate, requireAdmin, getQrCodes);
router.post('/', authenticate, requireAdmin, createQrCode);
router.delete('/:id', authenticate, requireAdmin, deleteQrCode);

export default router;
