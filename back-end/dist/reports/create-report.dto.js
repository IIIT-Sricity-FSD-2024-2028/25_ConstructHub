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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateReportDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class MaterialDto {
    name;
    qty;
    unit;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cement' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MaterialDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], MaterialDto.prototype, "qty", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'bags' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MaterialDto.prototype, "unit", void 0);
class CreateReportDto {
    companyId;
    title;
    projectId;
    projectName;
    submittedBy;
    submittedName;
    date;
    progress;
    status;
    workDone;
    issues;
    priority;
    materials;
    photos;
    photoUrls;
    photoDescription;
    remarks;
}
exports.CreateReportDto = CreateReportDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Company ID report belongs to', example: 'COMP001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Title of the report', example: 'Foundation Inspection Report' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the project', example: 'P001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Name of the project', example: 'Skyline Tower' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of user who submitted the report', example: 'U006' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "submittedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Name of user who submitted', example: 'Amit Sharma' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "submittedName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of the report', example: '2026-03-06' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Progress percentage', example: 75 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateReportDto.prototype, "progress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Status of the report/work', example: 'Completed' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Details of work done', example: 'Completed foundation inspection...' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "workDone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Issues encountered', example: 'Minor crack found...' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "issues", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Priority level', example: 'Medium' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'List of materials used', type: [MaterialDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MaterialDto),
    __metadata("design:type", Array)
], CreateReportDto.prototype, "materials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of photos attached', example: 8 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateReportDto.prototype, "photos", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Photo URLs or data URLs attached to the report',
        example: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E'],
        type: [String],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateReportDto.prototype, "photoUrls", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional description for uploaded photos', example: 'Foundation and slab progress photos.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "photoDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional remarks', example: 'Overall progress satisfactory.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateReportDto.prototype, "remarks", void 0);
//# sourceMappingURL=create-report.dto.js.map