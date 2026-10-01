"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOADS_DIR = exports.UPLOADS_SERVE_PATH = exports.multerConfig = void 0;
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const common_1 = require("@nestjs/common");
const UPLOADS_DIR = (0, path_1.join)(process.cwd(), 'uploads');
exports.UPLOADS_DIR = UPLOADS_DIR;
if (!(0, fs_1.existsSync)(UPLOADS_DIR)) {
    (0, fs_1.mkdirSync)(UPLOADS_DIR, { recursive: true });
}
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: (req, _file, cb) => {
            const companyId = req.user?.companyId || 'general';
            const dateFolder = new Date().toISOString().slice(0, 10);
            const dest = (0, path_1.join)(UPLOADS_DIR, companyId, dateFolder);
            if (!(0, fs_1.existsSync)(dest))
                (0, fs_1.mkdirSync)(dest, { recursive: true });
            cb(null, dest);
        },
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
            const ext = (0, path_1.extname)(file.originalname).toLowerCase();
            cb(null, `${unique}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(new common_1.BadRequestException(`File type not allowed: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are accepted.`), false);
            return;
        }
        cb(null, true);
    },
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 10,
    },
};
exports.UPLOADS_SERVE_PATH = '/uploads';
//# sourceMappingURL=upload.config.js.map