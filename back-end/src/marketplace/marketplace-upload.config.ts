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


/**
 * Requirement documents (drawings, specifications) are commercially sensitive, so they are stored
 * OUTSIDE the public /uploads folder and only served through an authenticated endpoint.
 */
export const PRIVATE_UPLOADS_DIR = join(process.cwd(), 'private-uploads');
export const REQUIREMENT_DOCS_DIR = join(PRIVATE_UPLOADS_DIR, 'requirements');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_DOCS_PER_UPLOAD = 5;
export const MAX_DOCS_PER_REQUIREMENT = 10;

export const requirementUploadConfig = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: (e: Error | null, dest: string) => void) => {
      // Only allow ids that look like REQ001 so the folder name can never be a path trick.
      const id = /^REQ\d+$/.test(String(req.params?.id)) ? req.params.id : 'invalid';
      const dest = join(REQUIREMENT_DOCS_DIR, id);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req: any, file: any, cb: (e: Error | null, name: string) => void) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${SAFE_EXTENSIONS[file.mimetype] || '.bin'}`);
    },
  }),
  fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException(`File type not allowed: ${file.mimetype}. Upload PDF, Word, Excel or image files.`), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: MAX_DOC_SIZE_BYTES, files: MAX_DOCS_PER_UPLOAD },
};
