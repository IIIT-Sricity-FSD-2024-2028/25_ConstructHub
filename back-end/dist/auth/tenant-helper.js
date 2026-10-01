"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantHelper = void 0;
const common_1 = require("@nestjs/common");
class TenantHelper {
    static isSuperuser(user) {
        return !!(user && user.role === 'superuser');
    }
    static isClient(user) {
        return !!(user && user.role === 'client');
    }
    static getAuthoritativeCompanyId(user, bodyCompanyId) {
        if (this.isSuperuser(user)) {
            return bodyCompanyId || user?.companyId || '';
        }
        if (!user || !user.companyId) {
            throw new common_1.ForbiddenException('User is not associated with an active company tenant.');
        }
        return user.companyId;
    }
    static validateCompanyAccess(user, resourceCompanyId) {
        if (this.isSuperuser(user))
            return;
        if (!user || !user.companyId) {
            throw new common_1.ForbiddenException('User is not associated with an active company tenant.');
        }
        if (resourceCompanyId && resourceCompanyId !== user.companyId) {
            throw new common_1.ForbiddenException('Access denied. Resource belongs to another company workspace.');
        }
    }
}
exports.TenantHelper = TenantHelper;
//# sourceMappingURL=tenant-helper.js.map