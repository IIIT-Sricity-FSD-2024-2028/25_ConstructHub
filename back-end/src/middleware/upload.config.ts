import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// ─── Upload Directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Allowed MIME types & limits ─────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file

/**
 * Tenant-aware Multer configuration for site report photo uploads.
 *
 * - Saves files to: <cwd>/uploads/<companyId>/<YYYY-MM-DD>/<timestamp>-<random>.<ext>
 * - Validates:      JPEG, PNG, WebP, GIF (rejects executables/scripts)
 * - Max size:       5 MB per file
 * - Max files:      10 per request
 */
export const multerConfig = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: (e: Error | null, dest: string) => void) => {
      const companyId = req.user?.companyId || 'general';
      const dateFolder = new Date().toISOString().slice(0, 10);
      const dest = join(UPLOADS_DIR, companyId, dateFolder);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req: any, file: any, cb: (e: Error | null, name: string) => void) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${unique}${ext}`);
    },
  }),

  fileFilter: (
    _req: any,
    file: any,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(
        new BadRequestException(
          `File type not allowed: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are accepted.`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },

  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10,
  },
};

export const UPLOADS_SERVE_PATH = '/uploads';
export { UPLOADS_DIR };
