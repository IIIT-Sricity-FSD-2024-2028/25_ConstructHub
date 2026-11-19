import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { UserContext } from '../auth/current-user.decorator';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectsRepository } from './projects.repository';
import { BudgetTopupsRepository, BudgetTopupRecord } from './budget-topups.repository';
import { today } from '../utils/ids';

const round2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * Contingency top-ups. The site budget (project.budget) is the Finance Manager's internal cost cap. The profit
 * margin is what is left between the contract value and that cap. When purchase orders or expenses overrun the cap
 * the Finance Manager asks the Company Admin to release part of the margin; approving moves the money from profit to budget.
 */
@Injectable()
export class BudgetTopupsService {
  constructor(
    private readonly repo: BudgetTopupsRepository,
    private readonly projects: ProjectsRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
  ) {}

  private notify(userId: string | undefined, companyId: string, title: string, body: string) {
    if (!userId) return;
    this.notifications.create({ userId, companyId, title, body, message: body, date: today(), time: 'Just now', read: false });
  }

  private userName(id: string) { return this.users.findById(id)?.name || 'User'; }

  /** What the company can still release for a project: contract value minus the current site budget. */
  private margin(project: any) {
    const contract = Number(project.contractValue ?? project.budget) || 0;
    return round2(Math.max(0, contract - (Number(project.budget) || 0)));
  }

  /** Company Admin sees the profit margin; the Finance Manager does not. */
  private view(user: UserContext, t: BudgetTopupRecord) {
    const project = this.projects.findById(t.projectId);
    const base = { ...t, currentBudget: Number(project?.budget) || 0 };
    return user.role === 'company_admin' && project ? { ...base, profitMargin: this.margin(project) } : base;
  }

  list(user: UserContext) {
    let rows = this.repo.findByCompanyId(user.companyId);
    if (user.role === 'finance_manager') {
      const mine = new Set(this.projects.findByCompanyId(user.companyId).filter((p) => p.financeManagerId === user.userId).map((p) => p.id));
      rows = rows.filter((t) => mine.has(t.projectId));
    }
    return rows.sort((a, b) => (b.requestedAt + b.id).localeCompare(a.requestedAt + a.id)).map((t) => this.view(user, t));
  }

  request(user: UserContext, dto: { projectId: string; amount: number; reason: string }) {
    const project = this.projects.findById(dto.projectId);
    if (!project || project.companyId !== user.companyId || project.financeManagerId !== user.userId) {
      throw new NotFoundException('Project not found, or you are not its Finance Manager.');
    }
    if (project.status === 'Completed') throw new BadRequestException('This project is completed.');
    if (project.status === 'Awaiting Advance') throw new BadRequestException('The project has not started yet (mobilization advance unpaid).');
    if (this.repo.findAll().some((t) => t.projectId === project.id && t.status === 'pending')) {
      throw new ConflictException('A top-up request for this project is already waiting for the Company Admin.');
    }
    const amount = round2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Enter an amount greater than zero.');
    if (amount > this.margin(project)) {
      throw new BadRequestException('That is more than the contingency the company can release for this project. Request a smaller amount or renegotiate the purchase.');
    }
    const created = this.repo.create({
      companyId: project.companyId, projectId: project.id, projectName: project.name, amount, reason: dto.reason.trim(),
      status: 'pending', requestedBy: user.userId, requestedByName: this.userName(user.userId), requestedAt: today(),
    });
    this.users.findByCompanyId(project.companyId)
      .filter((u) => u.role === 'company_admin' && u.status !== 'inactive')
      .forEach((u) => this.notify(u.id, project.companyId, 'Budget top-up requested', `${created.requestedByName} asks for ${inr(amount)} more site budget for "${project.name}": ${created.reason}`));
    return this.view(user, created);
  }

  private mustGetPending(user: UserContext, id: string) {
    const t = this.repo.findById(id);
    if (!t || t.companyId !== user.companyId) throw new NotFoundException('Top-up request not found.');
    if (t.status !== 'pending') throw new ConflictException(`This request was already ${t.status}.`);
    return t;
  }

  approve(user: UserContext, id: string, note?: string) {
    if (user.role !== 'company_admin') throw new ForbiddenException('Only the Company Admin can release contingency funds.');
    const t = this.mustGetPending(user, id);
    const project = this.projects.findById(t.projectId);
    if (!project) throw new NotFoundException('Project not found.');
    if (t.amount > this.margin(project)) {
      throw new BadRequestException(`Only ${inr(this.margin(project))} of profit margin is left on this project, which is less than the requested ${inr(t.amount)}.`);
    }
    const before = Number(project.budget) || 0;
    const after = round2(before + t.amount);
    this.projects.update(project.id, {
      budget: after,
      allocations: { ...(project.allocations || {}), Other: round2((Number(project.allocations?.Other) || 0) + t.amount) },
      contingencyReleased: round2((Number(project.contingencyReleased) || 0) + t.amount),
    });
    const saved = this.repo.update(id, {
      status: 'approved', decidedBy: user.userId, decidedByName: this.userName(user.userId), decidedAt: today(),
      decisionNote: note?.trim() || undefined, budgetBefore: before, budgetAfter: after,
    }) as BudgetTopupRecord;
    this.notify(t.requestedBy, t.companyId, 'Top-up approved', `${inr(t.amount)} was added to the site budget of "${project.name}" (now ${inr(after)}).`);
    return this.view(user, saved);
  }

  reject(user: UserContext, id: string, note?: string) {
    if (user.role !== 'company_admin') throw new ForbiddenException('Only the Company Admin can decide top-up requests.');
    const t = this.mustGetPending(user, id);
    if (!note || note.trim().length < 3) throw new BadRequestException('Give a short reason for rejecting the request.');
    const saved = this.repo.update(id, {
      status: 'rejected', decidedBy: user.userId, decidedByName: this.userName(user.userId), decidedAt: today(), decisionNote: note.trim(),
    }) as BudgetTopupRecord;
    this.notify(t.requestedBy, t.companyId, 'Top-up rejected', `Your request for ${inr(t.amount)} on "${t.projectName}" was rejected: ${note.trim()}`);
    return this.view(user, saved);
  }
}
