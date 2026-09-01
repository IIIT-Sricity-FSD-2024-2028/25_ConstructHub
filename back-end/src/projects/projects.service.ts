import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { SUBSCRIPTION_PLANS } from '../companies/subscription-plans';
import { randomUUID } from 'crypto';

import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => CompaniesRepository))
    private readonly companiesRepo: CompaniesRepository,
  ) {}

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Projects record not found.');
    return record;
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');

    // Backend Subscription Project Limit & Overage Enforcement
    if (data.companyId) {
      const company = this.companiesRepo.findById(data.companyId);
      if (company) {
        const currentProjects = this.repo.findByCompanyId(data.companyId).length;
        const planName = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
        const planConfig = SUBSCRIPTION_PLANS[planName];
        const projectLimit = company.customProjectLimit || planConfig.projectLimit;

        if (currentProjects >= projectLimit) {
          if (!company.overageEnabled) {
            throw new ForbiddenException(
              `Project limit reached (${currentProjects}/${projectLimit}) for your ${planName} plan. Please upgrade to Pro or enable overage billing.`,
            );
          } else if (company.id) {
            const extraCount = currentProjects + 1 - projectLimit;
            this.companiesRepo.update(company.id, { extraProjects: extraCount });
          }
        }
      }
    }

    this.validateBusinessRules(data);
    const record = { ...data, id: data.id || randomUUID() };
    return this.repo.create(record);
  }

  update(id: string, data: any) {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    
    // Validate the resulting state after applying updates
    const merged = { ...existing, ...data };
    this.validateBusinessRules(merged);

    return this.repo.update(id, data);
  }

  private validateBusinessRules(data: any) {
    if (data.budget !== undefined && data.spent !== undefined && data.spent > data.budget) {
      throw new BadRequestException('Spent amount cannot exceed total budget.');
    }
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start > end) {
        throw new BadRequestException('End date cannot be before start date.');
      }
    }
  }

  remove(id: string) {
    const project = this.findOne(id);
    const removed = this.repo.remove(id);

    if (removed && project.companyId) {
      const company = this.companiesRepo.findById(project.companyId);
      if (company) {
        const planName = company.plan && SUBSCRIPTION_PLANS[company.plan] ? company.plan : 'Basic';
        const planConfig = SUBSCRIPTION_PLANS[planName];
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
        } catch (e) {
          // ignore if client record not found
        }
      }
    }
    return removed;
  }
}


