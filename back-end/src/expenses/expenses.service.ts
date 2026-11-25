import { Injectable, OnModuleInit, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { UserContext } from '../auth/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { PurchaseOrdersRepository } from '../procurement/procurement.repositories';
import { ExpensesRepository, ExpenseRecord, ExpenseHistoryEntry } from './expenses.repository';
import { CreateExpenseDto } from './create-expense.dto';
import { UpdateExpenseDto } from './update-expense.dto';
import { EXPENSE_RECEIPTS_DIR, MAX_RECEIPTS_PER_EXPENSE } from './expense-upload.config';
import { today } from '../utils/ids';

const RECEIPT_REQUIRED_ABOVE = 1000; // INR: larger expenses need a receipt before the PM can verify them
const COMMITTED_PO = ['approved', 'partially_received', 'received'];
export const PETTY_EXPENSE_CAP = 10000; // INR per claim
const round2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const now = () => new Date().toISOString();

/**
 * Expense claims: submitted (site engineer) -> pm_verified (project manager) -> approved (finance manager).
 * Returned claims go back to the engineer; rejected ones are final. Only APPROVED expenses count as project spend.
 * Approval and reimbursement (paying the engineer back) are separate steps.
 */
@Injectable()
export class ExpensesService implements OnModuleInit {
  constructor(
    private readonly repo: ExpensesRepository,
    private readonly projects: ProjectsRepository,
    private readonly tasks: TasksRepository,
    private readonly milestones: MilestonesRepository,
    private readonly users: UsersRepository,
    private readonly orders: PurchaseOrdersRepository,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Expenses recorded before the approval workflow existed are treated as approved (once).
    for (const e of this.repo.findAll() as any[]) {
      if (e.status) continue;
      const by = e.recordedBy || 'U004';
      const stamp = `${e.date || today()}T00:00:00.000Z`;
      this.repo.update(e.id, {
        status: 'approved', submittedBy: by, submittedByName: this.userName(by), receipts: [],
        history: [{ step: 'recorded', by, byName: this.userName(by), at: stamp, note: 'Recorded before the approval workflow was introduced' }],
        duplicateOf: [], createdAt: e.date || today(), updatedAt: e.date || today(),
      });
    }
    // Project spend = approved expenses only.
    new Set(this.repo.findAll().map((e) => e.projectId)).forEach((id) => this.recalculateProjectSpent(id));
  }

  // ───────────── helpers ─────────────

  private userName(id: string) { return this.users.findById(id)?.name || 'User'; }

  private notify(userId: string | undefined, companyId: string, title: string, body: string) {
    if (!userId) return;
    this.notifications.create({ userId, companyId, title, body, message: body, date: today(), time: 'Just now', read: false });
  }

  private entry(step: ExpenseHistoryEntry['step'], user: UserContext, note?: string): ExpenseHistoryEntry {
    return { step, by: user.userId, byName: this.userName(user.userId), at: now(), note: note?.trim() || undefined };
  }

  recalculateProjectSpent(projectId: string) {
    if (!projectId || !this.projects.findById(projectId)) return;
    const spent = round2(this.repo.findByProjectId(projectId).filter((e) => e.status === 'approved').reduce((s, e) => s + (Number(e.amount) || 0), 0));
    if (this.projects.findById(projectId)?.spent !== spent) this.projects.update(projectId, { spent });
  }

  private committedByOrders(projectId: string) {
    return round2(this.orders.findAll().filter((p) => p.projectId === projectId && COMMITTED_PO.includes(p.status)).reduce((s, p) => s + p.totalAmount, 0));
  }

  budgetCheck(e: ExpenseRecord) {
    const project = this.projects.findById(e.projectId);
    const budget = Number(project?.budget) || 0;
    const spent = Number(project?.spent) || 0;
    const committed = this.committedByOrders(e.projectId);
    // an approved expense is already inside "spent": do not subtract it twice
    const available = round2(budget - spent - committed + (e.status === 'approved' ? e.amount : 0));
    return { budget, spent, committed, available, exceedsBudget: e.amount > available };
  }

  /** Projects whose expenses the caller may read. */
  private visibleProjectIds(user: UserContext): Set<string> {
    const all = this.projects.findAll().filter((p) => p.companyId === user.companyId);
    if (user.role === 'company_admin') return new Set(all.map((p) => p.id));
    if (user.role === 'project_manager') return new Set(all.filter((p) => p.managerId === user.userId).map((p) => p.id));
    if (user.role === 'finance_manager') return new Set(all.filter((p) => p.financeManagerId === user.userId).map((p) => p.id));
    return new Set();
  }

  private canSee(user: UserContext, e: ExpenseRecord): boolean {
    if (user.role === 'superuser') return true;
    if (e.companyId !== user.companyId) return false;
    if (user.role === 'site_engineer') return e.submittedBy === user.userId;
    return this.visibleProjectIds(user).has(e.projectId);
  }

  private mustGet(user: UserContext, id: string): ExpenseRecord {
    const e = this.repo.findById(id);
    if (!e || !this.canSee(user, e)) throw new NotFoundException('Expense not found.');
    return e;
  }

  private view(e: ExpenseRecord, withBudget = false) {
    const { receipts, ...rest } = e;
    return {
      ...rest,
      receipts: receipts.map(({ storedName, ...r }) => r),
      ...(withBudget ? { budgetCheck: this.budgetCheck(e) } : {}),
    };
  }

  private findDuplicates(e: Pick<ExpenseRecord, 'projectId' | 'category' | 'amount' | 'date'>, excludeId?: string) {
    return this.repo.findByProjectId(e.projectId)
      .filter((o) => o.id !== excludeId && !['rejected', 'cancelled'].includes(o.status) && o.category === e.category && o.amount === e.amount && o.date === e.date)
      .map((o) => o.id);
  }

  // ───────────── reads ─────────────

  list(user: UserContext, query: Record<string, any> = {}) {
    const status = String(query.status || '');
    const projectId = String(query.projectId || '');
    return this.repo.findAll()
      .filter((e) => this.canSee(user, e))
      .filter((e) => !status || e.status === status)
      .filter((e) => !projectId || e.projectId === projectId)
      .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id))
      .map((e) => this.view(e));
  }

  get(user: UserContext, id: string) {
    return this.view(this.mustGet(user, id), true);
  }

  // ───────────── site engineer ─────────────

  private assertEngineerProject(user: UserContext, projectId: string) {
    const project = this.projects.findById(projectId);
    if (!project || project.companyId !== user.companyId) throw new NotFoundException('Project not found.');
    if (!this.tasks.hasOpenTask(user.userId, projectId)) {
      throw new ForbiddenException('You can only claim expenses on a project where you have an unfinished task assigned to you.');
    }
    if (project.status === 'Completed') throw new BadRequestException('This project is completed; expenses can no longer be submitted.');
    return project;
  }

  /** Bulk buying goes through Procurement POs (approved BEFORE the spend); engineers only cover small urgent costs. */
  private assertPettyCap(amount: number) {
    if (amount > PETTY_EXPENSE_CAP) {
      throw new BadRequestException(`A petty expense claim can be at most ${inr(PETTY_EXPENSE_CAP)}. For larger purchases ask the Storekeeper to raise a purchase order so the Finance Manager approves it first.`);
    }
  }

  /** Milestone link: required when the project has milestones, and it must belong to that project. */
  private resolveMilestone(project: any, milestoneId?: string): { milestoneId?: string; milestoneName?: string } {
    const hasPlan = this.milestones.findByProjectId(project.id).length > 0;
    if (!milestoneId) {
      if (hasPlan) throw new BadRequestException('Select the milestone this expense belongs to.');
      return {};
    }
    const ms = this.milestones.findById(milestoneId);
    if (!ms || ms.projectId !== project.id) throw new BadRequestException('That milestone does not belong to this project.');
    return { milestoneId: ms.id, milestoneName: ms.name };
  }

  private assertNotFuture(date: string) {
    if (date > today()) throw new BadRequestException('The expense date cannot be in the future.');
  }

  submit(user: UserContext, dto: CreateExpenseDto) {
    const project = this.assertEngineerProject(user, dto.projectId);
    this.assertNotFuture(dto.date);
    this.assertPettyCap(dto.amount);
    const link = this.resolveMilestone(project, dto.milestoneId);
    const created = this.repo.create({
      companyId: project.companyId, projectId: project.id, projectName: project.name, ...link, category: dto.category,
      amount: round2(dto.amount), date: dto.date, description: dto.description.trim(),
      submittedBy: user.userId, submittedByName: this.userName(user.userId), status: 'submitted',
      receipts: [], history: [this.entry('submitted', user)], duplicateOf: this.findDuplicates(dto as any),
      createdAt: today(), updatedAt: today(),
    } as Omit<ExpenseRecord, 'id'>);
    this.notify(project.managerId, project.companyId, 'Expense awaiting verification', `${created.submittedByName} submitted ${created.id} (${inr(created.amount)}, ${created.category}) for ${project.name}.`);
    return this.view(created, true);
  }

  /** Correct a RETURNED expense and send it back into the workflow. */
  resubmit(user: UserContext, id: string, dto: UpdateExpenseDto) {
    const e = this.mustGet(user, id);
    if (e.submittedBy !== user.userId) throw new ForbiddenException('You can only change your own expenses.');
    if (e.status !== 'returned') throw new ConflictException(`Only a returned expense can be corrected and resubmitted (this one is ${e.status.replace('_', ' ')}).`);
    const next = { ...e, ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) } as ExpenseRecord;
    if (dto.projectId && dto.projectId !== e.projectId) {
      const p = this.assertEngineerProject(user, dto.projectId);
      next.projectName = p.name;
    }
    this.assertNotFuture(next.date);
    next.amount = round2(next.amount);
    this.assertPettyCap(next.amount);
    const link = this.resolveMilestone(this.projects.findById(next.projectId), dto.milestoneId ?? (dto.projectId && dto.projectId !== e.projectId ? undefined : e.milestoneId));
    const updated = this.repo.update(id, {
      ...link, projectId: next.projectId, projectName: next.projectName, category: next.category, amount: next.amount, date: next.date,
      description: String(next.description).trim(), status: 'submitted', duplicateOf: this.findDuplicates(next, id),
      history: [...e.history, this.entry('resubmitted', user)], updatedAt: today(),
    }) as ExpenseRecord;
    this.notify(this.projects.findById(updated.projectId)?.managerId, updated.companyId, 'Expense resubmitted', `${updated.submittedByName} corrected and resubmitted ${updated.id} (${inr(updated.amount)}).`);
    return this.view(updated, true);
  }

  withdraw(user: UserContext, id: string) {
    const e = this.mustGet(user, id);
    if (e.submittedBy !== user.userId) throw new ForbiddenException('You can only withdraw your own expenses.');
    if (!['submitted', 'returned'].includes(e.status)) throw new ConflictException(`A ${e.status.replace('_', ' ')} expense cannot be withdrawn.`);
    return this.view(this.repo.update(id, { status: 'cancelled', history: [...e.history, this.entry('cancelled', user)], updatedAt: today() }) as ExpenseRecord);
  }

  addReceipts(user: UserContext, id: string, files: any[]) {
    const discard = () => (files || []).forEach((f) => { try { if (f?.path && existsSync(f.path)) unlinkSync(f.path); } catch { /* ignore */ } });
    try {
      if (!files || files.length === 0) throw new BadRequestException('No files were uploaded.');
      const e = this.mustGet(user, id);
      if (e.submittedBy !== user.userId) throw new ForbiddenException('You can only add receipts to your own expenses.');
      if (!['submitted', 'returned'].includes(e.status)) throw new ConflictException('Receipts can only be added before the project manager verifies the expense.');
      if (e.receipts.length + files.length > MAX_RECEIPTS_PER_EXPENSE) throw new BadRequestException(`An expense can have at most ${MAX_RECEIPTS_PER_EXPENSE} receipts.`);
      const added = files.map((f, i) => ({
        id: `R${Date.now()}${i}`, originalName: String(f.originalname).replace(/[\\/]/g, '_').slice(0, 200),
        storedName: f.filename, mimetype: f.mimetype, size: f.size, uploadedAt: today(),
      }));
      return this.view(this.repo.update(id, { receipts: [...e.receipts, ...added], updatedAt: today() }) as ExpenseRecord, true);
    } catch (err) {
      discard();
      throw err;
    }
  }

  getReceiptFile(user: UserContext, id: string, receiptId: string) {
    const e = this.mustGet(user, id);
    const r = e.receipts.find((x) => x.id === receiptId);
    if (!r) throw new NotFoundException('Receipt not found.');
    const path = join(EXPENSE_RECEIPTS_DIR, e.id, r.storedName);
    if (!existsSync(path)) throw new NotFoundException('Receipt file is missing on the server.');
    return { path, name: r.originalName, mimetype: r.mimetype };
  }

  // ───────────── project manager ─────────────

  pmDecision(user: UserContext, id: string, action: 'verify' | 'return' | 'reject', note?: string) {
    const e = this.mustGet(user, id);
    const project = this.projects.findById(e.projectId);
    if (!project || project.managerId !== user.userId) throw new ForbiddenException('Only the project manager of this project can verify its expenses.');
    if (e.status !== 'submitted') throw new ConflictException(`This expense is already ${e.status.replace('_', ' ')}.`);
    if (action !== 'verify' && !(note && note.trim().length >= 3)) throw new BadRequestException('Please give a reason when returning or rejecting an expense.');
    if (action === 'verify' && e.amount > RECEIPT_REQUIRED_ABOVE && e.receipts.length === 0) {
      throw new BadRequestException(`A receipt is required for expenses above ${inr(RECEIPT_REQUIRED_ABOVE)}. Return the expense so the engineer can attach one.`);
    }
    const status = action === 'verify' ? 'pm_verified' : action === 'return' ? 'returned' : 'rejected';
    const updated = this.repo.update(id, { status, history: [...e.history, this.entry(status as any, user, note)], updatedAt: today() }) as ExpenseRecord;
    if (action === 'verify') {
      this.notify(project.financeManagerId, e.companyId, 'Expense awaiting approval', `${e.id} (${inr(e.amount)}, ${e.category}) for ${project.name} was verified by the project manager.`);
    } else {
      this.notify(e.submittedBy, e.companyId, action === 'return' ? 'Expense returned' : 'Expense rejected', `${e.id} was ${action === 'return' ? 'returned for correction' : 'rejected'}: ${note!.trim()}`);
    }
    return this.view(updated, true);
  }

  // ───────────── finance manager ─────────────

  private assertFinanceOwner(user: UserContext, e: ExpenseRecord) {
    const project = this.projects.findById(e.projectId);
    const ok = user.role === 'finance_manager' ? project?.financeManagerId === user.userId
      : user.role === 'company_admin' ? !!project && !project.financeManagerId : false; // admin only when the project has no FM
    if (!ok) throw new ForbiddenException('Only the Finance Manager of this project can approve or reimburse its expenses.');
    return project;
  }

  fmDecision(user: UserContext, id: string, action: 'approve' | 'return' | 'reject', note?: string) {
    const e = this.mustGet(user, id);
    const project = this.assertFinanceOwner(user, e);
    if (e.status !== 'pm_verified') {
      throw new ConflictException(e.status === 'submitted' ? 'The project manager has not verified this expense yet.' : `This expense is already ${e.status.replace('_', ' ')}.`);
    }
    if (action !== 'approve' && !(note && note.trim().length >= 3)) throw new BadRequestException('Please give a reason when returning or rejecting an expense.');
    if (action === 'approve') {
      const bc = this.budgetCheck(e);
      // Hard limit: approved spend can never be above the total project budget.
      if (bc.budget > 0 && bc.spent + e.amount > bc.budget) {
        throw new BadRequestException(`Approving ${inr(e.amount)} would take approved spending above the project budget (${inr(bc.budget)}; ${inr(bc.spent)} already spent). Revise the project budget first, or reject / return this expense.`);
      }
      // Soft limit: money already committed to purchase orders is counted too, so approving needs a written reason.
      if (bc.exceedsBudget && !(note && note.trim().length >= 3)) {
        throw new BadRequestException(`This expense is more than the budget that is left after purchase-order commitments (${inr(Math.max(0, bc.available))}). Add a note to approve it anyway.`);
      }
    }
    const status = action === 'approve' ? 'approved' : action === 'return' ? 'returned' : 'rejected';
    const updated = this.repo.update(id, { status, history: [...e.history, this.entry(status as any, user, note)], updatedAt: today() }) as ExpenseRecord;
    this.recalculateProjectSpent(e.projectId);
    const verb = action === 'approve' ? 'approved' : action === 'return' ? 'returned for correction' : 'rejected';
    this.notify(e.submittedBy, e.companyId, `Expense ${action === 'approve' ? 'approved' : action === 'return' ? 'returned' : 'rejected'}`, `${e.id} (${inr(e.amount)}) was ${verb}${note ? `: ${note.trim()}` : '.'}`);
    if (action !== 'approve' && project?.managerId) this.notify(project.managerId, e.companyId, `Expense ${verb}`, `${e.id} (${e.submittedByName}) was ${verb} by finance${note ? `: ${note.trim()}` : '.'}`);
    return this.view(updated, true);
  }

  /** Paying the engineer back is a separate step from approving the cost. */
  reimburse(user: UserContext, id: string, reference?: string) {
    const e = this.mustGet(user, id);
    this.assertFinanceOwner(user, e);
    if (e.status !== 'approved') throw new ConflictException('Only approved expenses can be reimbursed.');
    if (e.reimbursement) throw new ConflictException('This expense was already reimbursed.');
    const updated = this.repo.update(id, {
      reimbursement: { paidAt: now(), paidBy: user.userId, paidByName: this.userName(user.userId), reference: reference?.trim() || undefined },
      history: [...e.history, this.entry('reimbursed', user, reference ? `Reference ${reference.trim()}` : undefined)], updatedAt: today(),
    }) as ExpenseRecord;
    this.notify(e.submittedBy, e.companyId, 'Expense reimbursed', `${e.id} (${inr(e.amount)}) has been paid back to you${reference ? ` (ref ${reference.trim()})` : ''}.`);
    return this.view(updated, true);
  }
}
