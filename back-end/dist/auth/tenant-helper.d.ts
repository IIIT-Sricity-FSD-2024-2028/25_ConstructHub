import { UserContext } from './current-user.decorator';
export declare class TenantHelper {
    static isSuperuser(user?: UserContext): boolean;
    static isClient(user?: UserContext): boolean;
    static getAuthoritativeCompanyId(user?: UserContext, bodyCompanyId?: string): string;
    static validateCompanyAccess(user?: UserContext, resourceCompanyId?: string): void;
}
