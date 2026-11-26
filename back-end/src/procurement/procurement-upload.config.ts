import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// The stored extension comes from the accepted file type, never from the uploaded name.
const SAFE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'application/msword': '.doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};


/** Vendor delivery challans / invoices are financial documents: stored privately, served only to authorised staff. */
export const GRN_INVOICE_DIR = join(process.cwd(), 'private-uploads', 'goods-receipts');
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_INVOICE_BYTES = 5 * 1024 * 1024;

export const grnInvoiceUploadConfig = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: (e: Error | null, dest: string) => void) => {
      const id = /^GRN\d+$/.test(String(req.params?.id)) ? req.params.id : 'invalid';
      const dest = join(GRN_INVOICE_DIR, id);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req: any, file: any, cb: (e: Error | null, name: string) => void) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${SAFE_EXTENSIONS[file.mimetype] || '.bin'}`);
    },
  }),
  fileFilter: (_req: any, file: any, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED.includes(file.mimetype)) cb(new BadRequestException(`File type not allowed: ${file.mimetype}. Upload a PDF or an image (JPG, PNG, WebP).`), false);
    else cb(null, true);
  },
  limits: { fileSize: MAX_INVOICE_BYTES, files: 1 },
};
