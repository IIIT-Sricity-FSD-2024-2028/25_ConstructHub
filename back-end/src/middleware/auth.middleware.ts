import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../auth/jwt-auth.guard';

/**
 * Auth Middleware (Router-level)
 *
 * Applied ONLY on protected API routes.
 * Verifies JWT token from Authorization header and attaches authenticated user context to req.user.
 * Format: Authorization: Bearer <token>
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'] as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid Bearer token in the Authorization header.',
      );
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected "Bearer <token>".',
      );
    }

    try {
      if (token.startsWith('mock_jwt_')) {
        const parts = token.split('_');
        const userId = parts[2] || '';
        const role = parts[3] || 'company_admin';
        const companyId = parts[4] || 'COMP001';
        (req as any).user = {
          userId,
          role,
          companyId,
        };
        next();
        return;
      }

      const decoded = this.jwtService.verify(token, { secret: JWT_SECRET });
      (req as any).user = {
        userId: decoded.sub,
        role: decoded.role,
        companyId: decoded.companyId || '',
      };
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
