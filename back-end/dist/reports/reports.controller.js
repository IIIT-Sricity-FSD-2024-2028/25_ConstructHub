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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const reports_service_1 = require("./reports.service");
const create_report_dto_1 = require("./create-report.dto");
const update_report_dto_1 = require("./update-report.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const upload_config_1 = require("../middleware/upload.config");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const tenant_helper_1 = require("../auth/tenant-helper");
const projects_service_1 = require("../projects/projects.service");
let ReportsController = class ReportsController {
    service;
    projectsService;
    constructor(service, projectsService) {
        this.service = service;
        this.projectsService = projectsService;
    }
    findAll(user) {
        if (tenant_helper_1.TenantHelper.isSuperuser(user) || !user) {
            return this.service.findAll();
        }
        if (tenant_helper_1.TenantHelper.isClient(user)) {
            const clientProjects = this.projectsService.findAll().filter(p => p.clientId === user.userId);
            const projectIds = new Set(clientProjects.map(p => p.id));
            return this.service.findAll().filter(r => projectIds.has(r.projectId));
        }
        return this.service.findByCompanyId(user.companyId);
    }
    findOne(id, user) {
        const report = this.service.findOne(id);
        if (!tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            if (tenant_helper_1.TenantHelper.isClient(user)) {
                const clientProjects = this.projectsService.findAll().filter(p => p.clientId === user.userId);
                const projectIds = new Set(clientProjects.map(p => p.id));
                if (!projectIds.has(report.projectId)) {
                    throw new common_1.ForbiddenException('Access denied. Client can only view reports for assigned projects.');
                }
            }
            else {
                tenant_helper_1.TenantHelper.validateCompanyAccess(user, report.companyId);
            }
        }
        return report;
    }
    create(dto, user) {
        const companyId = tenant_helper_1.TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
        const payload = { ...dto, companyId };
        return this.service.create(payload);
    }
    uploadPhotos(files, req, user, reportId, projectId) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files were uploaded. Please attach at least one photo.');
        }
        if (reportId && !tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            const report = this.service.findOne(reportId);
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, report.companyId);
        }
        if (projectId && !tenant_helper_1.TenantHelper.isSuperuser(user) && user) {
            const project = this.projectsService.findOne(projectId);
            tenant_helper_1.TenantHelper.validateCompanyAccess(user, project.companyId);
        }
        const photoUrls = files.map((f) => {
            const rel = f.path.replace(/\\/g, '/').split('uploads/')[1];
            return `/uploads/${rel}`;
        });
        return {
            message: `${files.length} file(s) uploaded successfully.`,
            count: files.length,
            photoUrls,
            files: files.map((f) => ({
                originalName: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
                url: `/uploads/${f.path.replace(/\\/g, '/').split('uploads/')[1]}`,
            })),
        };
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
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve reports (Superuser: all, Tenant: company reports, Client: assigned project reports)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of reports.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific report by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The report details.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Report not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new report (Company ID derived from authenticated token)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The report has been successfully created.', type: create_report_dto_1.CreateReportDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_report_dto_1.CreateReportDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 10, upload_config_1.multerConfig)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        description: 'Upload up to 10 site report photos (JPEG, PNG, WebP, GIF — max 5 MB each).',
        schema: {
            type: 'object',
            properties: {
                photos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                reportId: { type: 'string', description: 'Optional report ID to verify authorization' },
                projectId: { type: 'string', description: 'Optional project ID to verify authorization' },
            },
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload site report photos with tenant authorization check' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Files uploaded successfully. Returns array of URLs.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file type or size.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden.' }),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)('reportId')),
    __param(4, (0, common_1.Body)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, current_user_decorator_1.UserContext, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "uploadPhotos", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager', 'site_engineer'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The report has been successfully updated.', type: update_report_dto_1.UpdateReportDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Report not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_report_dto_1.UpdateReportDto, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('superuser', 'company_admin', 'project_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The report has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Report not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "remove", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        projects_service_1.ProjectsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map