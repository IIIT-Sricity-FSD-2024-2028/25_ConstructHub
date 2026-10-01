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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const companies_repository_1 = require("./companies.repository");
const users_repository_1 = require("../users/users.repository");
const subscription_plans_1 = require("./subscription-plans");
let CompaniesService = class CompaniesService {
    repo;
    usersRepo;
    constructor(repo, usersRepo) {
        this.repo = repo;
        this.usersRepo = usersRepo;
    }
    validateOwnerEmailDomain(ownerEmail, domain) {
        if (!ownerEmail || !domain)
            return;
        const emailDomain = ownerEmail.split('@')[1];
        if (!emailDomain || emailDomain.toLowerCase() !== domain.toLowerCase()) {
            throw new common_1.BadRequestException(`Owner email "${ownerEmail}" domain must match approved company domain "@${domain}".`);
        }
    }
    findAll() {
        return this.repo.findAll();
    }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Company record not found.');
        return record;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('Payload cannot be empty.');
        }
        if (data.code && this.repo.findByCode(data.code)) {
            throw new common_1.BadRequestException(`Company code "${data.code}" is already registered.`);
        }
        if (data.domain && this.repo.findByDomain(data.domain)) {
            throw new common_1.BadRequestException(`Company domain "${data.domain}" is already registered.`);
        }
        if (data.ownerEmail && this.repo.findByOwnerEmail(data.ownerEmail)) {
            throw new common_1.BadRequestException(`Company owner email "${data.ownerEmail}" is already registered.`);
        }
        if (data.ownerEmail && data.domain) {
            this.validateOwnerEmailDomain(data.ownerEmail, data.domain);
        }
        const record = {
            ...data,
            plan: data.plan || 'Basic',
            billingCycle: data.billingCycle || 'monthly',
            subscriptionStatus: data.subscriptionStatus || 'active',
            overageEnabled: data.overageEnabled !== undefined ? data.overageEnabled : false,
            extraUsers: data.extraUsers || 0,
            extraProjects: data.extraProjects || 0,
            status: data.status || 'active',
            createdAt: data.createdAt || new Date().toISOString().split('T')[0],
        };
        return this.repo.create(record);
    }
    registerCompany(dto) {
        const { company, admin } = dto;
        if (!company || !admin) {
            throw new common_1.BadRequestException('Company and Admin details are required.');
        }
        const cCode = company.code.trim().toLowerCase();
        const cDomain = company.domain.trim().toLowerCase();
        const aEmail = admin.email.trim().toLowerCase();
        if (this.repo.findByCode(cCode)) {
            throw new common_1.BadRequestException(`Company code "${cCode}" is already registered.`);
        }
        if (this.repo.findByDomain(cDomain)) {
            throw new common_1.BadRequestException(`Company domain "${cDomain}" is already registered.`);
        }
        if (this.usersRepo.findByEmail(aEmail)) {
            throw new common_1.BadRequestException(`Admin email "${aEmail}" is already registered.`);
        }
        if (this.repo.findByOwnerEmail(aEmail)) {
            throw new common_1.BadRequestException(`Company owner email "${aEmail}" is already registered.`);
        }
        const emailDomain = aEmail.split('@')[1]?.toLowerCase();
        if (!emailDomain || emailDomain !== cDomain) {
            throw new common_1.BadRequestException(`Admin email domain (@${emailDomain || 'invalid'}) must match company domain (@${cDomain}).`);
        }
        const newCompany = this.repo.create({
            name: company.name.trim(),
            code: cCode,
            domain: cDomain,
            ownerEmail: aEmail,
            phone: company.phone?.trim() || '+91 98000 00000',
            plan: company.plan || 'Basic',
            billingCycle: 'monthly',
            subscriptionStatus: 'active',
            overageEnabled: false,
            extraUsers: 0,
            extraProjects: 0,
            status: 'active',
            createdAt: new Date().toISOString().split('T')[0],
        });
        try {
            const newAdmin = this.usersRepo.create({
                name: admin.name.trim(),
                email: aEmail,
                password: admin.password,
                role: 'company_admin',
                companyId: newCompany.id,
                phone: admin.phone?.trim() || '+91 98000 00000',
                avatar: admin.name.trim().substring(0, 2).toUpperCase(),
                status: 'active',
                createdAt: new Date().toISOString().split('T')[0],
            });
            return {
                message: 'Company registered successfully',
                company: {
                    id: newCompany.id,
                    name: newCompany.name,
                    code: newCompany.code,
                    domain: newCompany.domain,
                    plan: newCompany.plan,
                    billingCycle: newCompany.billingCycle,
                    subscriptionStatus: newCompany.subscriptionStatus,
                    overageEnabled: newCompany.overageEnabled,
                    status: newCompany.status,
                },
                admin: {
                    id: newAdmin.id,
                    name: newAdmin.name,
                    email: newAdmin.email,
                    role: newAdmin.role,
                },
            };
        }
        catch (error) {
            if (newCompany.id)
                this.repo.remove(newCompany.id);
            throw error;
        }
    }
    getPlatformRevenue() {
        const companies = this.repo.findAll();
        const activeCompaniesList = companies.filter((c) => c.status === 'active' && (c.subscriptionStatus === 'active' || !c.subscriptionStatus));
        let baseMrr = 0;
        let overageMrr = 0;
        const byPlan = {
            Basic: { companies: 0, mrr: 0 },
            Pro: { companies: 0, mrr: 0 },
            Enterprise: { companies: 0, mrr: 0 },
        };
        const subscriptions = companies.map((c) => {
            const planName = c.plan && subscription_plans_1.SUBSCRIPTION_PLANS[c.plan] ? c.plan : 'Basic';
            const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
            const isAnnual = c.billingCycle === 'annual';
            const monthlyEquivalent = isAnnual
                ? Math.round((planConfig.annualPrice / 12) * 100) / 100
                : planConfig.monthlyPrice;
            const extraUsersCount = c.overageEnabled ? (c.extraUsers || 0) : 0;
            const extraProjectsCount = c.overageEnabled ? (c.extraProjects || 0) : 0;
            const companyOverageRev = extraUsersCount * subscription_plans_1.OVERAGE_RATES.extraUserMonthly +
                extraProjectsCount * subscription_plans_1.OVERAGE_RATES.extraProjectMonthly;
            const isActive = c.status === 'active' && (c.subscriptionStatus === 'active' || !c.subscriptionStatus);
            if (isActive) {
                baseMrr += monthlyEquivalent;
                overageMrr += companyOverageRev;
                if (!byPlan[planName]) {
                    byPlan[planName] = { companies: 0, mrr: 0 };
                }
                byPlan[planName].companies += 1;
                byPlan[planName].mrr += monthlyEquivalent + companyOverageRev;
            }
            return {
                companyId: c.id,
                companyName: c.name,
                code: c.code,
                domain: c.domain,
                plan: planName,
                billingCycle: c.billingCycle || 'monthly',
                monthlyEquivalent,
                overageEnabled: !!c.overageEnabled,
                extraUsers: extraUsersCount,
                extraProjects: extraProjectsCount,
                overageRevenue: companyOverageRev,
                totalMonthlyRevenue: monthlyEquivalent + companyOverageRev,
                subscriptionStatus: c.subscriptionStatus || 'active',
                companyStatus: c.status || 'active',
                nextBillingDate: c.nextBillingDate || '2026-04-01',
            };
        });
        const totalMrr = baseMrr + overageMrr;
        const arr = totalMrr * 12;
        const activeCount = activeCompaniesList.length;
        const arpu = activeCount > 0 ? Math.round((totalMrr / activeCount) * 100) / 100 : 0;
        return {
            totalCompanies: companies.length,
            activeCompanies: activeCount,
            baseMrr,
            overageMrr,
            mrr: totalMrr,
            arr,
            averageRevenuePerCompany: arpu,
            byPlan,
            subscriptions,
        };
    }
    getCompanySubscription(id) {
        const company = this.findOne(id);
        const planName = company.plan && subscription_plans_1.SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
        const planConfig = subscription_plans_1.SUBSCRIPTION_PLANS[planName];
        const isAnnual = company.billingCycle === 'annual';
        const baseMonthlyPrice = isAnnual
            ? Math.round((planConfig.annualPrice / 12) * 100) / 100
            : planConfig.monthlyPrice;
        const extraUsers = company.overageEnabled ? (company.extraUsers || 0) : 0;
        const extraProjects = company.overageEnabled ? (company.extraProjects || 0) : 0;
        const userOverageFee = extraUsers * subscription_plans_1.OVERAGE_RATES.extraUserMonthly;
        const projectOverageFee = extraProjects * subscription_plans_1.OVERAGE_RATES.extraProjectMonthly;
        const overageRevenue = userOverageFee + projectOverageFee;
        const totalMonthlyFee = baseMonthlyPrice + overageRevenue;
        return {
            companyId: company.id,
            companyName: company.name,
            code: company.code,
            domain: company.domain,
            plan: planName,
            planConfig: {
                ...planConfig,
                userLimit: company.customUserLimit || planConfig.userLimit,
                projectLimit: company.customProjectLimit || planConfig.projectLimit,
            },
            billingCycle: company.billingCycle || 'monthly',
            subscriptionStatus: company.subscriptionStatus || 'active',
            overageEnabled: !!company.overageEnabled,
            extraUsers,
            extraProjects,
            userOverageFee,
            projectOverageFee,
            overageRates: subscription_plans_1.OVERAGE_RATES,
            baseMonthlyPrice,
            overageRevenue,
            totalMonthlyFee,
            subscriptionStartedAt: company.subscriptionStartedAt || company.createdAt || '2026-01-01',
            nextBillingDate: company.nextBillingDate || '2026-04-01',
        };
    }
    toggleOverage(id, overageEnabled, usagePatch) {
        const existing = this.findOne(id);
        const updated = this.repo.update(id, {
            overageEnabled: !!overageEnabled,
            extraUsers: overageEnabled ? Math.max(0, Number(usagePatch?.extraUsers) || 0) : 0,
            extraProjects: overageEnabled ? Math.max(0, Number(usagePatch?.extraProjects) || 0) : 0,
        });
        if (!updated)
            throw new common_1.NotFoundException('Company record not found.');
        return updated;
    }
    update(id, data) {
        const existing = this.findOne(id);
        if (!data || Object.keys(data).length === 0) {
            throw new common_1.BadRequestException('Payload cannot be empty.');
        }
        if (data.code && data.code.trim().toLowerCase() !== existing.code.toLowerCase()) {
            const dupCode = this.repo.findByCode(data.code.trim());
            if (dupCode && dupCode.id !== id) {
                throw new common_1.BadRequestException(`Company code "${data.code}" is already registered.`);
            }
        }
        if (data.domain && data.domain.trim().toLowerCase() !== existing.domain.toLowerCase()) {
            const dupDomain = this.repo.findByDomain(data.domain.trim());
            if (dupDomain && dupDomain.id !== id) {
                throw new common_1.BadRequestException(`Company domain "${data.domain}" is already registered.`);
            }
        }
        if (data.ownerEmail && data.ownerEmail.trim().toLowerCase() !== existing.ownerEmail.toLowerCase()) {
            const dupEmail = this.repo.findByOwnerEmail(data.ownerEmail.trim());
            if (dupEmail && dupEmail.id !== id) {
                throw new common_1.BadRequestException(`Company owner email "${data.ownerEmail}" is already registered.`);
            }
        }
        const targetDomain = data.domain || existing.domain;
        const targetEmail = data.ownerEmail || existing.ownerEmail;
        if (targetEmail && targetDomain) {
            this.validateOwnerEmailDomain(targetEmail, targetDomain);
        }
        const updated = this.repo.update(id, data);
        if (!updated)
            throw new common_1.NotFoundException('Company record not found.');
        return updated;
    }
    remove(id) {
        this.findOne(id);
        return this.repo.remove(id);
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_repository_1.UsersRepository))),
    __metadata("design:paramtypes", [companies_repository_1.CompaniesRepository,
        users_repository_1.UsersRepository])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map