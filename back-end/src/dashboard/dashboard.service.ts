import { Injectable } from '@nestjs/common';
import { UserContext } from '../auth/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { UsersRepository } from '../users/users.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { getApprovalStatus } from '../companies/company-access';
import { BillsRepository } from '../bills/bills.repository';
import { PaymentsRepository } from '../bills/payments.repository';
import { billDecision } from '../bills/bills.service';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { PurchaseOrdersRepository, MaterialRequestsRepository } from '../procurement/procurement.repositories';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { ProgressService } from '../milestones/progress.service';
import { RequirementsRepository } from '../marketplace/requirements.repository';
import { QuotationsRepository } from '../marketplace/quotations.repository';
import { ContractsRepository } from '../marketplace/contracts.repository';
import { today } from '../utils/ids';

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => round2(xs.reduce((s, x) => s + (Number(x) || 0), 0));
const COMMITTED_PO = ['approved', 'partially_received', 'received'];

/**
 * One place that computes the numbers shown on every dashboard, so all screens agree:
 *  spent      = APPROVED expenses only            committed = approved purchase orders
 *  billed     = bills not declined                 paid / outstanding = payments recorded against ACCEPTED bills
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly tasks: TasksRepository,
    private readonly users: UsersRepository,
    private readonly companies: CompaniesRepository,
    private readonly bills: BillsRepository,
    private readonly payments: PaymentsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly orders: PurchaseOrdersRepository,
    private readonly requests: MaterialRequestsRepository,
    private readonly milestones: MilestonesRepository,
    private readonly progress: ProgressService,
    private readonly requirements: RequirementsRepository,
    private readonly quotations: QuotationsRepository,
    private readonly contracts: ContractsRepository,
  ) {}

  get(user: UserContext) {
    switch (user.role) {
      case 'client': return this.client(user);
      case 'project_manager': return this.projectManager(user);
      case 'finance_manager': return this.financeManager(user);
      case 'company_admin': return this.companyAdmin(user);
      case 'superuser': return this.superuser();
      default: return { role: user.role };
    }
  }

  // ───────────── shared pieces ─────────────

  private billing(projectId?: string, projectIds?: Set<string>) {
    const mine = this.bills.findAll().filter((b) => (projectId ? b.projectId === projectId : projectIds ? projectIds.has(b.projectId) : true));
    const live = mine.filter((b) => billDecision(b.status) !== 'Declined');
    const accepted = mine.filter((b) => billDecision(b.status) === 'Accepted');
    const pending = mine.filter((b) => billDecision(b.status) === 'Pending Decision');
    const paid = sum(accepted.map((b) => b.paidAmount || 0));
    const acceptedAmount = sum(accepted.map((b) => b.amount));
    const overdue = sum(accepted.filter((b) => b.dueDate && b.dueDate < today() && (b.outstanding || 0) > 0).map((b) => b.outstanding));
    return {
      billed: sum(live.map((b) => b.amount)),
      accepted: acceptedAmount,
      paid,
      outstanding: round2(acceptedAmount - paid),
      overdue,
      pendingBills: pending.length,
      pendingAmount: sum(pending.map((b) => b.amount)),
    };
  }

  private committed(projectId: string) {
    return sum(this.orders.findAll().filter((o) => o.projectId === projectId && COMMITTED_PO.includes(o.status)).map((o) => o.totalAmount));
  }

  private projectRow(p: any) {
    const ms = this.milestones.findByProjectId(p.id).map((m) => this.progress.view(m)).sort((a, b) => a.deadline.localeCompare(b.deadline));
    const budget = Number(p.budget) || 0;
    const spent = Number(p.spent) || 0;
    const committed = this.committed(p.id);
    const next = ms.find((m) => m.status !== 'Completed');
    return {
      id: p.id, name: p.name, status: p.status, companyId: p.companyId,
      progress: Number(p.progress) || 0,
      milestoneCompletion: p.progressMode === 'milestones' ? Number(p.milestoneCompletion) || 0 : null,
      milestonesTotal: ms.length,
      delayedMilestones: ms.filter((m) => m.delayed).length,
      nextMilestone: next ? { name: next.name, deadline: next.deadline, delayed: next.delayed } : null,
      budget, spent, committed, available: round2(budget - spent - committed),
      utilization: budget > 0 ? Math.round(((spent + committed) / budget) * 100) : 0,
    };
  }

  // ───────────── client ─────────────

  private client(user: UserContext) {
    const mine = this.projects.findAll().filter((p) => p.clientId === user.userId);
    const rows = mine.map((p) => ({ ...this.projectRow(p), contractValue: Number(p.contractValue ?? p.budget) || 0, ...this.billing(p.id) }));
    const ids = new Set(mine.map((p) => p.id));
    const reqs = this.requirements.findByClientId(user.userId);
    const openIds = new Set(reqs.filter((r) => r.status === 'open').map((r) => r.id));
    const b = this.billing(undefined, ids);
    return {
      role: 'client',
      totals: { contractValue: sum(rows.map((r) => r.contractValue)), ...b },
      requirements: {
        open: reqs.filter((r) => r.status === 'open').length,
        awarded: reqs.filter((r) => r.status === 'awarded').length,
        closed: reqs.filter((r) => r.status === 'closed').length,
        quotationsToReview: this.quotations.findAll().filter((q) => openIds.has(q.requirementId) && q.status === 'submitted').length,
      },
      projects: rows.map(({ spent, committed, available, utilization, budget, ...rest }) => rest), // clients do not see the contractor's internal costs
    };
  }

  // ───────────── project manager ─────────────

  private projectManager(user: UserContext) {
    const mine = this.projects.findAll().filter((p) => p.companyId === user.companyId && p.managerId === user.userId);
    const ids = new Set(mine.map((p) => p.id));
    const openTasks = this.tasks.findAll().filter((t) => ids.has(t.projectId) && t.status !== 'Completed');
    const rows = mine.map((p) => ({
      ...this.projectRow(p),
      openTasks: openTasks.filter((t) => t.projectId === p.id).length,
      overdueTasks: openTasks.filter((t) => t.projectId === p.id && t.deadline && t.deadline < today()).length,
    }));
    return {
      role: 'project_manager',
      totals: {
        projects: rows.length,
        delayedMilestones: rows.reduce((s, r) => s + r.delayedMilestones, 0),
        openTasks: rows.reduce((s, r) => s + r.openTasks, 0),
        overdueTasks: rows.reduce((s, r) => s + r.overdueTasks, 0),
      },
      pending: {
        materialRequests: this.requests.findAll().filter((r) => ids.has(r.projectId) && r.status === 'submitted').length,
        expensesToVerify: this.expenses.findAll().filter((e) => ids.has(e.projectId) && e.status === 'submitted').length,
        milestonesToApprove: this.milestones.findAll().filter((m) => ids.has(m.projectId) && m.status === 'Ready for Review').length,
      },
      projects: rows,
    };
  }

  // ───────────── finance manager / company admin ─────────────

  private financeNumbers(projects: any[]) {
    const ids = new Set(projects.map((p) => p.id));
    const rows = projects.map((p) => this.projectRow(p));
    const budget = sum(rows.map((r) => r.budget));
    const spent = sum(rows.map((r) => r.spent));
    const committed = sum(rows.map((r) => r.committed));
    return {
      ids,
      rows,
      budget: { total: budget, spent, committed, available: round2(budget - spent - committed), utilization: budget > 0 ? Math.round(((spent + committed) / budget) * 100) : 0 },
      receivables: this.billing(undefined, ids),
      pending: {
        expensesToApprove: this.expenses.findAll().filter((e) => ids.has(e.projectId) && e.status === 'pm_verified').length,
        expensesAwaitingPm: this.expenses.findAll().filter((e) => ids.has(e.projectId) && e.status === 'submitted').length,
        purchaseOrdersToApprove: this.orders.findAll().filter((o) => ids.has(o.projectId) && o.status === 'pending_approval').length,
        reimbursements: this.expenses.findAll().filter((e) => ids.has(e.projectId) && e.status === 'approved' && !e.reimbursement && e.submittedBy && e.recordedBy === undefined).length,
        materialRequests: this.requests.findAll().filter((r) => ids.has(r.projectId) && r.status === 'submitted').length,
      },
    };
  }

  private financeManager(user: UserContext) {
    const mine = this.projects.findAll().filter((p) => p.companyId === user.companyId && p.financeManagerId === user.userId);
    const f = this.financeNumbers(mine);
    return { role: 'finance_manager', budget: f.budget, receivables: f.receivables, pending: f.pending, projects: f.rows };
  }

  private companyAdmin(user: UserContext) {
    const mine = this.projects.findAll().filter((p) => p.companyId === user.companyId);
    const f = this.financeNumbers(mine);
    const people = this.users.findByCompanyId(user.companyId);
    return {
      role: 'company_admin',
      budget: f.budget,
      receivables: f.receivables,
      pending: f.pending,
      totals: {
        projects: mine.length,
        activeProjects: mine.filter((p) => p.status !== 'Completed').length,
        teamMembers: people.length,
        averageProgress: mine.length ? Math.round(mine.reduce((s, p) => s + (Number(p.progress) || 0), 0) / mine.length) : 0,
        delayedMilestones: f.rows.reduce((s, r) => s + r.delayedMilestones, 0),
        openMarketplaceRequirements: this.requirements.findAll().filter((r) => r.status === 'open').length,
        myQuotationsPending: this.quotations.findByCompanyId(user.companyId).filter((q) => q.status === 'submitted').length,
        contractsWon: this.contracts.findAll().filter((c) => c.companyId === user.companyId).length,
      },
      projects: f.rows,
    };
  }

  // ───────────── platform admin ─────────────

  private superuser() {
    const companies = this.companies.findAll();
    const reqs = this.requirements.findAll();
    const contracts = this.contracts.findAll();
    const projects = this.projects.findAll();
    return {
      role: 'superuser',
      companies: {
        total: companies.length,
        approved: companies.filter((c) => getApprovalStatus(c) === 'approved').length,
        pending: companies.filter((c) => getApprovalStatus(c) === 'pending').length,
        rejected: companies.filter((c) => getApprovalStatus(c) === 'rejected').length,
        inactive: companies.filter((c) => c.status === 'inactive').length,
      },
      marketplace: {
        openRequirements: reqs.filter((r) => r.status === 'open').length,
        awardedRequirements: reqs.filter((r) => r.status === 'awarded').length,
        closedRequirements: reqs.filter((r) => r.status === 'closed').length,
        quotationsSubmitted: this.quotations.findAll().filter((q) => q.status === 'submitted').length,
        contracts: contracts.length,
        contractValue: sum(contracts.map((c) => c.value)),
      },
      projects: {
        total: projects.length,
        active: projects.filter((p) => p.status !== 'Completed').length,
        fromMarketplace: projects.filter((p) => p.source === 'marketplace').length,
      },
    };
  }
}
