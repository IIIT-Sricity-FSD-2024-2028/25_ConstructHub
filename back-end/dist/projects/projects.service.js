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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const projects_repository_1 = require("./projects.repository");
const companies_repository_1 = require("../companies/companies.repository");
const subscription_plans_1 = require("../companies/subscription-plans");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
let ProjectsService = class ProjectsService {
    repo;
    usersService;
    companiesRepo;
    constructor(repo, usersService, companiesRepo) {
        this.repo = repo;
        this.usersService = usersService;
        this.companiesRepo = companiesRepo;
    }
    findAll() { return this.repo.findAll(); }
    findByCompanyId(companyId) { return this.repo.findByCompanyId(companyId); }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Projects record not found.');
        return record;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        if (data.companyId) {
            const company = this.companiesRepo.findById(data.companyId);
            if (company) {
                const currentProjects = this.repo.findByCompanyId(data.companyId).length;
                const planName = company.plan && subscription_plans_1.SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
                const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
                const projectLimit = company.customProjectLimit || planConfig.projectLimit;
                if (currentProjects >= projectLimit) {
                    if (!company.overageEnabled) {
                        throw new common_1.ForbiddenException(`Project limit reached (${currentProjects}/${projectLimit}) for your ${planName} plan. Please upgrade to Pro or enable overage billing.`);
                    }
                    else if (company.id) {
                        const extraCount = currentProjects + 1 - projectLimit;
                        this.companiesRepo.update(company.id, { extraProjects: extraCount });
                    }
                }
            }
        }
        this.validateBusinessRules(data);
        const record = { ...data, id: data.id || (0, crypto_1.randomUUID)() };
        return this.repo.create(record);
    }
    update(id, data) {
        const existing = this.findOne(id);
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        const merged = { ...existing, ...data };
        this.validateBusinessRules(merged);
        return this.repo.update(id, data);
    }
    validateBusinessRules(data) {
        if (data.budget !== undefined && data.spent !== undefined && data.spent > data.budget) {
            throw new common_1.BadRequestException('Spent amount cannot exceed total budget.');
        }
        if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            if (start > end) {
                throw new common_1.BadRequestException('End date cannot be before start date.');
            }
        }
    }
    remove(id) {
        const project = this.findOne(id);
        const removed = this.repo.remove(id);
        if (removed && project.companyId) {
            const company = this.companiesRepo.findById(project.companyId);
            if (company) {
                const planName = company.plan && subscription_plans_1.SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
                const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
                const projectLimit = company.customProjectLimit || planConfig.projectLimit;
                const currentProjects = this.repo.findByCompanyId(project.companyId).length;
                this.companiesRepo.update(project.companyId, {
                    extraProjects: company.overageEnabled ? Math.max(0, currentProjects - projectLimit) : 0,
                });
            }
        }
        if (project && project.clientId) {
            const remaining = this.repo.findAll().filter(p => p.clientId === project.clientId);
            if (remaining.length === 0) {
                try {
                    this.usersService.update(project.clientId, { status: 'inactive' });
                }
                catch (e) {
                }
            }
        }
        return removed;
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => companies_repository_1.CompaniesRepository))),
    __metadata("design:paramtypes", [projects_repository_1.ProjectsRepository,
        users_service_1.UsersService,
        companies_repository_1.CompaniesRepository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map