import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Allowed role values — any x-role header outside this list is rejected immediately
const VALID_ROLES = new Set([
  'superuser',
  'company_admin',
  'project_manager',
  'site_engineer',
  'finance_manager',
  'client',
]);

// Simple in-memory rate limiter (per IP, per minute)
// For production you'd use `express-rate-limit` with Redis; this is self-contained.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;          // max requests per window
const RATE_WINDOW_MS = 60_000;   // 1 minute window

/**
 * Security Middleware
 *
 * Applied on ALL routes. Responsibilities:
 *  1. Set secure HTTP headers manually (XSS, no-sniff, frame options, etc.)
 *     → equivalent to what Helmet does, done inline so no extra package is required.
 *  2. Rate-limit by IP (120 req/min) — blocks brute-force login attacks.
 *  3. Sanitise the x-role header — reject unknown roles before they hit any guard.
 *  4. Add X-Response-Time header on response finish.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // ── 1. Security Headers ────────────────────────────────────────────────
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* http://127.0.0.1:*;",
    );
    // Remove fingerprinting header
    res.removeHeader('X-Powered-By');

    // ── 2. Rate Limiting ──────────────────────────────────────────────────
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
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

    // ── 3. Sanitise x-role header ────────────────────────────────────────
    const role = req.headers['x-role'] as string | undefined;
    if (role && !VALID_ROLES.has(role)) {
      throw new ForbiddenException(`Invalid role: "${role}"`);
    }

    // ── 4. Response Time Header ──────────────────────────────────────────
    const start = Date.now();
    res.on('finish', () => {
      if (!res.headersSent) return;
      try {
        res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
      } catch {
        // Headers already sent — safe to ignore
      }
    });

    next();
  }
}
