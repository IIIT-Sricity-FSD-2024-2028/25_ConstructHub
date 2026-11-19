import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { UserContext } from '../auth/current-user.decorator';
import { UsersRepository } from '../users/users.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { companyAccessBlockReason } from '../companies/company-access';
import { ProjectsService } from '../projects/projects.service';
import { ProjectsRepository } from '../projects/projects.repository';
import { BillsService } from '../bills/bills.service';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { ProgressService } from '../milestones/progress.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequirementsRepository, RequirementRecord, RequirementDocument } from './requirements.repository';
import { QuotationsRepository, QuotationRecord, QuotationItem, QuotationStage } from './quotations.repository';
import { ContractsRepository, ContractRecord } from './contracts.repository';
import { CreateRequirementDto, UpdateRequirementDto } from './requirement.dto';
import { SaveQuotationDto, AssignTeamDto, PmEstimateDto, FmEstimateDto, ReleaseQuotationDto } from './quotation.dto';
import { REQUIREMENT_DOCS_DIR, MAX_DOCS_PER_REQUIREMENT } from './marketplace-upload.config';
import { today, addDays } from '../utils/ids';

const MAX_OPEN_REQUIREMENTS_PER_CLIENT = 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly requirements: RequirementsRepository,
    private readonly quotations: QuotationsRepository,
    private readonly contracts: ContractsRepository,
    private readonly users: UsersRepository,
    private readonly companies: CompaniesRepository,
    private readonly projects: ProjectsService,
    private readonly projectsRepo: ProjectsRepository,
    private readonly notifications: NotificationsService,
    private readonly bills: BillsService,
    private readonly milestonesRepo: MilestonesRepository,
    private readonly progress: ProgressService,
  ) {}

  // ───────────────────────────── helpers ─────────────────────────────

  private notify(userId: string, companyId: string, title: string, body: string) {
    this.notifications.create({
      userId,
      companyId: companyId || '',
      title,
      body,
      message: body,
      date: today(),
      time: 'Just now',
      read: false,
    });
  }

  private notifyCompanyAdmins(companyId: string, title: string, body: string) {
    this.users
      .findByCompanyId(companyId)
      .filter((u) => u.role === 'company_admin' && u.status !== 'inactive')
      .forEach((u) => this.notify(u.id, companyId, title, body));
  }

  private isAccepting(req: RequirementRecord): boolean {
    if (req.status !== 'open') return false;
    return !req.quotationDeadline || today() <= req.quotationDeadline;
  }

  private mustGetRequirement(id: string): RequirementRecord {
    const r = this.requirements.findById(id);
    if (!r) throw new NotFoundException('Requirement not found.');
    return r;
  }

  private mustGetQuotation(id: string): QuotationRecord {
    const q = this.quotations.findById(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    return q;
  }

  /** Quotations still being estimated are internal to the company: the client never sees them. */
  private clientCanSee(q: QuotationRecord) {
    return q.status !== 'withdrawn' && q.status !== 'estimating';
  }

  private isOpenForBids(q: QuotationRecord) {
    return q.status === 'submitted' || q.status === 'estimating';
  }

  /** A staff member of this company with the given role, or a clear error. */
  private mustGetStaff(companyId: string, userId: string, role: string, label: string) {
    const u = this.users.findById(userId);
    if (!u || u.companyId !== companyId || u.role !== role) {
      throw new BadRequestException(`${label} must be an active ${role.replace('_', ' ')} of your company.`);
    }
    if (u.status === 'inactive') throw new BadRequestException(`${label} is inactive. Choose another person.`);
    return u;
  }

  private isSuper(user: UserContext) {
    return user.role === 'superuser';
  }

  private assertOwnerClient(user: UserContext, req: RequirementRecord) {
    if (user.role !== 'client' || req.clientId !== user.userId) {
      throw new ForbiddenException('Access denied. Only the client who posted this requirement can do this.');
    }
  }

  /** A company admin can see a requirement while it is open, or if their company has quoted on it. */
  private companyCanSee(user: UserContext, req: RequirementRecord): boolean {
    if (req.status === 'open') return true;
    return !!this.quotations.findByCompanyAndRequirement(user.companyId, req.id);
  }

  private computeItems(dto: SaveQuotationDto): { items: QuotationItem[]; total: number } {
    const items = dto.items.map((i) => ({
      description: i.description.trim(),
      unit: i.unit.trim(),
      quantity: i.quantity,
      rate: i.rate,
      amount: round2(i.quantity * i.rate), // never trust a client-sent amount
    }));
    const total = round2(items.reduce((s, i) => s + i.amount, 0));
    if (total <= 0) throw new BadRequestException('Quotation total must be greater than zero.');
    return { items, total };
  }

  private validateValidUntil(validUntil?: string) {
    if (validUntil && validUntil < today()) {
      throw new BadRequestException('"validUntil" cannot be in the past.');
    }
  }

  // ───────────────────────────── views ─────────────────────────────

  /** What the posting client (and the platform admin) see. */
  private clientView(r: RequirementRecord) {
    const quotes = this.quotations.findByRequirementId(r.id).filter((q) => this.clientCanSee(q));
    return {
      ...r,
      documents: r.documents.map(({ storedName, ...doc }) => doc),
      acceptingQuotations: this.isAccepting(r),
      quotationCount: quotes.length,
    };
  }

  /** What a company sees: no client contact details and no information about competing quotations. */
  private companyView(r: RequirementRecord, companyId: string) {
    const { clientEmail, clientPhone, awardedQuotationId, awardedCompanyId, contractId, projectId, ...rest } = r;
    const mine = this.quotations.findByCompanyAndRequirement(companyId, r.id);
    const view: any = {
      ...rest,
      documents: r.documents.map(({ storedName, ...doc }) => doc),
      acceptingQuotations: this.isAccepting(r),
      hasQuoted: !!mine && mine.status !== 'withdrawn',
      myQuotationId: mine ? mine.id : null,
      myQuotationStatus: mine ? mine.status : null,
    };
    if (r.status === 'awarded') view.awardedToMe = awardedCompanyId === companyId;
    return view;
  }

  private quotationView(q: QuotationRecord, forClient: boolean) {
    if (!forClient) return q;
    const company = this.companies.findById(q.companyId);
    // Client price vs internal site cost: internal cost, markup and staff assignment never reach the client.
    const { internalBaseCost, markupPercent, assignedPmId, assignedFmId, estimationStatus, milestoneStages, ...visible } = q;
    return {
      ...visible,
      ...(milestoneStages ? {
        milestoneStages: milestoneStages.map((st) => ({
          name: st.name, durationDays: st.durationDays, materialScope: st.materialScope, clientAmount: st.clientAmount,
        })),
      } : {}),
      company: {
        id: q.companyId,
        name: q.companyName,
        code: company?.code,
        domain: company?.domain,
        projectsCount: this.projects.findByCompanyId(q.companyId).length,
        memberSince: company?.createdAt,
      },
    };
  }

  // ───────────────────────────── requirements ─────────────────────────────

  createRequirement(user: UserContext, dto: CreateRequirementDto) {
    if (user.role !== 'client') throw new ForbiddenException('Only clients can post requirements.');
    if (dto.budgetMax < dto.budgetMin) {
      throw new BadRequestException('Maximum budget cannot be lower than minimum budget.');
    }
    if (dto.quotationDeadline && dto.quotationDeadline < today()) {
      throw new BadRequestException('Quotation deadline cannot be in the past.');
    }
    const open = this.requirements.findByClientId(user.userId).filter((r) => r.status === 'open').length;
    if (open >= MAX_OPEN_REQUIREMENTS_PER_CLIENT) {
      throw new BadRequestException(`You can have at most ${MAX_OPEN_REQUIREMENTS_PER_CLIENT} open requirements. Close or award one first.`);
    }
    const client = this.users.findById(user.userId);
    const now = today();
    const created = this.requirements.create({
      clientId: user.userId,
      clientName: client?.name || 'Client',
      clientEmail: client?.email,
      clientPhone: client?.phone,
      title: dto.title.trim(),
      description: dto.description.trim(),
      location: dto.location.trim(),
      projectType: dto.projectType,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      expectedDurationDays: dto.expectedDurationDays,
      quotationDeadline: dto.quotationDeadline,
      preferredStartDate: dto.preferredStartDate,
      status: 'open',
      documents: [],
      createdAt: now,
      updatedAt: now,
    });
    return this.clientView(created);
  }

  listRequirements(user: UserContext, query: Record<string, any> = {}) {
    if (user.role === 'client') {
      return this.requirements
        .findByClientId(user.userId)
        .map((r) => this.clientView(r))
        .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
    }
    if (this.isSuper(user)) {
      return this.requirements.findAll().map((r) => this.clientView(r));
    }
    if (user.role !== 'company_admin') throw new ForbiddenException('Access denied.');

    // Company admin: marketplace browse (open ones) plus ones the company has quoted on.
    const q = String(query.q || '').trim().toLowerCase();
    const location = String(query.location || '').trim().toLowerCase();
    const type = String(query.projectType || '').trim();
    const minBudget = query.minBudget !== undefined && query.minBudget !== '' ? Number(query.minBudget) : null;
    const maxBudget = query.maxBudget !== undefined && query.maxBudget !== '' ? Number(query.maxBudget) : null;
    const scope = String(query.scope || 'open'); // open | mine

    return this.requirements
      .findAll()
      .filter((r) => {
        const mine = this.quotations.findByCompanyAndRequirement(user.companyId, r.id);
        if (scope === 'mine') {
          if (!mine) return false;
        } else if (r.status !== 'open') {
          return false;
        }
        if (q && !(`${r.title} ${r.description} ${r.location}`.toLowerCase().includes(q))) return false;
        if (location && !r.location.toLowerCase().includes(location)) return false;
        if (type && r.projectType !== type) return false;
        // Budget filter = does the client's range overlap the filter range?
        if (minBudget !== null && Number.isFinite(minBudget) && r.budgetMax < minBudget) return false;
        if (maxBudget !== null && Number.isFinite(maxBudget) && r.budgetMin > maxBudget) return false;
        return true;
      })
      .map((r) => this.companyView(r, user.companyId))
      .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
  }

  getRequirement(user: UserContext, id: string) {
    const r = this.mustGetRequirement(id);
    if (user.role === 'client') {
      this.assertOwnerClient(user, r);
      return this.clientView(r);
    }
    if (this.isSuper(user)) return this.clientView(r);
    if (user.role === 'company_admin' && this.companyCanSee(user, r)) {
      return this.companyView(r, user.companyId);
    }
    throw new NotFoundException('Requirement not found.'); // do not reveal that it exists
  }

  updateRequirement(user: UserContext, id: string, dto: UpdateRequirementDto) {
    const r = this.mustGetRequirement(id);
    this.assertOwnerClient(user, r);
    if (r.status !== 'open') throw new BadRequestException(`A ${r.status} requirement cannot be edited.`);
    const hasQuotes = this.quotations.findByRequirementId(id).some((q) => q.status === 'submitted');
    if (hasQuotes) {
      throw new ConflictException('This requirement already has quotations, so it can no longer be edited. Close it and post a new one if the scope changed.');
    }
    const next = { ...r, ...dto };
    if (next.budgetMax < next.budgetMin) {
      throw new BadRequestException('Maximum budget cannot be lower than minimum budget.');
    }
    if (dto.quotationDeadline && dto.quotationDeadline < today()) {
      throw new BadRequestException('Quotation deadline cannot be in the past.');
    }
    const updated = this.requirements.update(id, { ...dto, updatedAt: today() });
    return this.clientView(updated as RequirementRecord);
  }

  closeRequirement(user: UserContext, id: string) {
    const r = this.mustGetRequirement(id);
    this.assertOwnerClient(user, r);
    if (r.status !== 'open') throw new BadRequestException(`This requirement is already ${r.status}.`);
    this.requirements.update(id, { status: 'closed', updatedAt: today() });
    this.quotations
      .findByRequirementId(id)
      .filter((q) => this.isOpenForBids(q))
      .forEach((q) => {
        this.quotations.update(q.id, { status: 'rejected', statusReason: 'Requirement closed by the client.', updatedAt: today() });
        this.notifyCompanyAdmins(q.companyId, 'Requirement closed', `"${r.title}" was closed by the client. Your quotation ${q.id} is no longer active.`);
      });
    return this.clientView(this.mustGetRequirement(id));
  }

  // ───────────────────────────── documents ─────────────────────────────

  addDocuments(user: UserContext, id: string, files: any[]) {
    const discard = () => files.forEach((f) => { try { if (f?.path && existsSync(f.path)) unlinkSync(f.path); } catch { /* ignore */ } });
    try {
      if (!files || files.length === 0) throw new BadRequestException('No files were uploaded.');
      const r = this.mustGetRequirement(id);
      this.assertOwnerClient(user, r);
      if (r.status !== 'open') throw new BadRequestException(`Documents cannot be added to a ${r.status} requirement.`);
      if (r.documents.length + files.length > MAX_DOCS_PER_REQUIREMENT) {
        throw new BadRequestException(`A requirement can have at most ${MAX_DOCS_PER_REQUIREMENT} documents.`);
      }
      const added: RequirementDocument[] = files.map((f, i) => ({
        id: `D${Date.now()}${i}`,
        originalName: String(f.originalname).replace(/[\\/]/g, '_').slice(0, 200),
        storedName: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        uploadedAt: today(),
      }));
      this.requirements.update(id, { documents: [...r.documents, ...added], updatedAt: today() });
      return this.clientView(this.mustGetRequirement(id));
    } catch (err) {
      discard(); // never leave files behind when the request is rejected
      throw err;
    }
  }

  getDocumentFile(user: UserContext, id: string, docId: string): { path: string; name: string; mimetype: string } {
    const r = this.mustGetRequirement(id);
    const allowed =
      this.isSuper(user) ||
      (user.role === 'client' && r.clientId === user.userId) ||
      (user.role === 'company_admin' && this.companyCanSee(user, r));
    if (!allowed) throw new NotFoundException('Requirement not found.');
    const doc = r.documents.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException('Document not found.');
    const path = join(REQUIREMENT_DOCS_DIR, r.id, doc.storedName);
    if (!existsSync(path)) throw new NotFoundException('Document file is missing on the server.');
    return { path, name: doc.originalName, mimetype: doc.mimetype };
  }

  // ───────────────────────────── quotations ─────────────────────────────

  /**
   * Closed on purpose. A quotation is a team product: the PM defines the stages, the FM prices them and only then
   * does the Admin add markup (see assignTeam / pmEstimate / fmEstimate / releaseQuotation). A standalone,
   * single-screen quote would skip the PM and the FM, so this always answers 400 with the way forward.
   */
  submitQuotation(user: UserContext, requirementId: string, _dto: SaveQuotationDto) {
    if (user.role !== 'company_admin') throw new ForbiddenException('Only a company administrator can submit quotations.');
    const r = this.mustGetRequirement(requirementId);
    if (!this.companyCanSee(user, r)) throw new NotFoundException('Requirement not found.');
    throw new BadRequestException('Quotations are prepared by your PM and FM. Assign them with POST /requirements/:id/assign-team, then release the estimate after both have finished.');
  }

  updateQuotation(user: UserContext, id: string, dto: SaveQuotationDto) {
    const q = this.mustGetQuotation(id);
    if (user.role !== 'company_admin' || q.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied. You can only edit your own company\'s quotations.');
    }
    if (q.status !== 'submitted') throw new BadRequestException(`A ${q.status} quotation cannot be edited.`);
    if (q.milestoneStages?.length) {
      throw new BadRequestException('A staged quotation is revised through estimation. Withdraw it and assign the PM and FM again.');
    }
    const r = this.mustGetRequirement(q.requirementId);
    if (!this.isAccepting(r)) throw new BadRequestException('This requirement is no longer accepting quotations.');
    this.validateValidUntil(dto.validUntil);
    const { items, total } = this.computeItems(dto);
    const saved = this.quotations.update(id, {
      items,
      totalAmount: total,
      durationDays: dto.durationDays,
      validUntil: dto.validUntil,
      notes: dto.notes?.trim() || '',
      updatedAt: today(),
    }) as QuotationRecord;
    this.notify(r.clientId, '', 'Quotation updated', `${saved.companyName} revised their quotation for "${r.title}" to ₹${saved.totalAmount.toLocaleString('en-IN')}.`);
    return saved;
  }

  withdrawQuotation(user: UserContext, id: string) {
    const q = this.mustGetQuotation(id);
    if (user.role !== 'company_admin' || q.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied. You can only withdraw your own company\'s quotations.');
    }
    if (!this.isOpenForBids(q)) throw new BadRequestException(`A ${q.status} quotation cannot be withdrawn.`);
    return this.quotations.update(id, { status: 'withdrawn', updatedAt: today() });
  }

  listQuotations(user: UserContext) {
    if (this.isSuper(user)) return this.quotations.findAll();
    if (user.role === 'company_admin') return this.quotations.findByCompanyId(user.companyId);
    if (user.role === 'client') {
      const mine = new Set(this.requirements.findByClientId(user.userId).map((r) => r.id));
      return this.quotations
        .findAll()
        .filter((q) => mine.has(q.requirementId) && this.clientCanSee(q))
        .map((q) => this.quotationView(q, true));
    }
    throw new ForbiddenException('Access denied.');
  }

  listQuotationsForRequirement(user: UserContext, requirementId: string) {
    const r = this.mustGetRequirement(requirementId);
    if (!this.isSuper(user)) this.assertOwnerClient(user, r);
    return this.quotations
      .findByRequirementId(requirementId)
      .filter((q) => this.clientCanSee(q))
      .sort((a, b) => a.totalAmount - b.totalAmount)
      .map((q) => this.quotationView(q, true));
  }

  getQuotation(user: UserContext, id: string) {
    const q = this.mustGetQuotation(id);
    if (this.isSuper(user)) return q;
    if (user.role === 'company_admin' && q.companyId === user.companyId) return q;
    if (user.role === 'client') {
      const r = this.mustGetRequirement(q.requirementId);
      if (r.clientId === user.userId && this.clientCanSee(q)) return this.quotationView(q, true);
    }
    throw new NotFoundException('Quotation not found.'); // do not reveal other companies' quotations
  }

  rejectQuotation(user: UserContext, id: string, reason?: string) {
    const q = this.mustGetQuotation(id);
    const r = this.mustGetRequirement(q.requirementId);
    this.assertOwnerClient(user, r);
    if (q.status !== 'submitted') throw new BadRequestException(`A ${q.status} quotation cannot be rejected.`);
    const saved = this.quotations.update(id, { status: 'rejected', statusReason: reason?.trim() || 'Not selected by the client.', updatedAt: today() });
    this.notifyCompanyAdmins(q.companyId, 'Quotation not selected', `Your quotation ${q.id} for "${r.title}" was not selected.`);
    return saved;
  }

  // ───────────────────────────── 3-role estimation ─────────────────────────────
  //
  //  Company Admin assigns PM + FM  ->  PM defines stages (names, days, materials)  ->  FM prices every stage
  //  (internal cost) and proposes the advance %  ->  Company Admin adds the profit markup % and releases the quote.
  //  Until release the quotation has status "estimating" and is invisible to the client.

  /** Step 1. Company Admin opens an estimate for a requirement and assigns the PM and FM who will prepare it. */
  assignTeam(user: UserContext, requirementId: string, dto: AssignTeamDto) {
    if (user.role !== 'company_admin') throw new ForbiddenException('Only a company administrator can assign an estimation team.');
    const r = this.mustGetRequirement(requirementId);
    if (!this.companyCanSee(user, r)) throw new NotFoundException('Requirement not found.');
    if (!this.isAccepting(r)) throw new BadRequestException('This requirement is no longer accepting quotations.');
    const pm = this.mustGetStaff(user.companyId, dto.pmId, 'project_manager', 'The Project Manager');
    const fm = this.mustGetStaff(user.companyId, dto.fmId, 'finance_manager', 'The Finance Manager');
    const company = this.companies.findById(user.companyId);
    const now = today();

    const existing = this.quotations.findByCompanyAndRequirement(user.companyId, requirementId);
    if (existing && existing.status !== 'withdrawn' && existing.status !== 'estimating') {
      throw new ConflictException(`Your company already submitted quotation ${existing.id} for this requirement.`);
    }

    let saved: QuotationRecord;
    if (existing && existing.status === 'estimating') {
      // Re-assigning while the estimate is in progress keeps the work done so far.
      saved = this.quotations.update(existing.id, { assignedPmId: pm.id, assignedFmId: fm.id, updatedAt: now }) as QuotationRecord;
    } else {
      const fresh = {
        items: [], totalAmount: 0, durationDays: 0, notes: '', statusReason: '',
        status: 'estimating' as const, estimationStatus: 'assigned' as const,
        assignedPmId: pm.id, assignedFmId: fm.id, submittedBy: user.userId,
        internalBaseCost: undefined, markupPercent: undefined, mobilizationAdvancePercent: undefined, milestoneStages: [],
        validUntil: undefined, updatedAt: now,
      };
      saved = existing
        ? (this.quotations.update(existing.id, fresh) as QuotationRecord)
        : this.quotations.create({ requirementId, companyId: user.companyId, companyName: company?.name || 'Company', createdAt: now, ...fresh });
    }
    this.notify(pm.id, user.companyId, 'Bid estimate assigned', `Define the milestone stages, durations and material scope for "${r.title}" (estimate ${saved.id}).`);
    this.notify(fm.id, user.companyId, 'Bid estimate assigned', `You will price the stages for "${r.title}" (estimate ${saved.id}) once the PM submits them.`);
    return saved;
  }

  private mustGetEstimating(id: string, requirementMustAccept = true) {
    const q = this.mustGetQuotation(id);
    if (q.status !== 'estimating') throw new BadRequestException(`This quotation is ${q.status}, so it is no longer being estimated.`);
    if (requirementMustAccept && !this.isAccepting(this.mustGetRequirement(q.requirementId))) {
      throw new BadRequestException('This requirement is no longer accepting quotations.');
    }
    return q;
  }

  /** Step 2. The assigned PM defines stages. The PM never sets any cost. */
  pmEstimate(user: UserContext, id: string, dto: PmEstimateDto) {
    const q = this.mustGetQuotation(id);
    if (user.role !== 'project_manager' || q.companyId !== user.companyId || q.assignedPmId !== user.userId) {
      throw new ForbiddenException('Only the Project Manager assigned to this estimate can define its stages.');
    }
    this.mustGetEstimating(id);
    if (q.estimationStatus === 'fm_submitted') {
      throw new ConflictException('The Finance Manager has already priced these stages. Ask the Company Admin to reassign the estimate if the stages must change.');
    }
    const names = new Set<string>();
    for (const st of dto.milestoneStages) {
      const key = st.name.trim().toLowerCase();
      if (key.length < 3) throw new BadRequestException('Each stage name needs at least 3 characters.');
      if (names.has(key)) throw new BadRequestException(`Stage "${st.name.trim()}" is listed twice.`);
      names.add(key);
    }
    const durationDays = dto.milestoneStages.reduce((sum, st) => sum + st.durationDays, 0);
    if (durationDays > 3650) throw new BadRequestException('Total duration of all stages cannot exceed 3650 days.');

    // Costs are deliberately not part of this payload: a PM-submitted stage never carries a price.
    const milestoneStages: QuotationStage[] = dto.milestoneStages.map((st) => ({
      name: st.name.trim(), durationDays: st.durationDays, materialScope: st.materialScope.trim(),
    }));
    const saved = this.quotations.update(id, {
      milestoneStages, durationDays, notes: dto.notes?.trim() ?? q.notes ?? '',
      estimationStatus: 'pm_submitted', updatedAt: today(),
    }) as QuotationRecord;
    const r = this.mustGetRequirement(q.requirementId);
    if (q.assignedFmId) this.notify(q.assignedFmId, q.companyId, 'Stages ready for pricing', `The PM defined ${milestoneStages.length} stage(s) for "${r.title}". Enter the internal cost of each stage.`);
    return saved;
  }

  /** Step 3. The assigned FM prices each stage (internal cost) and proposes the advance %. The FM never sets markup. */
  fmEstimate(user: UserContext, id: string, dto: FmEstimateDto) {
    const q = this.mustGetQuotation(id);
    if (user.role !== 'finance_manager' || q.companyId !== user.companyId || q.assignedFmId !== user.userId) {
      throw new ForbiddenException('Only the Finance Manager assigned to this estimate can price its stages.');
    }
    this.mustGetEstimating(id);
    if (q.estimationStatus !== 'pm_submitted' && q.estimationStatus !== 'fm_submitted') {
      throw new ConflictException('The Project Manager has not submitted the stages yet.');
    }
    const stages = q.milestoneStages || [];
    if (dto.stages.length !== stages.length) {
      throw new BadRequestException(`Enter exactly one cost per stage (${stages.length} stage${stages.length === 1 ? '' : 's'}).`);
    }
    const priced: QuotationStage[] = stages.map((st, i) => ({ ...st, internalCost: round2(dto.stages[i].internalCost) }));
    const internalBaseCost = round2(priced.reduce((sum, st) => sum + (st.internalCost as number), 0));
    const saved = this.quotations.update(id, {
      milestoneStages: priced, internalBaseCost,
      mobilizationAdvancePercent: dto.mobilizationAdvancePercent,
      estimationStatus: 'fm_submitted', updatedAt: today(),
    }) as QuotationRecord;
    const r = this.mustGetRequirement(q.requirementId);
    this.notifyCompanyAdmins(q.companyId, 'Estimate ready for markup', `The internal cost of ₹${internalBaseCost.toLocaleString('en-IN')} is ready for "${r.title}". Add your profit markup and release the quotation to the client.`);
    return saved;
  }

  /** Step 4. Company Admin applies the profit markup and sends the finished quotation to the client. */
  releaseQuotation(user: UserContext, id: string, dto: ReleaseQuotationDto) {
    const q = this.mustGetQuotation(id);
    if (user.role !== 'company_admin' || q.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied. You can only release your own company\'s quotations.');
    }
    this.mustGetEstimating(id);
    if (q.estimationStatus !== 'fm_submitted') {
      throw new ConflictException('The PM and FM must both finish their steps before the quotation can be released.');
    }
    this.validateValidUntil(dto.validUntil);
    const internalBase = round2((q.milestoneStages || []).reduce((s, st) => s + (Number(st.internalCost) || 0), 0));
    let effectiveMarkup = round2(dto.markupPercent);
    let factor = 1 + effectiveMarkup / 100;
    if (dto.totalClientQuote !== undefined && dto.totalClientQuote !== null && internalBase > 0) {
      if (dto.totalClientQuote < internalBase) {
        throw new BadRequestException('Total client quote cannot be less than the FM internal base cost.');
      }
      effectiveMarkup = round2(((dto.totalClientQuote - internalBase) / internalBase) * 100);
      factor = dto.totalClientQuote / internalBase;
    }
    const milestoneStages: QuotationStage[] = (q.milestoneStages || []).map((st) => ({
      ...st, clientAmount: round2((st.internalCost as number) * factor),
    }));
    if (dto.totalClientQuote !== undefined && dto.totalClientQuote !== null && milestoneStages.length > 0) {
      const targetTotal = round2(dto.totalClientQuote);
      const currentSum = round2(milestoneStages.reduce((sum, st) => sum + (st.clientAmount as number), 0));
      const diff = round2(targetTotal - currentSum);
      if (Math.abs(diff) > 0 && Math.abs(diff) <= 5) {
        const last = milestoneStages[milestoneStages.length - 1];
        last.clientAmount = round2((last.clientAmount as number) + diff);
      }
    }
    const total = round2(milestoneStages.reduce((sum, st) => sum + (st.clientAmount as number), 0));
    if (total <= 0) throw new BadRequestException('Quotation total must be greater than zero.');
    // `items` keeps the older quotation screens working: one line per stage at the client price.
    const items: QuotationItem[] = milestoneStages.map((st) => ({
      description: st.name, unit: 'stage', quantity: 1, rate: st.clientAmount as number, amount: st.clientAmount as number,
    }));
    const saved = this.quotations.update(id, {
      milestoneStages, items, totalAmount: total, markupPercent: effectiveMarkup,
      validUntil: dto.validUntil, notes: dto.notes?.trim() ?? q.notes ?? '',
      status: 'submitted', estimationStatus: 'submitted', submittedBy: user.userId, updatedAt: today(),
    }) as QuotationRecord;
    const r = this.mustGetRequirement(q.requirementId);
    this.notify(r.clientId, '', 'New quotation received', `${saved.companyName} submitted a quotation of ₹${saved.totalAmount.toLocaleString('en-IN')} for "${r.title}".`);
    return saved;
  }

  /** The PM / FM "Bid Estimates" queue: only the estimates assigned to the caller, only the step they own. */
  listEstimates(user: UserContext) {
    const isPm = user.role === 'project_manager';
    const isFm = user.role === 'finance_manager';
    if (!isPm && !isFm) throw new ForbiddenException('Access denied.');
    return this.quotations
      .findByCompanyId(user.companyId)
      .filter((q) => q.status === 'estimating' && (isPm ? q.assignedPmId === user.userId : q.assignedFmId === user.userId))
      // The FM's step only starts after the PM has submitted.
      .filter((q) => isPm || q.estimationStatus === 'pm_submitted' || q.estimationStatus === 'fm_submitted')
      .map((q) => {
        const r = this.requirements.findById(q.requirementId);
        const stages = (q.milestoneStages || []).map((st) =>
          isPm
            ? { name: st.name, durationDays: st.durationDays, materialScope: st.materialScope }
            : { name: st.name, durationDays: st.durationDays, materialScope: st.materialScope, internalCost: st.internalCost },
        );
        return {
          id: q.id,
          requirementId: q.requirementId,
          estimationStatus: q.estimationStatus,
          canEdit: isPm ? q.estimationStatus !== 'fm_submitted' : true,
          milestoneStages: stages,
          durationDays: q.durationDays,
          notes: q.notes,
          ...(isFm ? { internalBaseCost: q.internalBaseCost, mobilizationAdvancePercent: q.mobilizationAdvancePercent } : {}),
          requirement: r ? {
            id: r.id, title: r.title, description: r.description, location: r.location, projectType: r.projectType,
            budgetMin: r.budgetMin, budgetMax: r.budgetMax, expectedDurationDays: r.expectedDurationDays,
            quotationDeadline: r.quotationDeadline,
          } : null,
          updatedAt: q.updatedAt,
        };
      });
  }

  // ───────────────────────────── award ─────────────────────────────

  /**
   * Client accepts a quotation. In one step this:
   *  accepts the quotation -> rejects the others -> marks the requirement awarded ->
   *  creates the contract/work order -> creates the company's project.
   * If anything fails part-way, the project and contract are removed again so nothing is left half-done.
   */
  acceptQuotation(user: UserContext, id: string) {
    const q = this.mustGetQuotation(id);
    const r = this.mustGetRequirement(q.requirementId);
    this.assertOwnerClient(user, r);

    if (r.status !== 'open') throw new ConflictException(`This requirement is already ${r.status}.`);
    if (q.status !== 'submitted') throw new BadRequestException(`A ${q.status} quotation cannot be accepted.`);
    if (q.validUntil && q.validUntil < today()) {
      throw new BadRequestException('This quotation has expired. Ask the company to submit an updated one.');
    }
    const blockReason = companyAccessBlockReason(this.companies.findById(q.companyId));
    if (blockReason) {
      throw new ConflictException('This company is not currently active on the platform. Please choose another quotation.');
    }

    const client = this.users.findById(user.userId);
    const startDate = r.preferredStartDate && r.preferredStartDate >= today() ? r.preferredStartDate : today();
    const endDate = addDays(startDate, q.durationDays);
    const contractId = this.contracts.nextId();

    // A staged quotation (PM stages + FM costs + Admin markup) provisions the full project set-up on award.
    const staged = !!q.milestoneStages?.length && q.internalBaseCost !== undefined;
    const advancePercent = staged ? Number(q.mobilizationAdvancePercent) || 0 : 0;
    const advanceAmount = round2((q.totalAmount * advancePercent) / 100);
    const awaitingAdvance = staged && advanceAmount > 0;
    const pm = staged && q.assignedPmId ? this.users.findById(q.assignedPmId) : null;
    const fm = staged && q.assignedFmId ? this.users.findById(q.assignedFmId) : null;
    if (staged && (!pm || pm.status === 'inactive' || !fm || fm.status === 'inactive')) {
      throw new ConflictException('The project manager or finance manager of this quotation is no longer available. Ask the company to submit an updated quotation.');
    }

    let project: any = null;
    let contract: ContractRecord | null = null;
    let advanceBill: any = null;
    try {
      // 1. Project (enforces the company's plan project limit)
      try {
        project = this.projects.create({
          name: r.title,
          companyId: q.companyId,
          location: r.location,
          clientId: r.clientId,
          clientName: r.clientName,
          clientEmail: client?.email || r.clientEmail,
          clientPhone: client?.phone || r.clientPhone,
          // budget = the company's internal site cap, contractValue = what the client pays.
          budget: staged ? (q.internalBaseCost as number) : q.totalAmount,
          contractValue: q.totalAmount,
          spent: 0,
          progress: 0,
          status: awaitingAdvance ? 'Awaiting Advance' : 'On Track',
          startDate,
          endDate,
          teamSize: 0,
          allocations: { Materials: 0, Labor: 0, Equipment: 0, Other: staged ? (q.internalBaseCost as number) : q.totalAmount },
          ...(staged ? {
            managerId: pm!.id,
            managerName: pm!.name,
            financeManagerId: fm!.id,
            internalBaseCost: q.internalBaseCost,
            markupPercent: q.markupPercent,
            mobilizationAdvancePercent: advancePercent,
            mobilizationAdvanceAmount: advanceAmount,
          } : {}),
          description: r.description,
          source: 'marketplace',
          requirementId: r.id,
          quotationId: q.id,
          contractId,
        });
      } catch (err) {
        if (err instanceof ForbiddenException) {
          // Plan-limit message is meant for the company, not the client.
          throw new ConflictException('This company cannot take on another project right now. Please choose another quotation or contact the company.');
        }
        throw err;
      }

      // 2. Contract / work order
      contract = this.contracts.create({
        id: contractId,
        workOrderNumber: `WO-${contractId}`,
        requirementId: r.id,
        quotationId: q.id,
        projectId: project.id,
        companyId: q.companyId,
        companyName: q.companyName,
        clientId: r.clientId,
        clientName: r.clientName,
        title: r.title,
        location: r.location,
        value: q.totalAmount,
        items: q.items,
        startDate,
        endDate,
        durationDays: q.durationDays,
        terms:
          `Scope of work as itemised in accepted quotation ${q.id} for "${r.title}" at ${r.location}. ` +
          `Agreed contract value: INR ${q.totalAmount.toLocaleString('en-IN')}. ` +
          `Planned duration: ${q.durationDays} days from ${startDate}. ` +
          (awaitingAdvance ? `A mobilization advance of ${advancePercent}% (INR ${advanceAmount.toLocaleString('en-IN')}) is payable before work starts. ` : '') +
          `Payment is made against milestone-based interim bills approved by the client. ` +
          `Additional or changed work requires a written variation approved by both parties before it starts.` +
          (q.notes ? ` Company notes: ${q.notes}` : ''),
        status: 'active',
        acceptedAt: new Date().toISOString(),
        createdAt: today(),
      });

      // 2b. Locked milestones from the quoted stages, and Bill #1 (mobilization advance)
      if (staged) {
        this.seedMilestones(project, q, startDate);
        if (awaitingAdvance) {
          advanceBill = this.bills.createMobilizationAdvance({
            project, companyCode: this.companies.findById(q.companyId)?.code, amount: advanceAmount,
            percent: advancePercent, contractId, quotationId: q.id,
          });
        }
      }

      // 3. Status changes
      const now = today();
      this.quotations.update(q.id, { status: 'accepted', updatedAt: now });
      const lost = this.quotations.findByRequirementId(r.id).filter((o) => o.id !== q.id && this.isOpenForBids(o));
      lost.forEach((o) => this.quotations.update(o.id, { status: 'rejected', statusReason: 'Another company was selected.', updatedAt: now }));
      this.requirements.update(r.id, {
        status: 'awarded',
        awardedQuotationId: q.id,
        awardedCompanyId: q.companyId,
        contractId,
        projectId: project.id,
        updatedAt: now,
      });

      // 4. Notifications
      this.notifyCompanyAdmins(q.companyId, 'You won a project!', `${r.clientName} accepted your quotation for "${r.title}". Assign a project manager and finance manager to start (contract ${contractId}).`);
      lost.forEach((o) => this.notifyCompanyAdmins(o.companyId, 'Quotation not selected', `The client chose another company for "${r.title}".`));
      this.notify(r.clientId, '', 'Contract created', `${q.companyName} is now your contractor for "${r.title}". Work order ${contract.workOrderNumber} was created.` +
        (advanceBill ? ` Pay the mobilization advance of ₹${advanceAmount.toLocaleString('en-IN')} (${advanceBill.billNumber}) so work can start.` : ''));
      if (staged) {
        this.notify(pm!.id, q.companyId, 'Project awarded', `"${r.title}" was awarded and you are its project manager. Work starts once the client pays the mobilization advance.`);
        this.notify(fm!.id, q.companyId, 'Project awarded', `"${r.title}" was awarded and you are its finance manager.` + (advanceBill ? ` Bill ${advanceBill.billNumber} (mobilization advance) is waiting for the client's payment.` : ''));
      }
    } catch (err) {
      // Roll back anything created so far.
      if (advanceBill) this.bills.remove(advanceBill.id);
      if (project) this.milestonesRepo.findByProjectId(project.id).forEach((m) => this.milestonesRepo.remove(m.id));
      if (contract) this.contracts.remove(contract.id);
      // Remove via the repository: ProjectsService.remove() has side effects (e.g. deleting client accounts).
      if (project) this.projectsRepo.remove(project.id);
      throw err;
    }

    return {
      message: 'Quotation accepted. Contract and project created.',
      requirement: this.clientView(this.mustGetRequirement(r.id)),
      contract,
      projectId: project.id,
      projectStatus: project.status,
      ...(advanceBill ? { advanceBillId: advanceBill.id } : {}),
    };
  }

  /**
   * One locked milestone per quoted stage. Deadlines run back to back from the start date, weights follow each
   * stage's share of the client price (whole percents that add up to exactly 100, never less than 1).
   */
  private seedMilestones(project: any, q: QuotationRecord, startDate: string) {
    const stages = q.milestoneStages || [];
    const total = stages.reduce((sum, st) => sum + (st.clientAmount || 0), 0) || 1;
    const raw = stages.map((st) => ((st.clientAmount || 0) / total) * 100);
    const weights = raw.map((w) => Math.max(1, Math.floor(w)));
    let diff = 100 - weights.reduce((a, b) => a + b, 0);
    const order = raw.map((w, i) => ({ i, frac: w - Math.floor(w) })).sort((a, b) => b.frac - a.frac);
    for (let k = 0; diff > 0 && order.length; k = (k + 1) % order.length, diff--) weights[order[k].i]++;
    for (let k = 0; diff < 0 && k < 1000; k++, diff++) {
      const big = weights.indexOf(Math.max(...weights));
      if (weights[big] > 1) weights[big]--;
    }
    let elapsed = 0;
    stages.forEach((st, i) => {
      elapsed += st.durationDays;
      this.milestonesRepo.create({
        companyId: q.companyId,
        projectId: project.id,
        name: st.name,
        description: st.materialScope,
        deadline: addDays(startDate, elapsed),
        weight: weights[i],
        status: 'Pending', progress: 0, taskCount: 0, completedTasks: 0,
        stageIndex: i,
        durationDays: st.durationDays,
        materialScope: st.materialScope,
        internalBudget: st.internalCost,
        clientStageAmount: st.clientAmount,
        createdBy: q.assignedPmId || q.submittedBy,
        createdAt: today(), updatedAt: today(),
      });
    });
    this.progress.recalculateProject(project.id);
  }

  // ───────────────────────────── contracts ─────────────────────────────

  listContracts(user: UserContext) {
    if (this.isSuper(user)) return this.contracts.findAll();
    if (user.role === 'client') return this.contracts.findAll().filter((c) => c.clientId === user.userId);
    if (['company_admin', 'project_manager', 'finance_manager'].includes(user.role)) {
      return this.contracts.findAll().filter((c) => c.companyId === user.companyId);
    }
    throw new ForbiddenException('Access denied.');
  }

  getContract(user: UserContext, id: string) {
    const c = this.contracts.findById(id);
    const visible = c && this.listContracts(user).some((x) => x.id === id);
    if (!visible) throw new NotFoundException('Contract not found.');
    return c;
  }
}
