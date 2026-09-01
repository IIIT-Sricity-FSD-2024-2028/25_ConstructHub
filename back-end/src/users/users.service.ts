import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { SUBSCRIPTION_PLANS } from '../companies/subscription-plans';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    @Inject(forwardRef(() => CompaniesRepository))
    private readonly companiesRepo: CompaniesRepository,
  ) {}

  findAll() {
    return this.repo.findAll().map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  findByCompanyId(companyId: string) {
    return this.repo.findByCompanyId(companyId).map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  findByEmail(email: string) { return this.repo.findByEmail(email); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Users record not found.');
    const { password, ...safeUser } = record;
    return safeUser;
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    if (data.email) {
      const existing = this.repo.findByEmail(data.email.trim().toLowerCase());
      if (existing) {
        throw new BadRequestException(`Email address "${data.email}" is already registered.`);
      }
    }

    // Backend Subscription User Limit & Overage Enforcement
    if (data.companyId) {
      const company = this.companiesRepo.findById(data.companyId);
      if (company) {
        const currentUsers = this.repo.findByCompanyId(data.companyId).length;
        const planName = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
        const planConfig = SUBSCRIPTION_PLANS[planName];
        const userLimit = company.customUserLimit || planConfig.userLimit;

        if (currentUsers >= userLimit) {
          if (!company.overageEnabled) {
            throw new ForbiddenException(
              `User limit reached (${currentUsers}/${userLimit}) for your ${planName} plan. Please upgrade to Pro or enable overage billing.`,
            );
          } else if (company.id) {
            const extraCount = currentUsers + 1 - userLimit;
            this.companiesRepo.update(company.id, { extraUsers: extraCount });
          }
        }
      }
    }

    const record = { ...data, id: data.id || randomUUID() };
    return this.repo.create(record);
  }

  update(id: string, data: any) {
    this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    if (data.email) {
      const existing = this.repo.findByEmail(data.email.trim().toLowerCase());
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Email address "${data.email}" is already registered.`);
      }
    }
    return this.repo.update(id, data);
  }

  remove(id: string) {
    const user = this.findOne(id);
    const removed = this.repo.remove(id);

    if (removed && user.companyId) {
      const company = this.companiesRepo.findById(user.companyId);
      if (company) {
        const planName = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
        const planConfig = SUBSCRIPTION_PLANS[planName];
        const userLimit = company.customUserLimit || planConfig.userLimit;
        const currentUsers = this.repo.findByCompanyId(user.companyId).length;
        this.companiesRepo.update(user.companyId, {
          extraUsers: company.overageEnabled ? Math.max(0, currentUsers - userLimit) : 0,
        });
      }
    }

    return removed;
  }
}


