import { Response } from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { handleControllerError } from '../utils/dbError.js';

export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates and extracts video ID from standard YouTube URLs:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function parseAndValidateYouTubeUrl(rawUrl: string): YouTubeValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'YouTube video URL is required.',
    };
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = 'https://' + fullUrl;
  }

  try {
    const parsed = new URL(fullUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      const pathPart = parsed.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
      if (pathPart && /^[a-zA-Z0-9_-]{11}$/.test(pathPart)) {
        videoId = pathPart;
      }
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
          videoId = v;
        }
      }

      if (!videoId) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0].toLowerCase())) {
          const candidate = parts[1];
          if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
            videoId = candidate;
          }
        }
      }
    }

    if (!videoId) {
      return {
        isValid: false,
        error:
          'Invalid YouTube video link. Please enter a valid YouTube video address (e.g. https://www.youtube.com/watch?v=..., https://youtu.be/..., or https://www.youtube.com/shorts/...).',
      };
    }

    return {
      isValid: true,
      videoId,
      normalizedUrl: fullUrl,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Please enter a valid web address.',
    };
  }
}

/**
 * GET /api/admin/qr-codes
 * Fetch all previously generated QR codes
 */
export async function getQrCodes(_req: AuthRequest, res: Response) {
  try {
    const qrCodes = await prisma.$queryRaw<any[]>`
      SELECT 
        q.id, 
        q.label, 
        q."youtubeUrl", 
        q."qrDataUrl", 
        q."adminId", 
        q."createdAt", 
        q."updatedAt",
        u.name as "adminName",
        u.email as "adminEmail"
      FROM "QrCode" q
      LEFT JOIN "User" u ON q."adminId" = u.id
      ORDER BY q."createdAt" DESC
    `;

    return res.json({
      success: true,
      data: qrCodes,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve QR codes.');
  }
}

/**
 * POST /api/admin/qr-codes
 * Generate and persist a new QR code for a YouTube video URL
 */
export async function createQrCode(req: AuthRequest, res: Response) {
  try {
    const { youtubeUrl, label } = req.body;

    const validation = parseAndValidateYouTubeUrl(youtubeUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'Invalid YouTube video URL.',
      });
    }

    const cleanLabel = (label || '').trim() || null;
    const targetUrl = validation.normalizedUrl;

    // Generate high-resolution, print-ready PNG Data URL (1024x1024, High Error Correction, clear margins)
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Also generate SVG for vector printing
    const qrSvg = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 4,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const newId = crypto.randomUUID();
    const adminId = req.user?.id || null;

    await prisma.$executeRaw`
      INSERT INTO "QrCode" (id, label, "youtubeUrl", "qrDataUrl", "adminId", "createdAt", "updatedAt")
      VALUES (${newId}, ${cleanLabel}, ${targetUrl}, ${qrDataUrl}, ${adminId}, NOW(), NOW())
    `;

    const createdRecord = {
      id: newId,
      label: cleanLabel,
      youtubeUrl: targetUrl,
      videoId: validation.videoId,
      qrDataUrl,
      svg: qrSvg,
      adminId,
      adminName: req.user?.name || 'Administrator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.status(201).json({
      success: true,
      message: 'QR Code generated and saved successfully.',
      data: createdRecord,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to generate QR code.');
  }
}

/**
 * DELETE /api/admin/qr-codes/:id
 * Delete a previously generated QR code
 */
export async function deleteQrCode(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'QR Code ID is required.' });
    }

    const result = await prisma.$executeRaw`
      DELETE FROM "QrCode" WHERE id = ${id}
    `;

    return res.json({
      success: true,
      message: 'QR Code removed successfully.',
      affected: result,
    });
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete QR code.');
  }
}
