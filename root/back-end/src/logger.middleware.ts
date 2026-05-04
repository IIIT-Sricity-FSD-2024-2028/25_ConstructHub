import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const userRole = req.headers['x-role'] || 'Unauthenticated';

    const isCRUD = method === 'POST' || method === 'PATCH' || method === 'DELETE';
    const isLogin = method === 'GET' && originalUrl.includes('/users');
    const shouldLog = isCRUD || isLogin;

    res.on('finish', () => {
      if (shouldLog) {
        const { statusCode } = res;
        this.logger.log(`[API Call] ${method} ${originalUrl} | Status: ${statusCode} | Role: ${userRole}`);
      }
    });

    next();
  }
}
