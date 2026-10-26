import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { whatsappService } from '../services/whatsapp.service.js';
import { storageService } from '../services/storage.service.js';
import prisma from '../config/prisma.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadDir } from '../middleware/upload.js';

const router = Router();

const SAFE_MEDIA_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

const mediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeExt = SAFE_MEDIA_MIMES[file.mimetype.toLowerCase()] || '.jpg';
    cb(null, `wa-media-${Date.now()}-${randomHex}${safeExt}`);
  },
});

const mediaFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];

  if (!SAFE_MEDIA_MIMES[mime]) {
    return cb(
      new Error(`Unsupported file type: "${file.mimetype}". Supported formats: JPG, PNG, WEBP, MP4, MOV.`)
    );
  }

  if (!validExts.includes(ext)) {
    return cb(
      new Error(`File extension does not match permitted formats (.jpg, .jpeg, .png, .webp, .mp4, .mov).`)
    );
  }

  cb(null, true);
};

const mediaUpload = multer({
  storage: mediaStorage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 35 * 1024 * 1024, // 35MB upper ceiling for Multer buffer
  },
});

/**
 * 1. Public WhatsApp Configuration
 * Safely returns business phone and Cloud API availability
 */
router.get('/config', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: whatsappService.getPublicConfig(),
  });
});

/**
 * 2. Upload WhatsApp Media (Multiple Images and/or Videos)
 */
router.post(
  '/media',
  uploadLimiter,
  mediaUpload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No media files provided.' });
      }

      const results = [];

      for (const file of files) {
        const mime = file.mimetype.toLowerCase();
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideo = mime.startsWith('video/') || ext === '.mp4' || ext === '.mov';
        const mediaType: 'IMAGE' | 'VIDEO' = isVideo ? 'VIDEO' : 'IMAGE';

        // Size validations: Images <= 15MB, Videos <= 30MB
        const maxImageSize = 15 * 1024 * 1024;
        const maxVideoSize = 30 * 1024 * 1024;

        if (isVideo && file.size > maxVideoSize) {
          // Clean up file
          try { fs.unlinkSync(file.path); } catch {}
          return res.status(400).json({
            success: false,
            message: `Video "${file.originalname}" exceeds maximum allowed size of 30 MB.`,
          });
        }

        if (!isVideo && file.size > maxImageSize) {
          // Clean up file
          try { fs.unlinkSync(file.path); } catch {}
          return res.status(400).json({
            success: false,
            message: `Image "${file.originalname}" exceeds maximum allowed size of 15 MB.`,
          });
        }

        const uploadResult = await storageService.uploadFile(file);
        results.push({
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          url: uploadResult.url,
          key: uploadResult.key,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          mediaType,
          uploadedAt: new Date().toISOString(),
        });
      }

      return res.json({
        success: true,
        message: 'Media files uploaded successfully.',
        data: results,
      });
    } catch (error: any) {
      console.error('[WhatsAppMediaUpload] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Media upload failed.',
      });
    }
  }
);

/**
 * 3. Delete Uploaded WhatsApp Media
 */
router.delete('/media/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'Media key is required.' });
    }

    const safeKey = path.basename(key.trim());
    if (safeKey !== key.trim() || !safeKey.startsWith('wa-')) {
      return res.status(400).json({ success: false, message: 'Invalid media key format.' });
    }

    const success = await storageService.deleteFile(safeKey);
    return res.json({ success, message: 'Media deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 4. Send Order Notification to Business WhatsApp
 */
router.post('/send-order', async (req: Request, res: Response) => {
  try {
    const { orderId, orderNumber, payload } = req.body;

    let targetPayload = payload;

    // If orderId is provided, retrieve authoritative details from database
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, timeline: true },
      });

      if (order) {
        const shipping: any = order.shippingAddress || {};
        const buyer = order.guestName
          ? {
              name: order.guestName,
              email: order.guestEmail,
              phone: order.guestPhone,
              country: order.country,
            }
          : shipping.buyer || {
              name: shipping.name,
              email: shipping.email,
              phone: shipping.phone,
              country: order.country,
            };

        const recipient = shipping.recipient || shipping;
        const media = shipping.whatsappMedia || [];

        targetPayload = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          buyer,
          recipient,
          items: order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          total: order.total,
          currency: order.currency,
          notes: order.notes || shipping.personalizationNote,
          media,
        };

        // Dispatch via WhatsApp Service
        const sendResult = await whatsappService.sendOrderToBusiness(targetPayload);

        // Update database snapshot with WhatsApp delivery status
        try {
          const updatedShipping = {
            ...shipping,
            whatsappStatus: sendResult.success
              ? 'SENT'
              : (sendResult.mode === 'CLICK_TO_CHAT_FALLBACK' ? 'CLICK_TO_CHAT_FALLBACK' : 'FAILED'),
            whatsappMessageId: sendResult.messageId || null,
            whatsappSentAt: sendResult.success ? new Date() : null,
            whatsappError: sendResult.error || null,
          };

          await prisma.order.update({
            where: { id: order.id },
            data: {
              shippingAddress: updatedShipping,
            },
          });

          if (sendResult.success) {
            await prisma.orderTimeline.create({
              data: {
                orderId: order.id,
                status: order.orderStatus,
                title: 'WhatsApp Notification Sent',
                description: `Order details automatically delivered to Business WhatsApp (+${whatsappService.getPublicConfig().businessPhoneNumber}). Message ID: ${sendResult.messageId}`,
              },
            });
          }
        } catch (dbErr) {
          console.warn('[WhatsAppRoutes] Failed to update order snapshot with WhatsApp status:', dbErr);
        }

        return res.json({
          success: sendResult.success,
          mode: sendResult.mode,
          messageId: sendResult.messageId,
          fallbackUrl: sendResult.fallbackUrl,
          reason: sendResult.reason,
          error: sendResult.error,
        });
      }
    }

    if (!targetPayload) {
      return res.status(400).json({ success: false, message: 'Valid order information is required.' });
    }

    // Direct payload delivery (e.g. preview or guest prior to database commit)
    const sendResult = await whatsappService.sendOrderToBusiness(targetPayload);
    return res.json({
      success: sendResult.success,
      mode: sendResult.mode,
      messageId: sendResult.messageId,
      fallbackUrl: sendResult.fallbackUrl,
      reason: sendResult.reason,
      error: sendResult.error,
    });
  } catch (error: any) {
    console.error('[WhatsAppRoutes] Failed to send order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process WhatsApp communication.',
    });
  }
});

/**
 * 5. Generate Click-to-Chat URL
 */
router.post('/click-to-chat', (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Payload is required.' });
    }
    const url = whatsappService.getClickToChatUrl(payload);
    return res.json({
      success: true,
      data: { url },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
