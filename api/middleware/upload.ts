import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import os from 'os';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
export const uploadDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'public/uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ [STORAGE] Could not create upload directory:', (err as any)?.message || err);
}

// Map verified MIME types to safe deterministic extensions
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/jpg': '.jpg',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate cryptographically random filename to prevent directory traversal & execution
    const randomName = crypto.randomBytes(16).toString('hex');
    const safeExt = MIME_EXTENSION_MAP[file.mimetype.toLowerCase()] || '.jpg';
    cb(null, `ncc-${Date.now()}-${randomName}${safeExt}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const normalizedMime = (file.mimetype || '').toLowerCase();
  const rawExt = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  // Check both MIME type and file extension
  if (!MIME_EXTENSION_MAP[normalizedMime]) {
    return cb(new Error('Only JPEG, PNG, and WEBP image files are permitted.'));
  }

  if (!allowedExtensions.includes(rawExt)) {
    return cb(new Error('File extension does not match permitted image types (.jpg, .jpeg, .png, .webp).'));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 10,
  },
});
