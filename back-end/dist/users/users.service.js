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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const users_repository_1 = require("./users.repository");
const companies_repository_1 = require("../companies/companies.repository");
const subscription_plans_1 = require("../companies/subscription-plans");
const crypto_1 = require("crypto");
let UsersService = class UsersService {
    repo;
    companiesRepo;
    constructor(repo, companiesRepo) {
        this.repo = repo;
        this.companiesRepo = companiesRepo;
    }
    findAll() {
        return this.repo.findAll().map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
    }
    findByCompanyId(companyId) {
        return this.repo.findByCompanyId(companyId).map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
    }
    findByEmail(email) { return this.repo.findByEmail(email); }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Users record not found.');
        const { password, ...safeUser } = record;
        return safeUser;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        if (data.email) {
            const existing = this.repo.findByEmail(data.email.trim().toLowerCase());
            if (existing) {
                throw new common_1.BadRequestException(`Email address "${data.email}" is already registered.`);
            }
        }
        if (data.companyId) {
            const company = this.companiesRepo.findById(data.companyId);
            if (company) {
                const currentUsers = this.repo.findByCompanyId(data.companyId).length;
                const planName = company.plan && subscription_plans_1.SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
                const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
                const userLimit = company.customUserLimit || planConfig.userLimit;
                if (currentUsers >= userLimit) {
                    if (!company.overageEnabled) {
                        throw new common_1.ForbiddenException(`User limit reached (${currentUsers}/${userLimit}) for your ${planName} plan. Please upgrade to Pro or enable overage billing.`);
                    }
                    else if (company.id) {
                        const extraCount = currentUsers + 1 - userLimit;
                        this.companiesRepo.update(company.id, { extraUsers: extraCount });
                    }
                }
            }
        }
        const record = { ...data, id: data.id || (0, crypto_1.randomUUID)() };
        return this.repo.create(record);
    }
    update(id, data) {
        this.findOne(id);
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        if (data.email) {
            const existing = this.repo.findByEmail(data.email.trim().toLowerCase());
            if (existing && existing.id !== id) {
                throw new common_1.BadRequestException(`Email address "${data.email}" is already registered.`);
            }
        }
        return this.repo.update(id, data);
    }
    remove(id) {
        const user = this.findOne(id);
        const removed = this.repo.remove(id);
        if (removed && user.companyId) {
            const company = this.companiesRepo.findById(user.companyId);
            if (company) {
                const planName = company.plan && subscription_plans_1.SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
                const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
                const userLimit = company.customUserLimit || planConfig.userLimit;
                const currentUsers = this.repo.findByCompanyId(user.companyId).length;
                this.companiesRepo.update(user.companyId, {
                    extraUsers: company.overageEnabled ? Math.max(0, currentUsers - userLimit) : 0,
                });
            }
        }
        return removed;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => companies_repository_1.CompaniesRepository))),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        companies_repository_1.CompaniesRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map