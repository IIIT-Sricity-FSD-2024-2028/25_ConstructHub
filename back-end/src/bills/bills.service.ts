import { Injectable, OnModuleInit, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { BillsRepository } from './bills.repository';
import { PaymentsRepository, PaymentRecord } from './payments.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { ReportsRepository } from '../reports/reports.repository';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { PurchaseOrdersRepository, GoodsReceiptsRepository } from '../procurement/procurement.repositories';
import { CompaniesRepository } from '../companies/companies.repository';
import { UserContext } from '../auth/current-user.decorator';
import { randomUUID } from 'crypto';
import { today, addDays } from '../utils/ids';

const round2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
export const PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'Cash', 'UPI'];
/** Methods offered by the client's demo payment portal (cash or cheque are never self-reported by a client). */
export const CLIENT_PAYMENT_METHODS = ['UPI', 'Card', 'NetBanking', 'NEFT / RTGS'];

/** Same normalisation the screens use: approved/accepted/paid -> Accepted, rejected/declined -> Declined. */
export function billDecision(status?: string): 'Pending Decision' | 'Accepted' | 'Declined' {
  const s = String(status || '').trim().toLowerCase();
  if (['approved', 'accepted', 'paid'].includes(s)) return 'Accepted';
  if (['rejected', 'declined'].includes(s)) return 'Declined';
  return 'Pending Decision';
}

@Injectable()
export class BillsService implements OnModuleInit {
  constructor(
    private readonly repo: BillsRepository,
    private readonly payments: PaymentsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
    private readonly milestones: MilestonesRepository,
    private readonly reports: ReportsRepository,
    private readonly expenses: ExpensesRepository,
    private readonly orders: PurchaseOrdersRepository,
    private readonly receipts: GoodsReceiptsRepository,
    private readonly companies: CompaniesRepository,
  ) {}

  onModuleInit() {
    this.repo.findAll().forEach((b) => this.syncPaymentFields(b.id));
  }

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findByFinanceManager(companyId: string, financeManagerId: string) {
    const assignedProjectIds = new Set(
      this.projectsRepo.findByCompanyId(companyId).filter((p) => p.financeManagerId === financeManagerId).map((p) => p.id),
    );
    return this.repo.findByCompanyId(companyId).filter((b) => assignedProjectIds.has(b.projectId));
  }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Bills record not found.');
    return record;
  }

  // ───────────── bills ─────────────

  /** Internal cost booked against a milestone: goods delivered for it (at PO rates) and approved petty expenses. Staff only. */
  private milestoneSpend(milestoneId: string, projectId: string) {
    let poSpend = 0;
    for (const g of this.receipts.findAll().filter((r) => r.projectId === projectId && r.milestoneId === milestoneId)) {
      const po = this.orders.findById(g.poId);
      for (const it of g.items) {
        const line = po?.items.find((i) => i.id === it.poItemId);
        if (line) poSpend += it.receivedQuantity * line.rate;
      }
    }
    const expenseSpend = this.expenses.findByProjectId(projectId)
      .filter((e) => e.milestoneId === milestoneId && e.status === 'approved')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { poSpend: round2(poSpend), expenseSpend: round2(expenseSpend) };
  }

  private mustBeBiller(user: UserContext | undefined, project: any) {
    if (!user || user.role === 'superuser') return;
    if (user.role === 'finance_manager' && project.financeManagerId === user.userId) return;
    if (user.role === 'company_admin' && project.companyId === user.companyId) return;
    throw new ForbiddenException('Only the Finance Manager of this project (or the Company Admin) can generate stage bills.');
  }

  /**
   * The mobilization advance is recovered from the stage bills, so that advance + all stage bills = contract value.
   * Each stage bill is the quoted stage amount less the advance percent of that stage.
   */
  private advanceRecovery(project: any, ms: any): number {
    const pct = Number(project.mobilizationAdvancePercent) || 0;
    if (!(pct > 0) || ms.clientStageAmount === undefined || ms.clientStageAmount === null) return 0;
    return round2((ms.clientStageAmount * pct) / 100);
  }

  /** Stage-billing sheet of a project: every milestone with its quoted amount, evidence, billing state and internal spend. */
  billable(user: UserContext, projectId: string) {
    const project = this.projectsRepo.findById(projectId);
    if (!project || project.companyId !== user.companyId) throw new NotFoundException('Project not found.');
    this.mustBeBiller(user, project);
    const bills = this.repo.findAll().filter((b) => b.projectId === projectId && b.milestoneId && billDecision(b.status) !== 'Declined');
    const billedTotal = this.repo.findAll().filter((b) => b.projectId === projectId && billDecision(b.status) !== 'Declined').reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const contractValue = Number(project.contractValue ?? project.budget) || 0;
    const rows = this.milestones.findByProjectId(projectId)
      .sort((a, b) => (a.stageIndex ?? 999) - (b.stageIndex ?? 999) || a.deadline.localeCompare(b.deadline))
      .map((m) => {
        const bill = bills.find((b) => b.milestoneId === m.id);
        const reports = this.reports.findAll().filter((r) => r.projectId === projectId && r.milestoneId === m.id);
        const recovery = this.advanceRecovery(project, m);
        return {
          id: m.id, name: m.name, status: m.status, deadline: m.deadline,
          clientStageAmount: m.clientStageAmount ?? null, internalBudget: m.internalBudget ?? null,
          advanceRecovery: recovery, netBillAmount: m.clientStageAmount != null ? round2(m.clientStageAmount - recovery) : null,
          siteReportCount: reports.length, siteReportIds: reports.map((r) => r.id),
          billed: !!bill, billId: bill?.id ?? null, billNumber: bill?.billNumber ?? null,
          billable: m.status === 'Completed' && !bill && reports.length > 0,
          ...this.milestoneSpend(m.id, projectId),
        };
      });
    return {
      project: { id: project.id, name: project.name, status: project.status, clientId: project.clientId, clientName: project.clientName, contractValue, billedTotal: round2(billedTotal), remaining: round2(contractValue - billedTotal) },
      milestones: rows,
    };
  }

  /** Bill for a completed milestone: amount, number, client and proof are all decided by the server. */
  private createMilestoneBill(data: any, project: any, user?: UserContext) {
    this.mustBeBiller(user, project);
    if (project.status === 'Awaiting Advance') throw new BadRequestException('The mobilization advance has not been paid yet, so stage bills cannot be raised.');
    if (!data.milestoneId) throw new BadRequestException('Select the completed milestone you are billing.');
    const ms = this.milestones.findById(data.milestoneId);
    if (!ms || ms.projectId !== project.id) throw new BadRequestException('That milestone does not belong to this project.');
    if (ms.status !== 'Completed') throw new BadRequestException(`"${ms.name}" is not approved yet (it is ${ms.status}). Only milestones the project manager approved can be billed.`);
    if (this.repo.findAll().some((b) => b.milestoneId === ms.id && billDecision(b.status) !== 'Declined')) {
      throw new ConflictException(`"${ms.name}" was already billed.`);
    }
    const reports = this.reports.findAll().filter((r) => r.projectId === project.id && r.milestoneId === ms.id);
    if (reports.length === 0) throw new BadRequestException('This milestone has no site reports to attach as proof.');
    const quoted = ms.clientStageAmount !== undefined && ms.clientStageAmount !== null;
    const stageAmount: number = quoted ? (ms.clientStageAmount as number) : Number(data.amount);
    if (!(stageAmount >= 1)) throw new BadRequestException('Enter the bill amount.');
    const recovery = this.advanceRecovery(project, ms);
    const amount = round2(stageAmount - recovery);
    return {
      companyId: project.companyId, projectId: project.id, projectName: project.name,
      clientId: project.clientId, clientName: project.clientName,
      amount, stageAmount: round2(stageAmount), advanceRecovery: recovery, milestone: ms.name, milestoneId: ms.id, billType: 'milestone',
      description: String(data.description || '').trim()
        || `Stage bill for "${ms.name}" (${reports.length} site report(s) attached).` + (recovery > 0 ? ` Stage amount ₹${stageAmount.toLocaleString('en-IN')} less mobilization advance recovery ₹${recovery.toLocaleString('en-IN')}.` : ''),
      siteReportIds: reports.map((r) => r.id),
      date: today(), dueDate: data.dueDate || addDays(today(), 15), priority: 'Medium',
      generatedBy: user?.userId || data.generatedBy,
    };
  }

  create(data: any, user?: UserContext) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    const proj = this.projectsRepo.findById(data.projectId);
    if (!proj) throw new BadRequestException('Project not found.');
    // A bill always belongs to the project's own company and is addressed to the project's own client.
    if (user && user.role !== 'superuser' && proj.companyId !== user.companyId) throw new BadRequestException('Project not found.');
    this.mustBeBiller(user, proj);
    if (!proj.clientId) throw new BadRequestException('This project has no client to bill.');
    if (data.milestoneId || this.milestones.findByProjectId(proj.id).length > 0) {
      data = this.createMilestoneBill(data, proj, user);
    } else {
      // Projects without a milestone plan keep the older free-form bill.
      if (proj.status === 'Awaiting Advance') throw new BadRequestException('The mobilization advance has not been paid yet, so bills cannot be raised.');
      for (const k of ['amount', 'milestone', 'description', 'dueDate']) {
        if (data[k] === undefined || data[k] === '') throw new BadRequestException(`${k} is required.`);
      }
      data = {
        companyId: proj.companyId, projectId: proj.id, projectName: proj.name,
        clientId: proj.clientId, clientName: proj.clientName,
        amount: round2(Number(data.amount)), milestone: String(data.milestone).trim(), milestoneId: null, billType: 'manual',
        description: String(data.description).trim(), date: today(), dueDate: data.dueDate, priority: data.priority || 'Medium',
        generatedBy: user?.userId || data.generatedBy,
      };
    }
    // Invoice numbers are always issued by the server.
    data = { ...data, billNumber: this.nextBillNumber(this.companies.findById(data.companyId)?.code || '', data.companyId) };

    if (data.projectId) {
      const project = this.projectsRepo.findById(data.projectId);
      if (project) {
        const billedSoFar = this.repo.findAll()
          .filter((b) => b.projectId === data.projectId && billDecision(b.status) !== 'Declined')
          .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        // Bills are capped by what the client pays (contractValue). project.budget is the internal site cost cap.
        const remaining = (Number(project.contractValue ?? project.budget) || 0) - billedSoFar;
        // half a rupee of tolerance so rounding on the last stage bill cannot block it
        if (Number(data.amount) > remaining + 0.5) {
          throw new BadRequestException(`Bill amount exceeds remaining project budget. Remaining: ${remaining}`);
        }
      }
    }

    // New bills always start undecided and unpaid, whatever the caller sent.
    const record = { ...data, id: data.id || randomUUID(), status: 'Pending Decision', paidAmount: 0, outstanding: Number(data.amount) || 0, paymentStatus: 'n/a' };
    return this.repo.create(record);
  }

  /** Next server-side invoice number for a company, e.g. INV-APEX-005. */
  nextBillNumber(companyCode: string, companyId: string): string {
    const prefix = String(companyCode || companyId || 'BILL').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const used = this.repo.findAll().filter((b) => b.companyId === companyId).length;
    let n = used + 1;
    const taken = new Set(this.repo.findAll().map((b) => b.billNumber));
    while (taken.has(`INV-${prefix}-${String(n).padStart(3, '0')}`)) n++;
    return `INV-${prefix}-${String(n).padStart(3, '0')}`;
  }

  /**
   * Bill #1 of an awarded project: the Mobilization Advance. The client already agreed to the advance percent
   * when accepting the quotation, so the bill starts as Accepted and can be paid straight away
   * (paying it is what releases the project, see the Mobilization Advance gate).
   */
  createMobilizationAdvance(input: { project: any; companyCode?: string; amount: number; percent: number; contractId?: string; quotationId?: string }) {
    const { project } = input;
    const amount = round2(input.amount);
    const record = {
      id: randomUUID(),
      billNumber: this.nextBillNumber(input.companyCode || '', project.companyId),
      companyId: project.companyId,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      amount,
      milestone: 'Mobilization Advance',
      milestoneId: null,
      billType: 'advance',
      date: today(),
      dueDate: today(),
      status: 'Accepted',
      decisionDate: today(),
      priority: 'High',
      description: `Mobilization advance (${input.percent}% of the contract value) payable before work starts.`,
      generatedBy: project.financeManagerId || 'system',
      contractId: input.contractId,
      quotationId: input.quotationId,
      paidAmount: 0,
      outstanding: amount,
      paymentStatus: 'Unpaid',
    };
    return this.repo.create(record);
  }

  /** Total of the non-declined bills of a project, optionally leaving one bill out. */
  private billedSoFar(projectId: string, excludeBillId?: string) {
    return this.repo.findAll()
      .filter((b) => b.projectId === projectId && b.id !== excludeBillId && billDecision(b.status) !== 'Declined')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }

  /**
   * Staff edits of a bill (the client decides it through the controller).
   * Only a bill still waiting for the client can change, and only its wording and due date;
   * the amount of a stage bill comes from the milestone, a free-form bill's amount stays inside the contract value.
   */
  update(id: string, data: any, user?: UserContext) {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    data = Object.fromEntries(Object.entries({ ...data }).filter(([, v]) => v !== undefined));
    // Derived and identity fields are never typed in.
    for (const k of ['paidAmount', 'outstanding', 'paymentStatus', 'billNumber', 'billType', 'generatedBy', 'date', 'stageAmount', 'advanceRecovery', 'siteReportIds', 'id']) delete data[k];
    for (const k of ['companyId', 'projectId', 'projectName', 'clientId', 'clientName', 'milestoneId']) {
      if (data[k] !== undefined && data[k] !== existing[k]) {
        throw new BadRequestException(`The ${k.replace(/Id$/, '').replace('Name', ' name')} of a bill cannot be changed. Delete it and raise a new bill instead.`);
      }
      delete data[k];
    }

    const isDecisionByClient = user?.role === 'client';
    const paid = this.payments.findByBillId(id).length > 0;
    if (!isDecisionByClient) {
      if (paid) throw new ConflictException('Payments were already received against this bill, so it can no longer change.');
      if (billDecision(existing.status) !== 'Pending Decision') {
        throw new ConflictException(`This bill was already ${billDecision(existing.status).toLowerCase()} by the client, so it can no longer be edited.`);
      }
      if (user && user.role !== 'superuser') {
        const project = this.projectsRepo.findById(existing.projectId);
        if (project) this.mustBeBiller(user, project);
      }
      if (data.amount !== undefined && Number(data.amount) !== Number(existing.amount)) {
        if (existing.billType === 'milestone' || existing.billType === 'advance' || existing.milestoneId) {
          throw new BadRequestException('The amount of a stage bill comes from the quoted stage amount of its milestone and cannot be edited.');
        }
        const project = this.projectsRepo.findById(existing.projectId);
        const amount = round2(Number(data.amount));
        if (!(amount >= 1)) throw new BadRequestException('Enter the bill amount.');
        const remaining = (Number(project?.contractValue ?? project?.budget) || 0) - this.billedSoFar(existing.projectId, id);
        if (amount > remaining + 0.5) throw new BadRequestException(`Bill amount exceeds remaining project budget. Remaining: ${round2(remaining)}`);
        data.amount = amount;
      } else {
        delete data.amount;
      }
      if (data.milestone !== undefined && data.milestone !== existing.milestone && existing.milestoneId) {
        throw new BadRequestException('The milestone of a stage bill cannot be changed.');
      }
      if (data.status !== undefined && billDecision(data.status) !== billDecision(existing.status)) {
        throw new ForbiddenException('Only the client can accept or decline a bill.');
      }
      delete data.status;
      delete data.decisionDate;
    } else if (paid) {
      throw new ConflictException('Payments were already received against this bill, so its decision can no longer change.');
    }
    if (Object.keys(data).length === 0) return existing;
    const prevDecision = billDecision(existing.status);
    const updated = this.repo.update(id, data);
    this.syncPaymentFields(id);
    const finalBill = this.repo.findById(id) || updated;
    const nextDecision = billDecision(finalBill?.status);
    if (prevDecision !== nextDecision && (nextDecision === 'Accepted' || nextDecision === 'Declined')) {
      const project = this.projectsRepo.findById(existing.projectId);
      const label = existing.billNumber || existing.id;
      const clientLabel = existing.clientName || 'Client';
      if (nextDecision === 'Accepted') {
        this.notify(
          project?.financeManagerId,
          existing.companyId,
          'Bill Accepted by Client',
          `${clientLabel} accepted ${label} (${inr(Number(existing.amount) || 0)}) for "${project?.name || existing.projectName || 'Project'}". It is now ready for payment.`
        );
      } else {
        const reason = data.declineReason || data.remarks || '';
        this.notify(
          project?.financeManagerId,
          existing.companyId,
          'Bill Declined by Client',
          `${clientLabel} declined ${label} for "${project?.name || existing.projectName || 'Project'}"${reason ? `: ${reason}` : '.'}`
        );
      }
    }
    return finalBill;
  }

  remove(id: string, user?: UserContext) {
    const bill = this.findOne(id);
    if (this.payments.findByBillId(id).length > 0) throw new ConflictException('This bill has payments recorded against it and cannot be deleted.');
    if (bill.billType === 'advance') throw new ConflictException('The mobilization advance bill is part of the contract and cannot be deleted.');
    if (billDecision(bill.status) === 'Accepted') throw new ConflictException('The client already accepted this bill, so it cannot be deleted.');
    if (user && user.role !== 'superuser') {
      const project = this.projectsRepo.findById(bill.projectId);
      if (project) this.mustBeBiller(user, project);
    }
    return this.repo.remove(id);
  }

  // ───────────── payments ─────────────

  /** Keep paidAmount / outstanding / paymentStatus on the bill in step with its payments. */
  syncPaymentFields(billId: string) {
    const bill = this.repo.findById(billId);
    if (!bill) return;
    const paidAmount = round2(this.payments.findByBillId(billId).reduce((s, p) => s + p.amount, 0));
    const amount = Number(bill.amount) || 0;
    const outstanding = billDecision(bill.status) === 'Accepted' ? round2(Math.max(0, amount - paidAmount)) : amount;
    const paymentStatus = billDecision(bill.status) !== 'Accepted' ? 'n/a' : paidAmount <= 0 ? 'Unpaid' : outstanding <= 0 ? 'Paid' : 'Partially Paid';
    const next = { paidAmount, outstanding, paymentStatus };
    if (Object.entries(next).some(([k, v]) => bill[k] !== v)) this.repo.update(billId, next);
  }

  private mustGetVisibleBill(user: UserContext, billId: string) {
    const bill = this.findOne(billId);
    const ok = user.role === 'superuser'
      || (user.role === 'client' && bill.clientId === user.userId)
      || (user.role !== 'client' && bill.companyId === user.companyId
          && (user.role !== 'finance_manager' || this.projectsRepo.findById(bill.projectId)?.financeManagerId === user.userId));
    if (!ok) throw new NotFoundException('Bills record not found.');
    return bill;
  }

  listPayments(user: UserContext, billId?: string) {
    if (billId) {
      this.mustGetVisibleBill(user, billId);
      return this.payments.findByBillId(billId).sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.id.localeCompare(a.id));
    }
    return this.payments.findAll()
      .filter((p) => {
        if (user.role === 'superuser') return true;
        if (user.role === 'client') return p.clientId === user.userId;
        if (p.companyId !== user.companyId) return false;
        if (user.role === 'finance_manager') return this.projectsRepo.findById(p.projectId)?.financeManagerId === user.userId;
        return true;
      })
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.id.localeCompare(a.id));
  }

  private notify(userId: string | undefined, companyId: string, title: string, body: string) {
    if (!userId) return;
    this.notifications.create({ userId, companyId, title, body, message: body, date: today(), time: 'Just now', read: false });
  }

  /**
   * Record a payment against an ACCEPTED bill (partial payments allowed, never more than what is outstanding).
   *  - client: demo "Pay now" (no real gateway) - method and reference are generated.
   *  - finance manager: records money received offline (transfer / cheque / cash / UPI).
   * Accepting a bill and paying it are separate actions.
   */
  recordPayment(user: UserContext, billId: string, dto: { amount: number; method?: string; reference?: string; paidAt?: string; note?: string }) {
    const bill = this.mustGetVisibleBill(user, billId);
    if (billDecision(bill.status) !== 'Accepted') {
      throw new BadRequestException(billDecision(bill.status) === 'Declined' ? 'A declined bill cannot be paid.' : 'The client has not accepted this bill yet, so it cannot be paid.');
    }
    const project = this.projectsRepo.findById(bill.projectId);
    if (user.role === 'finance_manager' && project?.financeManagerId !== user.userId) throw new ForbiddenException('Only the Finance Manager of this project can record payments.');
    if (user.role === 'company_admin' && project?.financeManagerId) throw new ForbiddenException('Only the Finance Manager of this project can record payments.');

    this.syncPaymentFields(billId);
    const fresh = this.findOne(billId);
    const amount = round2(Number(dto.amount));
    if (!(amount > 0)) throw new BadRequestException('Enter an amount greater than zero.');
    if (amount > fresh.outstanding) {
      throw new BadRequestException(`The payment (${inr(amount)}) is more than the outstanding balance (${inr(fresh.outstanding)}).`);
    }

    const client = user.role === 'client';
    let method: string;
    let reference: string;
    let paidAt = today();
    if (client) {
      // Demo gateway: the client picks one of the portal's methods; the receipt number always comes from the server.
      const rawMethod = String(dto.method || '').trim();
      method = CLIENT_PAYMENT_METHODS.includes(rawMethod) ? rawMethod : 'Online payment (demo)';
      reference = `DEMO-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    } else {
      method = String(dto.method || '');
      if (!PAYMENT_METHODS.includes(method)) throw new BadRequestException(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`);
      reference = String(dto.reference || '').trim();
      if (method !== 'Cash' && reference.length < 3) throw new BadRequestException('Enter the payment reference (transfer / cheque / UPI number).');
      if (dto.paidAt) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.paidAt)) throw new BadRequestException('Payment date must be YYYY-MM-DD.');
        if (dto.paidAt > today()) throw new BadRequestException('Payment date cannot be in the future.');
        paidAt = dto.paidAt;
      }
    }

    const byName = this.users.findById(user.userId)?.name || 'User';
    const payment: PaymentRecord = this.payments.create({
      companyId: bill.companyId, billId, projectId: bill.projectId, clientId: bill.clientId, amount, method, reference, paidAt,
      channel: client ? 'client_demo' : 'finance',
      payerReference: client && dto.reference ? String(dto.reference).trim().slice(0, 80) : undefined,
      recordedBy: user.userId, recordedByName: byName, note: dto.note?.trim() || undefined, createdAt: today(),
    });
    this.syncPaymentFields(billId);
    const after = this.findOne(billId);

    // Mobilization Advance gate: a fully paid advance bill starts the project.
    let started = false;
    if (after.billType === 'advance' && after.paymentStatus === 'Paid' && project?.status === 'Awaiting Advance') {
      this.projectsRepo.update(project.id, { status: 'On Track', startedAt: today() });
      started = true;
      this.notify(project.managerId, bill.companyId, 'Project unlocked', `The mobilization advance for "${project.name}" is paid. Tasks and purchase orders are now open.`);
      this.notify(project.financeManagerId, bill.companyId, 'Project unlocked', `The mobilization advance (${bill.billNumber}) is paid. "${project.name}" is now active.`);
    }

    const status = after.paymentStatus === 'Paid' ? 'fully paid' : `partly paid (${inr(after.outstanding)} outstanding)`;
    if (client) {
      this.notify(project?.financeManagerId, bill.companyId, 'Payment received', `${bill.clientName} paid ${inr(amount)} against ${bill.billNumber || bill.id}. The bill is now ${status}.`);
    } else {
      this.notify(bill.clientId, '', 'Payment recorded', `${inr(amount)} received against ${bill.billNumber || bill.id} (${method}). The bill is now ${status}.`);
    }
    return { payment, bill: after, projectStarted: started };
  }
}
