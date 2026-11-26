import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { GRN_INVOICE_DIR } from './procurement-upload.config';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { UserContext } from '../auth/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SuppliersRepository, MaterialRequestsRepository, PurchaseOrdersRepository, GoodsReceiptsRepository,
  StockRepository, ProcurementSettingsRepository, SupplierRecord, MaterialRequestRecord, PurchaseOrderRecord,
  materialKey,
} from './procurement.repositories';
import {
  CreateSupplierDto, UpdateSupplierDto, CreateMaterialRequestDto, CreatePurchaseOrderDto,
  CreateGoodsReceiptDto, CreateMaterialIssueDto,
} from './procurement.dto';
import { today } from '../utils/ids';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const COMMITTED = ['approved', 'partially_received', 'received'];
const OPEN_ORDER = ['pending_approval', 'approved', 'partially_received', 'received']; // not rejected / cancelled

@Injectable()
export class ProcurementService {
  constructor(
    private readonly suppliers: SuppliersRepository,
    private readonly requests: MaterialRequestsRepository,
    private readonly orders: PurchaseOrdersRepository,
    private readonly receipts: GoodsReceiptsRepository,
    private readonly stock: StockRepository,
    private readonly settings: ProcurementSettingsRepository,
    private readonly projects: ProjectsRepository,
    private readonly tasks: TasksRepository,
    private readonly milestones: MilestonesRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
  ) {}

  // ═════════════════════════ access helpers ═════════════════════════

  /** Projects whose procurement data the caller may read. Anything else behaves as "not found". */
  private readableProjects(user: UserContext): any[] {
    const all = this.projects.findAll().filter((p) => p.companyId === user.companyId);
    switch (user.role) {
      case 'company_admin':
      case 'procurement_storekeeper':
        return all;
      case 'project_manager':
        return all.filter((p) => p.managerId === user.userId);
      case 'finance_manager':
        return all.filter((p) => p.financeManagerId === user.userId);
      case 'site_engineer': {
        const mine = new Set(this.tasks.findAll().filter((t) => t.assignedTo === user.userId).map((t) => t.projectId));
        return all.filter((p) => mine.has(p.id));
      }
      default:
        return [];
    }
  }

  private readableProjectIds(user: UserContext) {
    return new Set(this.readableProjects(user).map((p) => p.id));
  }

  private mustGetProject(projectId: string) {
    const p = this.projects.findById(projectId);
    if (!p) throw new NotFoundException('Project not found.');
    return p;
  }

  private notify(userId: string, companyId: string, title: string, body: string) {
    if (!userId) return;
    this.notifications.create({ userId, companyId, title, body, message: body, date: today(), time: 'Just now', read: false });
  }

  private notifyRole(companyId: string, role: string, title: string, body: string) {
    this.users.findByCompanyId(companyId)
      .filter((u) => u.role === role && u.status !== 'inactive')
      .forEach((u) => this.notify(u.id, companyId, title, body));
  }

  private userName(userId: string) {
    return this.users.findById(userId)?.name || 'User';
  }

  // ═════════════════════════ settings ═════════════════════════

  getSettings(user: UserContext) {
    return this.settings.get(user.companyId);
  }

  updateSettings(user: UserContext, poApprovalLimit: number) {
    return this.settings.save(user.companyId, poApprovalLimit);
  }

  // ═════════════════════════ suppliers ═════════════════════════

  listSuppliers(user: UserContext) {
    return this.suppliers.findByCompanyId(user.companyId).sort((a, b) => a.name.localeCompare(b.name));
  }

  private mustGetSupplier(user: UserContext, id: string): SupplierRecord {
    const s = this.suppliers.findById(id);
    if (!s || s.companyId !== user.companyId) throw new NotFoundException('Supplier not found.');
    return s;
  }

  createSupplier(user: UserContext, dto: CreateSupplierDto) {
    const name = dto.name.trim();
    if (this.suppliers.findByCompanyId(user.companyId).some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictException(`A supplier named "${name}" already exists.`);
    }
    return this.suppliers.create({ ...dto, name, companyId: user.companyId, status: 'active', createdAt: today() });
  }

  updateSupplier(user: UserContext, id: string, dto: UpdateSupplierDto) {
    const s = this.mustGetSupplier(user, id);
    if (dto.name && dto.name.trim().toLowerCase() !== s.name.toLowerCase()
      && this.suppliers.findByCompanyId(user.companyId).some((x) => x.id !== id && x.name.toLowerCase() === dto.name!.trim().toLowerCase())) {
      throw new ConflictException(`A supplier named "${dto.name.trim()}" already exists.`);
    }
    const patch: Partial<SupplierRecord> = { ...dto };
    if (dto.name) patch.name = dto.name.trim();
    return this.suppliers.update(id, patch);
  }

  removeSupplier(user: UserContext, id: string) {
    this.mustGetSupplier(user, id);
    if (this.orders.findBySupplierId(id).length > 0) {
      throw new ConflictException('This supplier has purchase orders, so it cannot be deleted. Mark it inactive instead.');
    }
    this.suppliers.remove(id);
    return { message: 'Supplier deleted.' };
  }

  // ═════════════════════════ material requests ═════════════════════════

  /** Quantity of each request item already covered by purchase orders that are still alive. */
  private orderedByItem(requestId: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const po of this.orders.findByRequestId(requestId)) {
      if (!OPEN_ORDER.includes(po.status)) continue;
      for (const it of po.items) out[it.requestItemId] = round3((out[it.requestItemId] || 0) + it.quantity);
    }
    for (const iss of this.stock.issuesForRequest(requestId)) {
      for (const it of iss.items) {
        if (it.requestItemId) out[it.requestItemId] = round3((out[it.requestItemId] || 0) + it.quantity);
      }
    }
    return out;
  }

  private requestView(r: MaterialRequestRecord) {
    const ordered = this.orderedByItem(r.id);
    return {
      ...r,
      items: r.items.map((i) => ({
        ...i,
        orderedQuantity: ordered[i.id] || 0,
        remainingQuantity: Math.max(0, round3(i.quantity - (ordered[i.id] || 0))),
      })),
      purchaseOrderIds: this.orders.findByRequestId(r.id).filter((p) => OPEN_ORDER.includes(p.status)).map((p) => p.id),
    };
  }

  /** "ordered" once every item is fully covered; back to "approved" if a PO is rejected/cancelled. */
  private syncRequestStatus(requestId: string) {
    const r = this.requests.findById(requestId);
    if (!r || (r.status !== 'approved' && r.status !== 'ordered')) return;
    const ordered = this.orderedByItem(requestId);
    const fully = r.items.every((i) => (ordered[i.id] || 0) >= i.quantity);
    const next = fully ? 'ordered' : 'approved';
    if (next !== r.status) this.requests.update(requestId, { status: next, updatedAt: today() });
  }

  private canSeeRequest(user: UserContext, r: MaterialRequestRecord): boolean {
    if (r.companyId !== user.companyId) return false;
    if (user.role === 'site_engineer') return r.requestedBy === user.userId;
    if (user.role === 'procurement_storekeeper') return r.status === 'approved' || r.status === 'ordered';
    return this.readableProjectIds(user).has(r.projectId);
  }

  private mustGetRequest(user: UserContext, id: string): MaterialRequestRecord {
    const r = this.requests.findById(id);
    if (!r || !this.canSeeRequest(user, r)) throw new NotFoundException('Material request not found.');
    return r;
  }

  createRequest(user: UserContext, dto: CreateMaterialRequestDto) {
    const project = this.projects.findById(dto.projectId);
    if (!project || !this.readableProjectIds(user).has(project.id)) {
      throw new NotFoundException('Project not found, or you have no tasks on it.');
    }
    if (user.role === 'site_engineer' && !this.tasks.hasOpenTask(user.userId, project.id)) {
      throw new ForbiddenException('You can only request materials for a project where you have an unfinished task assigned to you.');
    }
    if (project.status === 'Completed') throw new BadRequestException('This project is completed; materials can no longer be requested.');
    if (dto.neededBy && dto.neededBy < today()) throw new BadRequestException('"Needed by" cannot be in the past.');
    const seen = new Set<string>();
    const items = dto.items.map((i, idx) => {
      const key = materialKey(i.description, i.unit);
      if (seen.has(key)) throw new BadRequestException(`"${i.description.trim()}" appears twice. Combine the quantities into one line.`);
      seen.add(key);
      return { id: `I${idx + 1}`, description: i.description.trim(), unit: i.unit.trim(), quantity: i.quantity, specification: i.specification?.trim() || undefined };
    });
    const created = this.requests.create({
      companyId: project.companyId, projectId: project.id, projectName: project.name,
      requestedBy: user.userId, requestedByName: this.userName(user.userId),
      items, neededBy: dto.neededBy, priority: dto.priority || 'Medium', notes: dto.notes?.trim() || '',
      status: 'submitted', createdAt: today(), updatedAt: today(),
    });
    this.notify(project.managerId, project.companyId, 'New material request', `${created.requestedByName} requested materials for ${project.name} (${created.id}).`);
    return this.requestView(created);
  }

  listRequests(user: UserContext, query: Record<string, any> = {}) {
    const status = String(query.status || '');
    const projectId = String(query.projectId || '');
    return this.requests.findByCompanyId(user.companyId)
      .filter((r) => this.canSeeRequest(user, r))
      .filter((r) => !status || r.status === status)
      .filter((r) => !projectId || r.projectId === projectId)
      .map((r) => this.requestView(r))
      .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
  }

  getRequest(user: UserContext, id: string) {
    return this.requestView(this.mustGetRequest(user, id));
  }

  cancelRequest(user: UserContext, id: string) {
    const r = this.mustGetRequest(user, id);
    if (r.requestedBy !== user.userId) throw new ForbiddenException('You can only cancel your own requests.');
    if (r.status !== 'submitted') throw new BadRequestException(`A ${r.status} request cannot be cancelled.`);
    return this.requestView(this.requests.update(id, { status: 'cancelled', updatedAt: today() }) as MaterialRequestRecord);
  }

  decideRequest(user: UserContext, id: string, approve: boolean, note?: string) {
    const r = this.mustGetRequest(user, id);
    const project = this.mustGetProject(r.projectId);
    if (project.managerId !== user.userId) throw new ForbiddenException('Only the project manager of this project can decide on its material requests.');
    if (r.status !== 'submitted') throw new ConflictException(`This request is already ${r.status}.`);
    if (!approve && !(note && note.trim().length >= 3)) throw new BadRequestException('Please give a reason when rejecting a request.');
    const updated = this.requests.update(id, {
      status: approve ? 'approved' : 'rejected', decisionBy: user.userId, decisionByName: this.userName(user.userId),
      decisionAt: today(), decisionNote: note?.trim() || '', updatedAt: today(),
    }) as MaterialRequestRecord;
    this.notify(r.requestedBy, r.companyId, approve ? 'Material request approved' : 'Material request rejected',
      `${r.id} for ${r.projectName} was ${approve ? 'approved' : 'rejected'}${note ? `: ${note.trim()}` : '.'}`);
    if (approve) this.notifyRole(r.companyId, 'procurement_storekeeper', 'Approved material request ready to fulfill', `${r.id} (${r.projectName}) was approved by the PM — issue from site stock or raise a PO.`);
    return this.requestView(updated);
  }

  // ═════════════════════════ purchase orders ═════════════════════════

  private committed(projectId: string, excludePoId?: string) {
    return round2(this.orders.findAll()
      .filter((p) => p.projectId === projectId && p.id !== excludePoId && COMMITTED.includes(p.status))
      .reduce((s, p) => s + p.totalAmount, 0));
  }

  private budgetCheck(po: Pick<PurchaseOrderRecord, 'projectId' | 'id' | 'totalAmount'>) {
    const project = this.mustGetProject(po.projectId);
    const budget = Number(project.budget) || 0;
    const spent = Number(project.spent) || 0;
    const committed = this.committed(po.projectId, po.id);
    const available = round2(budget - spent - committed);
    return { budget, spent, committed, available, exceedsBudget: po.totalAmount > available };
  }

  private canSeeOrder(user: UserContext, po: PurchaseOrderRecord): boolean {
    if (po.companyId !== user.companyId) return false;
    if (user.role === 'site_engineer') return this.requests.findById(po.requestId)?.requestedBy === user.userId;
    return user.role === 'procurement_storekeeper' || this.readableProjectIds(user).has(po.projectId);
  }

  private mustGetOrder(user: UserContext, id: string): PurchaseOrderRecord {
    const po = this.orders.findById(id);
    if (!po || !this.canSeeOrder(user, po)) throw new NotFoundException('Purchase order not found.');
    return po;
  }

  /** Site engineers see what was ordered, not what it costs. */
  private orderView(user: UserContext, po: PurchaseOrderRecord, withBudget = false) {
    if (user.role === 'site_engineer') {
      const { totalAmount, ...rest } = po;
      return { ...rest, items: po.items.map(({ rate, amount, ...i }) => i) };
    }
    return {
      ...po,
      ...(withBudget ? { budgetCheck: this.budgetCheck(po), receipts: this.receipts.findByPoId(po.id) } : {}),
    };
  }

  createOrder(user: UserContext, dto: CreatePurchaseOrderDto) {
    const req = this.requests.findById(dto.requestId);
    if (!req || req.companyId !== user.companyId) throw new NotFoundException('Material request not found.');
    if (req.status !== 'approved') {
      throw new BadRequestException(req.status === 'ordered' ? 'This request is already fully ordered.' : `Only approved requests can be ordered (this one is ${req.status}).`);
    }
    const supplier = this.suppliers.findById(dto.supplierId);
    if (!supplier || supplier.companyId !== user.companyId) throw new NotFoundException('Supplier not found.');
    if (supplier.status !== 'active') throw new BadRequestException('This supplier is inactive.');
    if (dto.expectedDelivery && dto.expectedDelivery < today()) throw new BadRequestException('Expected delivery cannot be in the past.');
    const project = this.mustGetProject(req.projectId);
    if (project.status === 'Completed') throw new BadRequestException('This project is completed.');
    if (project.status === 'Awaiting Advance') {
      throw new BadRequestException('Purchase orders are locked until the client pays the mobilization advance (Bill #1).');
    }

    const ordered = this.orderedByItem(req.id);
    const seen = new Set<string>();
    const items = dto.items.map((line, idx) => {
      if (seen.has(line.requestItemId)) throw new BadRequestException(`Item ${line.requestItemId} appears twice in the order.`);
      seen.add(line.requestItemId);
      const src = req.items.find((i) => i.id === line.requestItemId);
      if (!src) throw new BadRequestException(`Item ${line.requestItemId} is not part of request ${req.id}.`);
      const remaining = round3(src.quantity - (ordered[src.id] || 0));
      if (line.quantity > remaining) {
        throw new BadRequestException(`"${src.description}": you can order at most ${remaining} ${src.unit} (requested ${src.quantity}, already ordered ${ordered[src.id] || 0}).`);
      }
      return { id: `L${idx + 1}`, requestItemId: src.id, description: src.description, unit: src.unit, quantity: line.quantity, rate: line.rate, amount: round2(line.quantity * line.rate), receivedQuantity: 0 };
    });
    const total = round2(items.reduce((s, i) => s + i.amount, 0));

    // Approval policy: above the company limit, or more than the project budget has left, needs the Finance Manager.
    const limit = this.settings.get(user.companyId).poApprovalLimit;
    const budget = this.budgetCheck({ projectId: project.id, id: '', totalAmount: total });
    const reasons: string[] = [];
    if (total > limit) reasons.push(`Above the company approval limit (${inr(limit)})`);
    // Splitting one request into several smaller orders must not dodge the limit: count what is already ordered for it.
    const alreadyOrdered = round2(this.orders.findAll()
      .filter((o) => o.requestId === req.id && !['rejected', 'cancelled'].includes(o.status))
      .reduce((s, o) => s + o.totalAmount, 0));
    if (total <= limit && alreadyOrdered + total > limit) {
      reasons.push(`Together with the ${inr(alreadyOrdered)} already ordered for ${req.id}, this request is above the company approval limit (${inr(limit)})`);
    }
    if (budget.exceedsBudget) reasons.push(`Exceeds the available project budget (${inr(Math.max(0, budget.available))} left)`);
    const requiresApproval = reasons.length > 0;

    const created = this.orders.create({
      companyId: user.companyId, projectId: project.id, projectName: project.name, requestId: req.id,
      supplierId: supplier.id, supplierName: supplier.name, items, totalAmount: total,
      expectedDelivery: dto.expectedDelivery, notes: dto.notes?.trim() || '',
      status: requiresApproval ? 'pending_approval' : 'approved', requiresApproval,
      approvalReason: reasons.join('; '),
      createdBy: user.userId, createdByName: this.userName(user.userId), createdAt: today(), updatedAt: today(),
    });
    this.syncRequestStatus(req.id);

    if (requiresApproval) {
      const fmId = project.financeManagerId;
      const body = `${created.id} (${supplier.name}, ${inr(total)}) for ${project.name} needs your approval: ${created.approvalReason}.`;
      if (fmId) this.notify(fmId, project.companyId, 'Purchase order awaiting approval', body);
      else this.notifyRole(project.companyId, 'company_admin', 'Purchase order awaiting approval', body);
    }
    this.notify(req.requestedBy, req.companyId, 'Materials ordered', `Your request ${req.id} was ordered from ${supplier.name} (${created.id}).`);
    return this.orderView(user, created, true);
  }

  listOrders(user: UserContext, query: Record<string, any> = {}) {
    const status = String(query.status || '');
    const projectId = String(query.projectId || '');
    return this.orders.findByCompanyId(user.companyId)
      .filter((p) => this.canSeeOrder(user, p))
      .filter((p) => !status || p.status === status)
      .filter((p) => !projectId || p.projectId === projectId)
      .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id))
      .map((p) => this.orderView(user, p, false));
  }

  getOrder(user: UserContext, id: string) {
    return this.orderView(user, this.mustGetOrder(user, id), true);
  }

  /** Finance Manager of the project; the company admin only steps in when the project has no Finance Manager. */
  private assertCanDecideOrder(user: UserContext, po: PurchaseOrderRecord) {
    const project = this.mustGetProject(po.projectId);
    const ok = user.role === 'finance_manager' ? project.financeManagerId === user.userId
      : user.role === 'company_admin' ? !project.financeManagerId : false;
    if (!ok) throw new ForbiddenException('Only the Finance Manager of this project can approve or reject its purchase orders.');
  }

  decideOrder(user: UserContext, id: string, approve: boolean, note?: string) {
    const po = this.mustGetOrder(user, id);
    this.assertCanDecideOrder(user, po);
    if (po.status !== 'pending_approval') throw new ConflictException(`This purchase order is already ${po.status.replace('_', ' ')}.`);
    if (!approve && !(note && note.trim().length >= 3)) throw new BadRequestException('Please give a reason when rejecting a purchase order.');
    const updated = this.orders.update(id, {
      status: approve ? 'approved' : 'rejected', decisionBy: user.userId, decisionByName: this.userName(user.userId),
      decisionAt: today(), decisionNote: note?.trim() || '', updatedAt: today(),
    }) as PurchaseOrderRecord;
    this.syncRequestStatus(po.requestId); // a rejected order frees the quantities again
    this.notify(po.createdBy, po.companyId, approve ? 'Purchase order approved' : 'Purchase order rejected',
      `${po.id} (${po.supplierName}, ${inr(po.totalAmount)}) was ${approve ? 'approved' : 'rejected'}${note ? `: ${note.trim()}` : '.'}`);
    return this.orderView(user, updated, true);
  }

  cancelOrder(user: UserContext, id: string, reason: string) {
    const po = this.mustGetOrder(user, id);
    if (!['pending_approval', 'approved'].includes(po.status)) {
      throw new ConflictException(po.status === 'cancelled' ? 'This purchase order is already cancelled.' : `A ${po.status.replace('_', ' ')} purchase order cannot be cancelled.`);
    }
    if (po.items.some((i) => i.receivedQuantity > 0)) throw new ConflictException('Material was already received against this order, so it cannot be cancelled.');
    const updated = this.orders.update(id, { status: 'cancelled', cancelReason: reason.trim(), updatedAt: today() }) as PurchaseOrderRecord;
    this.syncRequestStatus(po.requestId);
    return this.orderView(user, updated, true);
  }

  // ═════════════════════════ goods receipts (GRN) ═════════════════════════

  /** The stored file name stays on the server; clients get the original name and an authenticated download. */
  private receiptView<T extends { vendorInvoice?: any }>(g: T) {
    if (!g.vendorInvoice) return g;
    const { storedName, ...invoice } = g.vendorInvoice;
    return { ...g, vendorInvoice: invoice };
  }

  listReceipts(user: UserContext, poId?: string) {
    const ids = this.readableProjectIds(user);
    return this.receipts.findByCompanyId(user.companyId)
      .filter((g) => user.role === 'procurement_storekeeper' || ids.has(g.projectId))
      .filter((g) => !poId || g.poId === poId)
      .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id))
      .map((g) => this.receiptView(g));
  }

  private mustGetVisibleReceipt(user: UserContext, id: string) {
    const g = this.receipts.findById(id);
    if (!g || g.companyId !== user.companyId) throw new NotFoundException('Goods receipt not found.');
    if (user.role !== 'procurement_storekeeper' && !this.readableProjectIds(user).has(g.projectId)) throw new NotFoundException('Goods receipt not found.');
    return g;
  }

  /** Attach (or replace) the vendor's delivery challan / invoice (PDF or image) on a goods receipt. */
  attachInvoice(user: UserContext, id: string, file: any) {
    const discard = () => { try { if (file?.path && existsSync(file.path)) unlinkSync(file.path); } catch { /* ignore */ } };
    try {
      if (!file) throw new BadRequestException('No file was uploaded.');
      const g = this.mustGetVisibleReceipt(user, id);
      const old = g.vendorInvoice;
      const saved = this.receipts.update(id, {
        vendorInvoice: {
          originalName: String(file.originalname).replace(/[\\/]/g, '_').slice(0, 200),
          storedName: file.filename, mimetype: file.mimetype, size: file.size, uploadedAt: today(),
        },
      });
      if (old) { try { const p = join(GRN_INVOICE_DIR, id, old.storedName); if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ } }
      return this.receiptView(saved as any);
    } catch (err) {
      discard();
      throw err;
    }
  }

  getInvoiceFile(user: UserContext, id: string): { path: string; name: string } {
    const g = this.mustGetVisibleReceipt(user, id);
    if (!g.vendorInvoice) throw new NotFoundException('No vendor invoice was attached to this receipt.');
    const path = join(GRN_INVOICE_DIR, id, g.vendorInvoice.storedName);
    if (!existsSync(path)) throw new NotFoundException('The invoice file is missing on the server.');
    return { path, name: g.vendorInvoice.originalName };
  }

  createReceipt(user: UserContext, dto: CreateGoodsReceiptDto) {
    const po = this.orders.findById(dto.poId);
    if (!po || po.companyId !== user.companyId) throw new NotFoundException('Purchase order not found.');
    if (!['approved', 'partially_received'].includes(po.status)) {
      throw new BadRequestException(po.status === 'pending_approval' ? 'This purchase order is not approved yet.'
        : po.status === 'received' ? 'This purchase order was already fully received.' : `Cannot receive material against a ${po.status.replace('_', ' ')} purchase order.`);
    }
    const receivedDate = dto.receivedDate || today();
    if (receivedDate > today()) throw new BadRequestException('Received date cannot be in the future.');
    let milestoneLink: { milestoneId?: string; milestoneName?: string } = {};
    if (dto.milestoneId) {
      const ms = this.milestones.findById(dto.milestoneId);
      if (!ms || ms.projectId !== po.projectId) throw new BadRequestException('That milestone does not belong to the project of this purchase order.');
      milestoneLink = { milestoneId: ms.id, milestoneName: ms.name };
    }

    const seen = new Set<string>();
    const lines = dto.items.filter((l) => l.receivedQuantity > 0).map((l) => {
      if (seen.has(l.poItemId)) throw new BadRequestException(`Item ${l.poItemId} appears twice.`);
      seen.add(l.poItemId);
      const item = po.items.find((i) => i.id === l.poItemId);
      if (!item) throw new BadRequestException(`Item ${l.poItemId} is not part of ${po.id}.`);
      const remaining = round3(item.quantity - item.receivedQuantity);
      if (l.receivedQuantity > remaining) {
        throw new BadRequestException(`"${item.description}": cannot receive more than ordered. Ordered ${item.quantity}, already received ${item.receivedQuantity}, so at most ${remaining} ${item.unit} can be received.`);
      }
      return { item, qty: l.receivedQuantity, remarks: l.remarks?.trim() };
    });
    if (lines.length === 0) throw new BadRequestException('Enter a received quantity for at least one item.');

    const grnId = this.receipts.nextId();
    const byName = this.userName(user.userId);

    // 1. update the order
    const items = po.items.map((i) => {
      const hit = lines.find((l) => l.item.id === i.id);
      return hit ? { ...i, receivedQuantity: round3(i.receivedQuantity + hit.qty) } : i;
    });
    const fully = items.every((i) => i.receivedQuantity >= i.quantity);
    this.orders.update(po.id, { items, status: fully ? 'received' : 'partially_received', updatedAt: today() });

    // 2. stock + ledger (stock changes ONLY through receipts and issues)
    const stamp = new Date().toISOString();
    for (const l of lines) {
      this.postStock(po.companyId, po.projectId, l.item.description, l.item.unit, l.qty, 'GRN', grnId, user.userId, byName, stamp);
    }

    // 3. the receipt document
    const grn = this.receipts.create({
      id: grnId, companyId: po.companyId, projectId: po.projectId, poId: po.id, supplierId: po.supplierId, supplierName: po.supplierName,
      deliveryNote: dto.deliveryNote?.trim() || '', ...milestoneLink, receivedDate,
      items: lines.map((l) => ({ poItemId: l.item.id, description: l.item.description, unit: l.item.unit, receivedQuantity: l.qty, remarks: l.remarks })),
      notes: dto.notes?.trim() || '', receivedBy: user.userId, receivedByName: byName, createdAt: today(),
    });

    const req = this.requests.findById(po.requestId);
    const summary = lines.map((l) => `${l.qty} ${l.item.unit} ${l.item.description}`).join(', ');
    if (req) this.notify(req.requestedBy, po.companyId, 'Materials received at site', `${grnId}: ${summary} (${po.id}).`);
    const project = this.projects.findById(po.projectId);
    if (project?.managerId && project.managerId !== req?.requestedBy) this.notify(project.managerId, po.companyId, 'Materials received', `${grnId}: ${summary} (${po.id}).`);
    return { receipt: this.receiptView(grn), order: this.orderView(user, this.orders.findById(po.id) as PurchaseOrderRecord, true) };
  }

  // ═════════════════════════ stock ═════════════════════════

  /** The ONLY function that changes stock. Writes the ledger line and the cached balance together. */
  private postStock(companyId: string, projectId: string, description: string, unit: string, signedQty: number, type: 'GRN' | 'ISSUE', refId: string, byId: string, byName: string, date: string) {
    const key = materialKey(description, unit);
    let bal = this.stock.findBalance(projectId, key);
    if (!bal) {
      bal = this.stock.createBalance({ companyId, projectId, materialKey: key, description: description.trim(), unit: unit.trim(), quantity: 0, updatedAt: today() });
    }
    const next = round3(bal.quantity + signedQty);
    if (next < 0) throw new BadRequestException(`Not enough stock of "${bal.description}" (available ${bal.quantity} ${bal.unit}).`);
    this.stock.updateBalance(bal.id, { quantity: next, updatedAt: today() });
    this.stock.addTransaction({
      companyId, projectId, stockId: bal.id, description: bal.description, unit: bal.unit, type,
      quantity: signedQty, balanceAfter: next, refId, byId, byName, date,
    });
  }

  listStock(user: UserContext, projectId?: string) {
    const ids = this.readableProjectIds(user);
    const names = Object.fromEntries(this.projects.findAll().map((p) => [p.id, p.name]));
    return this.stock.balancesFor(user.companyId)
      .filter((b) => ids.has(b.projectId))
      .filter((b) => !projectId || b.projectId === projectId)
      .map((b) => ({ ...b, projectName: names[b.projectId] }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName) || a.description.localeCompare(b.description));
  }

  ledger(user: UserContext, projectId?: string) {
    const ids = this.readableProjectIds(user);
    return this.stock.ledgerFor(user.companyId)
      .filter((t) => ids.has(t.projectId))
      .filter((t) => !projectId || t.projectId === projectId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 500);
  }

  listIssues(user: UserContext, projectId?: string) {
    const ids = this.readableProjectIds(user);
    return this.stock.issuesFor(user.companyId)
      .filter((i) => ids.has(i.projectId))
      .filter((i) => !projectId || i.projectId === projectId)
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }

  createIssue(user: UserContext, dto: CreateMaterialIssueDto) {
    // combine duplicate lines first so the availability check is exact
    const wanted = new Map<string, number>();
    for (const l of dto.items) wanted.set(l.stockId, round3((wanted.get(l.stockId) || 0) + l.quantity));

    const lines = [...wanted.entries()].map(([stockId, quantity]) => {
      const bal = this.stock.balanceById(stockId);
      if (!bal || bal.companyId !== user.companyId) throw new NotFoundException(`Stock item ${stockId} not found.`);
      if (quantity > bal.quantity) {
        throw new BadRequestException(`Not enough "${bal.description}" in stock: available ${bal.quantity} ${bal.unit}, requested ${quantity}.`);
      }
      return { bal, quantity };
    });
    const projectIds = new Set(lines.map((l) => l.bal.projectId));
    if (projectIds.size !== 1) throw new BadRequestException('One issue can only cover materials of a single project.');
    const projectId = [...projectIds][0];

    let issuedToName: string | undefined;
    if (dto.issuedTo) {
      const u = this.users.findById(dto.issuedTo);
      if (!u || u.companyId !== user.companyId || u.role !== 'site_engineer') throw new BadRequestException('Material can only be issued to a site engineer of your company.');
      if (!this.tasks.hasOpenTask(u.id, projectId)) {
        throw new BadRequestException(`${u.name} has no unfinished task on this project, so material cannot be issued to them.`);
      }
      issuedToName = u.name;
    }
    if (dto.taskId) {
      const t = this.tasks.findById(dto.taskId);
      if (!t || t.projectId !== projectId) throw new BadRequestException('That task does not belong to this project.');
      if (t.status === 'Completed') throw new BadRequestException('That task is already completed.');
      if (dto.issuedTo && t.assignedTo !== dto.issuedTo) throw new BadRequestException('That task is not assigned to the engineer receiving the material.');
    }

    const issueId = this.stock.nextIssueId();
    const byName = this.userName(user.userId);
    const stamp = new Date().toISOString();
    for (const l of lines) this.postStock(user.companyId, projectId, l.bal.description, l.bal.unit, -l.quantity, 'ISSUE', issueId, user.userId, byName, stamp);

    const reqItemByStock = new Map<string, string>();
    for (const l of dto.items) {
      if (l.requestItemId) reqItemByStock.set(l.stockId, l.requestItemId);
    }
    const issue = this.stock.addIssue({
      id: issueId, companyId: user.companyId, projectId,
      items: lines.map((l) => ({
        stockId: l.bal.id,
        description: l.bal.description,
        unit: l.bal.unit,
        quantity: l.quantity,
        ...(reqItemByStock.get(l.bal.id) ? { requestItemId: reqItemByStock.get(l.bal.id) } : {}),
      })),
      issuedBy: user.userId, issuedByName: byName, issuedTo: dto.issuedTo, issuedToName, taskId: dto.taskId,
      ...(dto.requestId ? { requestId: dto.requestId } : {}),
      notes: dto.notes?.trim() || '', date: today(),
    });
    if (dto.requestId) this.syncRequestStatus(dto.requestId);
    if (dto.issuedTo) this.notify(dto.issuedTo, user.companyId, 'Materials issued to you', `${issueId}: ${lines.map((l) => `${l.quantity} ${l.bal.unit} ${l.bal.description}`).join(', ')}.`);
    return issue;
  }
}
