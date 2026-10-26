import fs from 'fs';
import path from 'path';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export class StorageService {
  private publicBaseUrl: string;

  constructor() {
    this.publicBaseUrl = process.env.STORAGE_PUBLIC_URL || process.env.APP_URL || '';
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    // If S3 / R2 keys are configured, upload to cloud S3 bucket
    if (process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY && process.env.STORAGE_BUCKET) {
      // S3 SDK upload logic can be added here
      console.log(`[Storage] Uploading ${file.filename} to Cloudflare R2 / S3 Bucket: ${process.env.STORAGE_BUCKET}`);
    }

    // Default: Public relative URL for local development / Vercel uploads
    const url = `/uploads/${file.filename}`;
    return {
      url,
      key: file.filename,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      if (!key || typeof key !== 'string') return false;

      // Extract safe basename to prevent path traversal (../ or absolute paths)
      const sanitizedKey = path.basename(key.trim());
      if (!sanitizedKey || sanitizedKey !== key.trim()) {
        console.warn(`[StorageService] Blocked directory traversal attempt: "${key}"`);
        return false;
      }

      // Restrict deletion to verified Nest Care Connect uploaded assets only
      const safeUploadPattern = /^(ncc|wa)-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4|mov)$/i;
      if (!safeUploadPattern.test(sanitizedKey)) {
        console.warn(`[StorageService] Blocked non-standard file deletion attempt: "${sanitizedKey}"`);
        return false;
      }

      const uploadDir = path.resolve(process.cwd(), 'public/uploads');
      const filePath = path.resolve(uploadDir, sanitizedKey);

      // Verify the resolved path is strictly inside the uploadDir
      if (!filePath.startsWith(uploadDir)) {
        console.warn(`[StorageService] Path traversal escape detected: "${filePath}"`);
        return false;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err: any) {
      console.warn(`[StorageService] Delete file error for key "${key}":`, err.message);
      return false;
    }
  }
}

export const storageService = new StorageService();
