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
exports.RegisterCompanyDto = exports.AdminDetailsDto = exports.CompanyDetailsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CompanyDetailsDto {
    name;
    code;
    domain;
    phone;
    plan;
}
exports.CompanyDetailsDto = CompanyDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Apex Constructions Ltd' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompanyDetailsDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'apex' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompanyDetailsDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'apex.com' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompanyDetailsDto.prototype, "domain", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+91 98000 11111', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CompanyDetailsDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Enterprise', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CompanyDetailsDto.prototype, "plan", void 0);
class AdminDetailsDto {
    name;
    email;
    password;
    phone;
}
exports.AdminDetailsDto = AdminDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Siva Sathwik' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminDetailsDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'admin@apex.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AdminDetailsDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], AdminDetailsDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+91 98000 11111', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminDetailsDto.prototype, "phone", void 0);
class RegisterCompanyDto {
    company;
    admin;
}
exports.RegisterCompanyDto = RegisterCompanyDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CompanyDetailsDto),
    __metadata("design:type", CompanyDetailsDto)
], RegisterCompanyDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdminDetailsDto),
    __metadata("design:type", AdminDetailsDto)
], RegisterCompanyDto.prototype, "admin", void 0);
//# sourceMappingURL=register-company.dto.js.map