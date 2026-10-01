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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("./tasks.service");
const create_task_dto_1 = require("./create-task.dto");
const update_task_dto_1 = require("./update-task.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
let TasksController = class TasksController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user) {
            return this.service.findAll();
        }
        if (tenant_helper_1.TenantHelper.isClient(user)) {
            throw new common_1.ForbiddenException('Clients do not have access to internal site tasks.');
        }
        return this.service.findByCompanyId(user.companyId);
    }
    findOne(id, user) {
        if (tenant_helper_1.TenantHelper.isClient(user)) {
            throw new common_1.ForbiddenException('Clients do not have access to internal site tasks.');
        }
        const task = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, task.companyId);
        }
        return task;
    }
    create(dto, user) {
        const companyId = tenant_helper_1.TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
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
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve tasks (Superuser: all, Tenant: company tasks)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of tasks.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific task by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The task details.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new task (Company ID derived from authenticated token)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The task has been successfully created.', type: create_task_dto_1.CreateTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_task_dto_1.CreateTaskDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing task' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The task has been successfully updated.', type: update_task_dto_1.UpdateTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_task_dto_1.UpdateTaskDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a task' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The task has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "remove", null);
exports.TasksController = TasksController = __decorate([
    (0, swagger_1.ApiTags)('tasks'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('tasks'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map