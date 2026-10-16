import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpensesRepository } from './expenses.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repo: ExpensesRepository,
    private readonly projectsRepo: ProjectsRepository,
  ) {}

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findByFinanceManager(companyId: string, financeManagerId: string) {
    const assignedProjectIds = new Set(
      this.projectsRepo
        .findByCompanyId(companyId)
        .filter((p) => p.financeManagerId === financeManagerId)
        .map((p) => p.id),
    );
    return this.repo.findByCompanyId(companyId).filter((e) => assignedProjectIds.has(e.projectId));
  }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Expenses record not found.');
    return record;
  }

  private recalculateProjectSpent(projectId: string) {
    if (!projectId) return;
    const allExpenses = this.repo.findAll().filter((e) => e.projectId === projectId);
    const spent = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    this.projectsRepo.update(projectId, { spent });
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    const record = { ...data, id: data.id || randomUUID() };
    const saved = this.repo.create(record);
    if (saved?.projectId) {
      this.recalculateProjectSpent(saved.projectId);
    }
    return saved;
  }

  update(id: string, data: any) {
    const old = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    const updated = this.repo.update(id, data);
    if (updated?.projectId || old?.projectId) {
      this.recalculateProjectSpent(updated?.projectId || old?.projectId);
      if (old?.projectId && updated?.projectId && old.projectId !== updated.projectId) {
        this.recalculateProjectSpent(old.projectId);
      }
    }
    return updated;
  }

  remove(id: string) {
    const old = this.findOne(id);
    const res = this.repo.remove(id);
    if (old?.projectId) {
      this.recalculateProjectSpent(old.projectId);
    }
    return res;
  }
}


