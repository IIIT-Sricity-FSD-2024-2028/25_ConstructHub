"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsController = void 0;
const common_1 = require("@nestjs/common");
const bills_service_1 = require("./bills.service");
const create_bill_dto_1 = require("./create-bill.dto");
const update_bill_dto_1 = require("./update-bill.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
let BillsController = class BillsController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user) {
            return this.service.findAll();
        }
        if (tenant_helper_1.TenantHelper.isClient(user)) {
            return this.service.findAll().filter((b) => b.clientId === user.userId);
        }
        return this.service.findByCompanyId(user.companyId);
    }
    findOne(id, user) {
        const bill = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (tenant_helper_1.TenantHelper.isClient(user)) {
                if (bill.clientId !== user.userId) {
                    throw new common_1.ForbiddenException('Access denied. Client can only view assigned bills.');
                }
            }
            else {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, bill.companyId);
            }
        }
        return bill;
    }
    create(dto, user) {
        const companyId = tenant_helper_1.TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
        const payload = { ...dto, companyId };
        return this.service.create(payload);
    }
    update(id, dto, user) {
        const existing = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (tenant_helper_1.TenantHelper.isClient(user)) {
                if (existing.clientId !== user.userId) {
                    throw new common_1.ForbiddenException('Access denied. Client can only update assigned bills.');
                }
            }
            else {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, existing.companyId);
            }
        }
        const companyId = tenant_helper_1.TenantHelper.isSuperuser(user)
            ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
            : (user ? user.companyId : existing.companyId);
        const payload = { ...dto, companyId };
        return this.service.update(id, payload);
    }
    remove(id, user) {
        const existing = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, existing.companyId);
        }
        return this.service.remove(id);
    }
};
exports.BillsController = BillsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve bills (Superuser: all, Tenant: company bills, Client: assigned bills)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of bills.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific bill by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The bill details.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Bill not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'finance_manager', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new bill (Company ID derived from authenticated token)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The bill has been successfully created.', type: create_bill_dto_1.CreateBillDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bill_dto_1.CreateBillDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'finance_manager', 'project_manager', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing bill' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The bill has been successfully updated.', type: update_bill_dto_1.UpdateBillDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Bill not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_bill_dto_1.UpdateBillDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'finance_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a bill' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The bill has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Bill not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], BillsController.prototype, "remove", null);
exports.BillsController = BillsController = __decorate([
    (0, swagger_1.ApiTags)('bills'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('bills'),
    __metadata("design:paramtypes", [bills_service_1.BillsService])
], BillsController);
//# sourceMappingURL=bills.controller.js.map