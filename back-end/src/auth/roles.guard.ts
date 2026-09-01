import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // no roles required
    }
    const request = context.switchToHttp().getRequest();

    // Authenticated identity attached to request.user by JwtAuthGuard or AuthMiddleware
    const user = request.user;
    if (!user || !user.role) {
      throw new UnauthorizedException('Authentication required. Missing or invalid Bearer token.');
    }

    const userRole = user.role;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Insufficient permissions for role '${userRole}'`);
    }

    return true;
  }
}
