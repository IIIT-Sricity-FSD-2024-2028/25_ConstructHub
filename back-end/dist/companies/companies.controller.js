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
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const companies_service_1 = require("./companies.service");
const create_company_dto_1 = require("./create-company.dto");
const register_company_dto_1 = require("./register-company.dto");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
let CompaniesController = class CompaniesController {
    companiesService;
    constructor(companiesService) {
        this.companiesService = companiesService;
    }
    registerCompany(dto) {
        return this.companiesService.registerCompany(dto);
    }
    getPlatformRevenue() {
        return this.companiesService.getPlatformRevenue();
    }
    getCompanySubscription(id, user) {
        tenant_helper_1.TenantHelper.validateCompanyAccess(user, id);
        return this.companiesService.getCompanySubscription(id);
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user || !user.companyId) {
            return this.companiesService.findAll();
        }
        try {
            const company = this.companiesService.findOne(user.companyId);
            return [company];
        }
        catch (e) {
            return [];
        }
    }
    findOne(id, user) {
        tenant_helper_1.TenantHelper.validateCompanyAccess(user, id);
        return this.companiesService.findOne(id);
    }
    create(dto) {
        return this.companiesService.create(dto);
    }
    toggleOverage(id, body, user) {
        tenant_helper_1.TenantHelper.validateCompanyAccess(user, id);
        const enabled = body && body.overageEnabled !== undefined ? body.overageEnabled : (body && body.enabled !== undefined ? body.enabled : true);
        return this.companiesService.toggleOverage(id, !!enabled, body);
    }
    update(id, body, user) {
        tenant_helper_1.TenantHelper.validateCompanyAccess(user, id);
        return this.companiesService.update(id, body);
    }
    remove(id) {
        this.companiesService.remove(id);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Public self-service company registration & initial admin onboarding' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company and initial admin created successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error, domain mismatch, or duplicate company/admin.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_company_dto_1.RegisterCompanyDto]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "registerCompany", null);
__decorate([
    (0, common_1.Get)('platform/revenue'),
    (0, roles_decorator_1.Roles)('superuser'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve Platform Revenue, MRR, ARR, and SaaS subscription metrics (Superuser only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Platform revenue metrics returned successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden for non-superusers.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "getPlatformRevenue", null);
__decorate([
    (0, common_1.Get)(':id/subscription'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company subscription & SaaS plan details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Subscription details returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "getCompanySubscription", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'List companies (Superuser sees all, tenant users see their company)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of companies returned successfully.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company details returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new construction company' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company created successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error or duplicate company code.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/overage'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle usage-based overage billing for a tenant' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Overage billing setting updated successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "toggleOverage", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update company details or self-service subscription plan' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company updated successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a company by ID (Superuser only)' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Company deleted successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "remove", null);
exports.CompaniesController = CompaniesController = __decorate([
    (0, swagger_1.ApiTags)('Companies'),
    (0, swagger_1.ApiHeader)({
        name: 'Authorization',
        description: 'Bearer JWT token',
        required: false,
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map