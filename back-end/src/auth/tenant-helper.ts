import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserContext } from './current-user.decorator';

export class TenantHelper {
  static isSuperuser(user?: UserContext): boolean {
    return !!(user && user.role === 'superuser');
  }

  static isClient(user?: UserContext): boolean {
    return !!(user && user.role === 'client');
  }

  /**
   * Derive the authoritative company ID for a new resource.
   * Non-superusers MUST use their JWT companyId. Body companyId is ignored/overridden.
   */
  static getAuthoritativeCompanyId(user?: UserContext, bodyCompanyId?: string): string {
    if (this.isSuperuser(user)) {
      return bodyCompanyId || user?.companyId || '';
    }
    if (!user || !user.companyId) {
      throw new ForbiddenException('User is not associated with an active company tenant.');
    }
    return user.companyId;
  }

  /**
   * Enforce that a resource belongs to the caller's company workspace.
   * Superusers bypass this check.
   */
  static validateCompanyAccess(user?: UserContext, resourceCompanyId?: string): void {
    if (this.isSuperuser(user)) return;
    if (!user || !user.companyId) {
      throw new ForbiddenException('User is not associated with an active company tenant.');
    }
    if (resourceCompanyId && resourceCompanyId !== user.companyId) {
      throw new ForbiddenException('Access denied. Resource belongs to another company workspace.');
    }
  }
}
