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

  /**
   * Clients are platform-level users (no companyId). The companies they deal with are the
   * companies that own projects assigned to them.
   */
  static clientCompanyIds(user: UserContext | undefined, projects: any[]): string[] {
    if (!user) return [];
    return Array.from(
      new Set(
        projects
          .filter((p) => p.clientId === user.userId && p.companyId)
          .map((p) => p.companyId as string),
      ),
    );
  }

  /**
   * Company a client's record (message, notification) is filed under.
   * The client must have a project with that company; a body value is only accepted if it matches.
   */
  static resolveClientCompanyId(user: UserContext | undefined, bodyCompanyId: string | undefined, projects: any[]): string {
    const allowed = this.clientCompanyIds(user, projects);
    if (allowed.length === 0) {
      throw new ForbiddenException('You have no active project with a company yet.');
    }
    if (bodyCompanyId && allowed.includes(bodyCompanyId)) return bodyCompanyId;
    return allowed[0];
  }
}
