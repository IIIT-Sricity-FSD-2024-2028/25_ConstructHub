"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = void 0;
const common_1 = require("@nestjs/common");
const VALID_ROLES = new Set([
    'superuser',
    'company_admin',
    'project_manager',
    'site_engineer',
    'finance_manager',
    'client',
]);
const rateLimitMap = new Map();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
let SecurityMiddleware = class SecurityMiddleware {
    use(req, res, next) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* http://127.0.0.1:*;");
        res.removeHeader('X-Powered-By');
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';
        const now = Date.now();
        let entry = rateLimitMap.get(ip);
        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
            rateLimitMap.set(ip, entry);
        }
        entry.count++;
        res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - entry.count));
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());
        if (entry.count > RATE_LIMIT) {
            res.status(429).json({
                statusCode: 429,
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Maximum ${RATE_LIMIT} requests per minute.`,
                retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            });
            return;
        }
        const role = req.headers['x-role'];
        if (role && !VALID_ROLES.has(role)) {
            throw new common_1.ForbiddenException(`Invalid role: "${role}"`);
        }
        const start = Date.now();
        res.on('finish', () => {
            if (!res.headersSent)
                return;
            try {
                res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
            }
            catch {
            }
        });
        next();
    }
};
exports.SecurityMiddleware = SecurityMiddleware;
exports.SecurityMiddleware = SecurityMiddleware = __decorate([
    (0, common_1.Injectable)()
], SecurityMiddleware);
//# sourceMappingURL=security.middleware.js.map