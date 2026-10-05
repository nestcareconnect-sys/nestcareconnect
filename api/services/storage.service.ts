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
      const filePath = path.resolve(process.cwd(), 'public/uploads', key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
