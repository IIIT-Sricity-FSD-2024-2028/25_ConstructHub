import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logAccess, logError } from '../utils/log-writer';

/**
 * Logging Middleware
 *
 * Logs EVERY HTTP request with timestamp, method, URL, status, duration, requestId, userId, role, companyId, IP.
 * Access logs → logs/access-YYYY-MM-DD.log
 * Error logs  → logs/error-YYYY-MM-DD.log (4xx / 5xx)
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const reqId = (req.headers['x-request-id'] as string) || '-';

    res.on('finish', () => {
      const ms = Date.now() - start;
      const { statusCode } = res;

      // Extract authenticated user context attached to req by JWT middleware
      const user = (req as any).user;
      const userId = user?.userId || 'anonymous';
      const role = user?.role || 'anonymous';
      const companyId = user?.companyId || 'none';

      const line = `${method} ${originalUrl} status=${statusCode} duration=${ms}ms requestId=${reqId} userId=${userId} role=${role} companyId=${companyId} ip=${ip}`;

      // Always write to access log
      logAccess(line);

      // Also write to error log for 4xx / 5xx
      if (statusCode >= 400) {
        logError(`[HTTP ${statusCode}] ${line}`);
      }

      // Console output
      const colour =
        statusCode >= 500 ? '\x1b[31m' : // red
        statusCode >= 400 ? '\x1b[33m' : // yellow
        statusCode >= 300 ? '\x1b[36m' : // cyan
        '\x1b[32m';                        // green
      console.log(`${colour}[HTTP]\x1b[0m ${line}`);
    });

    next();
  }
}
