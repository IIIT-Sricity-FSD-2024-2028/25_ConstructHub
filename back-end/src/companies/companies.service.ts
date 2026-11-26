import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { CompaniesRepository, CompanyRecord } from './companies.repository';
import { RegisterCompanyDto } from './register-company.dto';
import { UsersRepository } from '../users/users.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { SUBSCRIPTION_PLANS, OVERAGE_RATES } from './subscription-plans';
import { getApprovalStatus } from './company-access';
import { today } from '../utils/ids';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly repo: CompaniesRepository,
    @Inject(forwardRef(() => UsersRepository))
    private readonly usersRepo: UsersRepository,
    @Inject(forwardRef(() => ProjectsRepository))
    private readonly projectsRepo: ProjectsRepository,
  ) {}

  private validateOwnerEmailDomain(ownerEmail?: string, domain?: string) {
    if (!ownerEmail || !domain) return;
    const emailDomain = ownerEmail.split('@')[1];
    if (!emailDomain || emailDomain.toLowerCase() !== domain.toLowerCase()) {
      throw new BadRequestException(
        `Owner email "${ownerEmail}" domain must match approved company domain "@${domain}".`,
      );
    }
  }

  findAll(): CompanyRecord[] {
    return this.repo.findAll();
  }

  findOneOrNull(id: string): CompanyRecord | null {
    return this.repo.findById(id) || null;
  }

  findOne(id: string): CompanyRecord {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Company record not found.');
    return record;
  }

  create(data: any): CompanyRecord {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('Payload cannot be empty.');
    }
    if (data.code && this.repo.findByCode(data.code)) {
      throw new BadRequestException(`Company code "${data.code}" is already registered.`);
    }
    if (data.domain && this.repo.findByDomain(data.domain)) {
      throw new BadRequestException(`Company domain "${data.domain}" is already registered.`);
    }
    if (data.ownerEmail && this.repo.findByOwnerEmail(data.ownerEmail)) {
      throw new BadRequestException(`Company owner email "${data.ownerEmail}" is already registered.`);
    }
    if (data.ownerEmail && data.domain) {
      this.validateOwnerEmailDomain(data.ownerEmail, data.domain);
    }
    const record: CompanyRecord = {
      ...data,
      plan: data.plan || 'Basic',
      billingCycle: data.billingCycle || 'monthly',
      subscriptionStatus: data.subscriptionStatus || 'active',
      overageEnabled: data.overageEnabled !== undefined ? data.overageEnabled : false,
      extraUsers: data.extraUsers || 0,
      extraProjects: data.extraProjects || 0,
      status: data.status || 'active',
      approvalStatus: data.approvalStatus || 'approved',
      createdAt: data.createdAt || today(),
    };
    return this.repo.create(record);
  }


  /** Superuser-only firm onboarding: creates an immediately approved company with full custom quotas + initial Company Admin. */
  onboardCompany(dto: any) {
    const { company, admin } = dto || {};
    if (!company || !admin) {
      throw new BadRequestException('Company and Admin details are required.');
    }
    const cCode = String(company.code || '').trim().toLowerCase();
    const cDomain = String(company.domain || '').trim().toLowerCase();
    const aEmail = String(admin.email || company.ownerEmail || '').trim().toLowerCase();
    const password = String(admin.password || '').trim() || 'password123';

    if (!cCode || !/^[a-z0-9_-]+$/.test(cCode)) {
      throw new BadRequestException('Company code must contain only lowercase letters, numbers, hyphens, or underscores.');
    }
    if (!cDomain) throw new BadRequestException('Approved company domain is required.');
    if (!aEmail) throw new BadRequestException('Company Admin email is required.');
    if (password.length < 6) throw new BadRequestException('Initial admin password must be at least 6 characters.');

    this.validateOwnerEmailDomain(aEmail, cDomain);

    if (this.repo.findByCode(cCode)) {
      throw new BadRequestException(`Company code "${cCode}" is already taken.`);
    }
    if (this.repo.findByDomain(cDomain)) {
      throw new BadRequestException(`Domain "${cDomain}" is already registered to another company.`);
    }
    if (this.usersRepo.findByEmail(aEmail)) {
      throw new BadRequestException(`Email "${aEmail}" is already registered.`);
    }

    const plan = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
    const extraUsers = Math.max(0, Number(company.extraUsers) || 0);
    const extraProjects = Math.max(0, Number(company.extraProjects) || 0);
    const baseQuota = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.Basic;
    const customUserLimit = company.customUserLimit !== undefined ? Number(company.customUserLimit) : baseQuota.userLimit + extraUsers;
    const customProjectLimit = company.customProjectLimit !== undefined ? Number(company.customProjectLimit) : baseQuota.projectLimit + extraProjects;

    const newCompany = this.repo.create({
      name: String(company.name || '').trim(),
      code: cCode,
      domain: cDomain,
      ownerEmail: aEmail,
      phone: company.phone?.trim() || '+91 98000 00000',
      plan,
      billingCycle: company.billingCycle === 'annual' ? 'annual' : 'monthly',
      subscriptionStatus: 'active',
      overageEnabled: !!company.overageEnabled,
      extraUsers,
      extraProjects,
      customUserLimit,
      customProjectLimit,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: today(),
    });

    try {
      const adminName = String(admin.name || `${newCompany.name} Admin`).trim();
      const newAdmin = this.usersRepo.create({
        name: adminName,
        email: aEmail,
        password,
        role: 'company_admin',
        companyId: newCompany.id,
        phone: admin.phone?.trim() || newCompany.phone,
        avatar: adminName.substring(0, 2).toUpperCase(),
        status: 'active',
        createdAt: today(),
      });

      return {
        message: 'Company onboarded and activated.',
        company: newCompany,
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      };
    } catch (error) {
      if (newCompany.id) this.repo.remove(newCompany.id);
      throw error;
    }
  }

  registerCompany(dto: RegisterCompanyDto) {
    const { company, admin } = dto;
    if (!company || !admin) {
      throw new BadRequestException('Company and Admin details are required.');
    }

    const cCode = company.code.trim().toLowerCase();
    const cDomain = company.domain.trim().toLowerCase();
    const aEmail = admin.email.trim().toLowerCase();

    // 1. Company Code Uniqueness
    if (this.repo.findByCode(cCode)) {
      throw new BadRequestException(`Company code "${cCode}" is already registered.`);
    }

    // 2. Company Domain Uniqueness
    if (this.repo.findByDomain(cDomain)) {
      throw new BadRequestException(`Company domain "${cDomain}" is already registered.`);
    }

    // 3. Admin Email / Owner Email Uniqueness
    if (this.usersRepo.findByEmail(aEmail)) {
      throw new BadRequestException(`Admin email "${aEmail}" is already registered.`);
    }
    if (this.repo.findByOwnerEmail(aEmail)) {
      throw new BadRequestException(`Company owner email "${aEmail}" is already registered.`);
    }

    // 4. Admin Email Domain Validation
    const emailDomain = aEmail.split('@')[1]?.toLowerCase();
    if (!emailDomain || emailDomain !== cDomain) {
      throw new BadRequestException(
        `Admin email domain (@${emailDomain || 'invalid'}) must match company domain (@${cDomain}).`,
      );
    }

    // 5. Create Company Record. Public self-registration is always PENDING until the platform admin
    //    approves it, and cannot set privileged fields (custom limits, overage, extras) - only a
    //    plan that really exists. The platform admin can adjust limits after approval.
    const requestedPlan = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
    const newCompany = this.repo.create({
      name: company.name.trim(),
      code: cCode,
      domain: cDomain,
      ownerEmail: aEmail,
      phone: company.phone?.trim() || '+91 98000 00000',
      plan: requestedPlan,
      billingCycle: company.billingCycle === 'annual' ? 'annual' : 'monthly',
      subscriptionStatus: 'active',
      overageEnabled: false,
      extraUsers: 0,
      extraProjects: 0,
      status: 'active',
      approvalStatus: 'pending',
      createdAt: today(),
    });

    // 6. Create Initial Company Admin User (with atomic rollback)
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
        createdAt: today(),
      });

      return {
        message: 'Registration received. Your company will be able to sign in once the platform administrator approves it.',
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
          approvalStatus: newCompany.approvalStatus,
        },
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      };
    } catch (error) {
      if (newCompany.id) this.repo.remove(newCompany.id);
      throw error;
    }
  }

  getPlatformRevenue() {
    const companies = this.repo.findAll();
    const activeCompaniesList = companies.filter(
      (c) => getApprovalStatus(c) === 'approved' && c.status === 'active' && (c.subscriptionStatus === 'active' || !c.subscriptionStatus),
    );

    let baseMrr = 0;
    let overageMrr = 0;

    const byPlan: Record<string, { companies: number; mrr: number }> = {
      Basic: { companies: 0, mrr: 0 },
      Pro: { companies: 0, mrr: 0 },
      Enterprise: { companies: 0, mrr: 0 },
    };

    const subscriptions = companies.map((c) => {
      const planName = c.plan && SUBSCRIPTION_PLANS[c.plan] ? c.plan : 'Basic';
      const planConfig = SUBSCRIPTION_PLANS[planName];
      const isAnnual = c.billingCycle === 'annual';
      const monthlyEquivalent = isAnnual
        ? Math.round((planConfig.annualPrice / 12) * 100) / 100
        : planConfig.monthlyPrice;

      const projectLimit = c.customProjectLimit || planConfig.projectLimit;
      const userLimit = c.customUserLimit || planConfig.userLimit;
      let extraUsersCount = 0;
      let extraProjectsCount = 0;
      if (c.overageEnabled) {
        const actualUsersCount = this.usersRepo && c.id ? this.usersRepo.findByCompanyId(c.id).length : 0;
        const actualProjectsCount = this.projectsRepo && c.id ? this.projectsRepo.findByCompanyId(c.id).length : 0;
        extraUsersCount = Math.max(0, actualUsersCount - userLimit);
        extraProjectsCount = Math.max(0, actualProjectsCount - projectLimit);
        if (c.extraUsers && c.extraUsers > extraUsersCount) extraUsersCount = c.extraUsers;
        if (c.extraProjects && c.extraProjects > extraProjectsCount) extraProjectsCount = c.extraProjects;
      }
      const companyOverageRev =
        extraUsersCount * OVERAGE_RATES.extraUserMonthly +
        extraProjectsCount * OVERAGE_RATES.extraProjectMonthly;

      const isActive = getApprovalStatus(c) === 'approved' && c.status === 'active' && (c.subscriptionStatus === 'active' || !c.subscriptionStatus);

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
        approvalStatus: getApprovalStatus(c),
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

  getCompanySubscription(id: string) {
    const company = this.findOne(id);
    const planName = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
    const planConfig = SUBSCRIPTION_PLANS[planName];

    const isAnnual = company.billingCycle === 'annual';
    const baseMonthlyPrice = isAnnual
      ? Math.round((planConfig.annualPrice / 12) * 100) / 100
      : planConfig.monthlyPrice;

    const projectLimit = company.customProjectLimit || planConfig.projectLimit;
    const userLimit = company.customUserLimit || planConfig.userLimit;

    let extraUsers = 0;
    let extraProjects = 0;
    if (company.overageEnabled) {
      const actualUsersCount = this.usersRepo ? this.usersRepo.findByCompanyId(id).length : 0;
      const actualProjectsCount = this.projectsRepo ? this.projectsRepo.findByCompanyId(id).length : 0;
      extraUsers = Math.max(0, actualUsersCount - userLimit);
      extraProjects = Math.max(0, actualProjectsCount - projectLimit);
      if (company.extraUsers && company.extraUsers > extraUsers) {
        extraUsers = company.extraUsers;
      }
      if (company.extraProjects && company.extraProjects > extraProjects) {
        extraProjects = company.extraProjects;
      }
    }

    const userOverageFee = extraUsers * OVERAGE_RATES.extraUserMonthly;
    const projectOverageFee = extraProjects * OVERAGE_RATES.extraProjectMonthly;
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
        userLimit,
        projectLimit,
      },
      billingCycle: company.billingCycle || 'monthly',
      subscriptionStatus: company.subscriptionStatus || 'active',
      overageEnabled: !!company.overageEnabled,
      extraUsers,
      extraProjects,
      userOverageFee,
      projectOverageFee,
      overageRates: OVERAGE_RATES,
      baseMonthlyPrice,
      overageRevenue,
      totalMonthlyFee,
      subscriptionStartedAt: company.subscriptionStartedAt || company.createdAt || '2026-01-01',
      nextBillingDate: company.nextBillingDate || '2026-04-01',
    };
  }

  toggleOverage(id: string, overageEnabled: boolean, usagePatch?: any): CompanyRecord {
    const existing = this.findOne(id);
    const planName = existing.plan && SUBSCRIPTION_PLANS[existing.plan] ? existing.plan : 'Basic';
    const planConfig = SUBSCRIPTION_PLANS[planName];
    const projectLimit = existing.customProjectLimit || planConfig.projectLimit;
    const userLimit = existing.customUserLimit || planConfig.userLimit;

    let extraUsers = 0;
    let extraProjects = 0;
    if (overageEnabled) {
      if (usagePatch?.extraUsers !== undefined) {
        extraUsers = Math.max(0, Number(usagePatch.extraUsers) || 0);
      } else if (this.usersRepo) {
        const actualUsersCount = this.usersRepo.findByCompanyId(id).length;
        extraUsers = Math.max(0, actualUsersCount - userLimit);
      }
      if (usagePatch?.extraProjects !== undefined) {
        extraProjects = Math.max(0, Number(usagePatch.extraProjects) || 0);
      } else if (this.projectsRepo) {
        const actualProjectsCount = this.projectsRepo.findByCompanyId(id).length;
        extraProjects = Math.max(0, actualProjectsCount - projectLimit);
      }
    }

    const updated = this.repo.update(id, {
      overageEnabled: !!overageEnabled,
      extraUsers,
      extraProjects,
    });
    if (!updated) throw new NotFoundException('Company record not found.');
    return updated;
  }

  update(id: string, data: any): CompanyRecord {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('Payload cannot be empty.');
    }

    if (data.code && data.code.trim().toLowerCase() !== existing.code.toLowerCase()) {
      const dupCode = this.repo.findByCode(data.code.trim());
      if (dupCode && dupCode.id !== id) {
        throw new BadRequestException(`Company code "${data.code}" is already registered.`);
      }
    }

    if (data.domain && data.domain.trim().toLowerCase() !== existing.domain.toLowerCase()) {
      const dupDomain = this.repo.findByDomain(data.domain.trim());
      if (dupDomain && dupDomain.id !== id) {
        throw new BadRequestException(`Company domain "${data.domain}" is already registered.`);
      }
    }

    if (data.ownerEmail && data.ownerEmail.trim().toLowerCase() !== existing.ownerEmail.toLowerCase()) {
      const dupEmail = this.repo.findByOwnerEmail(data.ownerEmail.trim());
      if (dupEmail && dupEmail.id !== id) {
        throw new BadRequestException(`Company owner email "${data.ownerEmail}" is already registered.`);
      }
    }

    const targetDomain = data.domain || existing.domain;
    const targetEmail = data.ownerEmail || existing.ownerEmail;
    if (targetEmail && targetDomain) {
      this.validateOwnerEmailDomain(targetEmail, targetDomain);
    }

    const updated = this.repo.update(id, data);
    if (!updated) throw new NotFoundException('Company record not found.');
    return updated;
  }

  /** Platform admin decision on a newly registered company. */
  setApproval(id: string, decision: string, reason: string | undefined, reviewerId: string): CompanyRecord {
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new BadRequestException('decision must be "approved" or "rejected".');
    }
    const existing = this.findOne(id);
    if (decision === 'rejected' && !(reason && reason.trim())) {
      throw new BadRequestException('Please provide a reason when rejecting a company.');
    }
    const updated = this.repo.update(existing.id as string, {
      approvalStatus: decision,
      approvalReason: decision === 'rejected' ? reason!.trim() : '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    });
    if (!updated) throw new NotFoundException('Company record not found.');
    return updated;
  }

  /** Fields a company admin may change on their own company. Everything else is superuser-only. */
  static readonly SELF_SERVICE_FIELDS = ['name', 'phone', 'plan', 'billingCycle'];

  remove(id: string): boolean {
    const company = this.findOne(id);
    // Projects carry bills, payments and the clients' history: a company that still has them cannot disappear.
    const projects = this.projectsRepo.findByCompanyId(id);
    if (projects.length > 0) {
      throw new ConflictException(`${company.name} still has ${projects.length} project(s). Deactivate the company instead, so its records stay intact.`);
    }
    // No projects yet: its staff accounts go with it (nobody is left pointing at a company that no longer exists).
    this.usersRepo.findByCompanyId(id).forEach((u: any) => this.usersRepo.remove(u.id));
    return this.repo.remove(id);
  }
}
