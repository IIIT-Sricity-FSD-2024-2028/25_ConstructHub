import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../auth/jwt-auth.guard';
import { UsersRepository } from '../users/users.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { companyAccessBlockReason } from '../companies/company-access';

/**
 * Auth Middleware (Router-level)
 *
 * Applied ONLY on protected API routes.
 * 1. Verifies the signed JWT from the Authorization header (format: "Bearer <token>").
 * 2. Re-checks the account on EVERY request, so a deleted/locked user or a company that
 *    was rejected or deactivated loses access immediately instead of when the token expires.
 * 3. Takes role and companyId from the database record (not from the token) so they cannot be stale.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepo: UsersRepository,
    private readonly companiesRepo: CompaniesRepository,
  ) {}

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

    let decoded: any;
    try {
      decoded = this.jwtService.verify(token, { secret: JWT_SECRET });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    const account = this.usersRepo.findById(decoded.sub);
    if (!account) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    if (account.status === 'inactive') {
      throw new ForbiddenException('Account is locked or inactive. Please contact admin.');
    }

    if (account.role !== 'superuser' && account.companyId) {
      const reason = companyAccessBlockReason(this.companiesRepo.findById(account.companyId));
      if (reason) throw new ForbiddenException(reason);
    }

    (req as any).user = {
      userId: account.id,
      role: account.role,
      companyId: account.companyId || '',
    };
    next();
  }
}
