import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

/** Receipts are financial documents: stored privately and served only through an authenticated endpoint. */
export const EXPENSE_RECEIPTS_DIR = join(process.cwd(), 'private-uploads', 'expenses');
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MAX_RECEIPTS_PER_UPLOAD = 5;
export const MAX_RECEIPTS_PER_EXPENSE = 8;

export const expenseUploadConfig = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: (e: Error | null, dest: string) => void) => {
      const id = /^E\d+$/.test(String(req.params?.id)) ? req.params.id : 'invalid';
      const dest = join(EXPENSE_RECEIPTS_DIR, id);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req: any, file: any, cb: (e: Error | null, name: string) => void) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')}`);
    },
  }),
  fileFilter: (_req: any, file: any, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED.includes(file.mimetype)) cb(new BadRequestException(`File type not allowed: ${file.mimetype}. Upload a PDF or an image (JPG, PNG, WebP).`), false);
    else cb(null, true);
  },
  limits: { fileSize: MAX_RECEIPT_BYTES, files: MAX_RECEIPTS_PER_UPLOAD },
};
