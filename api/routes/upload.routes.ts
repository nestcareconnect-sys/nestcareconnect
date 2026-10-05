import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { storageService } from '../services/storage.service.js';

const router = Router();

/**
 * 1. Admin single file upload (products, banners, boxes)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const result = await storageService.uploadFile(req.file);
      return res.json({
        success: true,
        message: 'File uploaded successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 2. Admin multiple file upload
 */
router.post(
  '/multiple',
  authenticate,
  requireAdmin,
  upload.array('files', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      const uploadPromises = files.map((f) => storageService.uploadFile(f));
      const results = await Promise.all(uploadPromises);

      return res.json({
        success: true,
        message: 'Files uploaded successfully.',
        data: results,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 3. Customer Hamper Photo Upload (Single)
 * Allowed for all customers & guests configuring personalized hampers
 */
router.post(
  '/hamper-photo',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo file provided.' });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedMimes.includes(req.file.mimetype.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file format. Please upload JPG, PNG, or WEBP images only.',
        });
      }

      // 5MB size limit check
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'File is too large. Maximum allowed size is 5 MB per photo.',
        });
      }

      const result = await storageService.uploadFile(req.file);
      return res.json({
        success: true,
        message: 'Customer photo uploaded successfully.',
        data: {
          ...result,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Photo upload failed.' });
    }
  }
);

/**
 * 4. Customer Hamper Photos Upload (Multiple)
 */
router.post(
  '/hamper-photos',
  upload.array('files', 5),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No photo files provided.' });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      for (const f of files) {
        if (!allowedMimes.includes(f.mimetype.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `File "${f.originalname}" is an unsupported format. Please upload JPG, PNG, or WEBP.`,
          });
        }
        if (f.size > 5 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: `File "${f.originalname}" exceeds 5 MB limit.`,
          });
        }
      }

      const uploadPromises = files.map(async (f) => {
        const uploadResult = await storageService.uploadFile(f);
        return {
          ...uploadResult,
          originalName: f.originalname,
          mimeType: f.mimetype,
          fileSize: f.size,
        };
      });

      const results = await Promise.all(uploadPromises);
      return res.json({
        success: true,
        message: 'Photos uploaded successfully.',
        data: results,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Photos upload failed.' });
    }
  }
);

/**
 * 5. Delete uploaded customer photo
 */
router.delete('/hamper-photo/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Photo key is required.' });
    }
    const success = await storageService.deleteFile(key);
    return res.json({ success, message: 'Photo deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
