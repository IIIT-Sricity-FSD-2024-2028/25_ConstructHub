import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-constructhub-2026';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authentication required. Missing Authorization header.');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format. Expected Bearer <token>.');
    }

    try {
      const decoded = this.jwtService.verify(token, { secret: JWT_SECRET });
      request.user = {
        userId: decoded.sub,
        role: decoded.role,
        companyId: decoded.companyId || '',
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
