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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./create-user.dto");
const update_user_dto_1 = require("./update-user.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
const companies_service_1 = require("../companies/companies.service");
let UsersController = class UsersController {
    service;
    companiesService;
    constructor(service, companiesService) {
        this.service = service;
        this.companiesService = companiesService;
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user || !user.companyId) {
            return this.service.findAll();
        }
        return this.service.findByCompanyId(user.companyId);
    }
    findOne(id, user) {
        const targetUser = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (user.role === 'client' && id !== user.userId) {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, targetUser.companyId);
            }
            else {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, targetUser.companyId);
            }
        }
        return targetUser;
    }
    create(dto, user) {
        if (dto.role === 'superuser') {
            throw new common_1.ForbiddenException('Platform Superuser accounts cannot be created via user management.');
        }
        if (user && user.role === 'company_admin') {
            const allowedRoles = ['project_manager', 'site_engineer', 'finance_manager', 'client'];
            if (!allowedRoles.includes(dto.role)) {
                throw new common_1.ForbiddenException('Company Admin can only create Project Manager, Site Engineer, Finance Manager, and Client accounts.');
            }
        }
        const companyId = tenant_helper_1.TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
        if (companyId) {
            const company = this.companiesService.findOne(companyId);
            const emailDomain = dto.email.split('@')[1]?.toLowerCase();
            const targetDomain = company.domain.toLowerCase();
            if (!emailDomain || emailDomain !== targetDomain) {
                throw new common_1.BadRequestException(`User email domain (@${emailDomain || 'invalid'}) must match company domain (@${targetDomain}).`);
            }
        }
        const payload = { ...dto, companyId };
        return this.service.create(payload);
    }
    update(id, dto, user) {
        const targetUser = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (id !== user.userId) {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, targetUser.companyId);
            }
        }
        if (dto.role) {
            if (dto.role === 'superuser' && targetUser.role !== 'superuser') {
                throw new common_1.ForbiddenException('Cannot elevate account to Superuser role.');
            }
            if (user && user.role === 'company_admin' && dto.role !== targetUser.role && (dto.role === 'superuser' || dto.role === 'company_admin')) {
                throw new common_1.ForbiddenException('Company Admin cannot elevate account to Superuser or Company Admin roles.');
            }
        }
        const companyId = tenant_helper_1.TenantHelper.isSuperuser(user)
            ? (dto.companyId !== undefined ? dto.companyId : targetUser.companyId)
            : (user ? user.companyId : targetUser.companyId);
        if (dto.email && companyId) {
            const company = this.companiesService.findOne(companyId);
            const emailDomain = dto.email.split('@')[1]?.toLowerCase();
            const targetDomain = company.domain.toLowerCase();
            if (!emailDomain || emailDomain !== targetDomain) {
                throw new common_1.BadRequestException(`User email domain (@${emailDomain || 'invalid'}) must match company domain (@${targetDomain}).`);
            }
        }
        const payload = { ...dto, companyId };
        return this.service.update(id, payload);
    }
    remove(id, user) {
        const targetUser = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, targetUser.companyId);
        }
        return this.service.remove(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve users (Scoped by tenant companyId)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of users.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific user by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The user details.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user (Company ID & role validated by backend)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The user has been successfully created.', type: create_user_dto_1.CreateUserDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or domain mismatch.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The user has been successfully updated.', type: update_user_dto_1.UpdateUserDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or domain mismatch.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user (Superuser or Company Admin for company user)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The user has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: false, description: 'Bearer JWT token' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        companies_service_1.CompaniesService])
], UsersController);
//# sourceMappingURL=users.controller.js.map