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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("./projects.service");
const create_project_dto_1 = require("./create-project.dto");
const update_project_dto_1 = require("./update-project.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
const users_service_1 = require("../users/users.service");
let ProjectsController = class ProjectsController {
    service;
    usersService;
    constructor(service, usersService) {
        this.service = service;
        this.usersService = usersService;
    }
    validateProjectUserAssignments(dto, projectCompanyId) {
        if (!projectCompanyId)
            return;
        if (dto.managerId) {
            const manager = this.usersService.findOne(dto.managerId);
            if (manager.companyId && manager.companyId !== projectCompanyId) {
                throw new common_1.ForbiddenException(`Assigned Project Manager (${manager.name}) belongs to another company workspace.`);
            }
            if (manager.role !== 'project_manager') {
                throw new common_1.BadRequestException(`Assigned user (${manager.name}) must have the project_manager role (actual role: ${manager.role}).`);
            }
        }
        if (dto.clientId) {
            const clientUser = this.usersService.findOne(dto.clientId);
            if (clientUser.companyId && clientUser.companyId !== projectCompanyId) {
                throw new common_1.ForbiddenException(`Assigned Client (${clientUser.name}) belongs to another company workspace.`);
            }
            if (clientUser.role !== 'client') {
                throw new common_1.BadRequestException(`Assigned user (${clientUser.name}) must have the client role (actual role: ${clientUser.role}).`);
            }
        }
        if (dto.siteEngineerId) {
            const seUser = this.usersService.findOne(dto.siteEngineerId);
            if (seUser.companyId && seUser.companyId !== projectCompanyId) {
                throw new common_1.ForbiddenException(`Assigned Site Engineer (${seUser.name}) belongs to another company workspace.`);
            }
            if (seUser.role !== 'site_engineer') {
                throw new common_1.BadRequestException(`Assigned user (${seUser.name}) must have the site_engineer role (actual role: ${seUser.role}).`);
            }
        }
        if (dto.financeManagerId) {
            const fmUser = this.usersService.findOne(dto.financeManagerId);
            if (fmUser.companyId && fmUser.companyId !== projectCompanyId) {
                throw new common_1.ForbiddenException(`Assigned Finance Manager (${fmUser.name}) belongs to another company workspace.`);
            }
            if (fmUser.role !== 'finance_manager') {
                throw new common_1.BadRequestException(`Assigned user (${fmUser.name}) must have the finance_manager role (actual role: ${fmUser.role}).`);
            }
        }
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user) {
            return this.service.findAll();
        }
        if (tenant_helper_1.TenantHelper.isClient(user)) {
            return this.service.findAll().filter((p) => p.clientId === user.userId);
        }
        return this.service.findByCompanyId(user.companyId);
    }
    findOne(id, user) {
        const project = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (tenant_helper_1.TenantHelper.isClient(user)) {
                if (project.clientId !== user.userId) {
                    throw new common_1.ForbiddenException('Access denied. Client can only access assigned projects.');
                }
            }
            else {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, project.companyId);
            }
        }
        return project;
    }
    create(dto, user) {
        const companyId = tenant_helper_1.TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
        this.validateProjectUserAssignments(dto, companyId);
        const payload = { ...dto, companyId };
        return this.service.create(payload);
    }
    update(id, dto, user) {
        const existing = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, existing.companyId);
        }
        const companyId = tenant_helper_1.TenantHelper.isSuperuser(user)
            ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
            : (user ? user.companyId : existing.companyId);
        this.validateProjectUserAssignments(dto, companyId);
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
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve projects (Superuser: all, Tenant: company projects, Client: assigned projects)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of projects.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific project by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The project details.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new project (Company ID derived from authenticated token)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The project has been successfully created.', type: create_project_dto_1.CreateProjectDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or user assignment mismatch.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing project' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The project has been successfully updated.', type: update_project_dto_1.UpdateProjectDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or user assignment mismatch.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a project' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The project has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "remove", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, swagger_1.ApiTags)('projects'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService,
        users_service_1.UsersService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map