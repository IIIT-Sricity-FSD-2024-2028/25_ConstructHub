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
exports.InquiriesController = void 0;
const common_1 = require("@nestjs/common");
const inquiries_service_1 = require("./inquiries.service");
const create_inquiry_dto_1 = require("./create-inquiry.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let InquiriesController = class InquiriesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto) {
        return this.service.create(dto);
    }
    findAll(user) {
        if (!user || user.role !== 'superuser') {
            throw new common_1.ForbiddenException('Only Platform Super Admin can view platform inquiries.');
        }
        return this.service.findAll();
    }
    updateStatus(id, body, user) {
        if (!user || user.role !== 'superuser') {
            throw new common_1.ForbiddenException('Only Platform Super Admin can update platform inquiries.');
        }
        return this.service.updateStatus(id, body.status);
    }
};
exports.InquiriesController = InquiriesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Public Contact Us inquiry submission' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Inquiry successfully submitted.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation failed.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inquiry_dto_1.CreateInquiryDto]),
    __metadata("design:returntype", void 0)
], InquiriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('superuser'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve platform inquiries (Superuser ONLY)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of platform inquiries.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden for non-superuser.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], InquiriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('superuser'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', required: true, description: 'Bearer JWT token' }),
    (0, swagger_1.ApiOperation)({ summary: 'Update inquiry status (Superuser ONLY)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inquiry status updated.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden for non-superuser.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, current_user_decorator_1.UserContext]),
    __metadata("design:returntype", void 0)
], InquiriesController.prototype, "updateStatus", null);
exports.InquiriesController = InquiriesController = __decorate([
    (0, swagger_1.ApiTags)('inquiries'),
    (0, common_1.Controller)('inquiries'),
    __metadata("design:paramtypes", [inquiries_service_1.InquiriesService])
], InquiriesController);
//# sourceMappingURL=inquiries.controller.js.map