import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TasksRepository } from '../tasks/tasks.repository';
import { MilestonesRepository } from '../milestones/milestones.repository';
import { BillsRepository } from '../bills/bills.repository';
import { PaymentsRepository } from '../bills/payments.repository';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { PurchaseOrdersRepository } from '../procurement/procurement.repositories';
import { ContractsRepository } from '../marketplace/contracts.repository';
import { ReportsRepository } from '../reports/reports.repository';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './create-project.dto';
import { UpdateProjectDto } from './update-project.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';
import { UsersService } from '../users/users.service';

@ApiTags('projects')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly usersService: UsersService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private validateProjectUserAssignments(
    dto: any,
    projectCompanyId: string,
    excludeProjectId?: string,
  ) {
    if (!projectCompanyId) return;

    // 1. Manager Assignment Validation
    if (dto.managerId) {
      const manager = this.usersService.findOne(dto.managerId);
      if (manager.companyId && manager.companyId !== projectCompanyId) {
        throw new ForbiddenException(
          `Assigned Project Manager (${manager.name}) belongs to another company workspace.`,
        );
      }
      if (manager.role !== 'project_manager') {
        throw new BadRequestException(
          `Assigned user (${manager.name}) must have the project_manager role (actual role: ${manager.role}).`,
        );
      }
    }

    // 2. Client Assignment Validation (a client may have several projects)
    if (dto.clientId) {
      const clientUser = this.usersService.findOne(dto.clientId);
      if (clientUser.companyId && clientUser.companyId !== projectCompanyId) {
        throw new ForbiddenException(
          `Assigned Client (${clientUser.name}) belongs to another company workspace.`,
        );
      }
      if (clientUser.role !== 'client') {
        throw new BadRequestException(
          `Assigned user (${clientUser.name}) must have the client role (actual role: ${clientUser.role}).`,
        );
      }
    }

    // 3. Site Engineer Assignment Validation (if field present)
    if (dto.siteEngineerId) {
      const seUser = this.usersService.findOne(dto.siteEngineerId);
      if (seUser.companyId && seUser.companyId !== projectCompanyId) {
        throw new ForbiddenException(
          `Assigned Site Engineer (${seUser.name}) belongs to another company workspace.`,
        );
      }
      if (seUser.role !== 'site_engineer') {
        throw new BadRequestException(
          `Assigned user (${seUser.name}) must have the site_engineer role (actual role: ${seUser.role}).`,
        );
      }
    }

    // 4. Finance Manager Assignment Validation (if field present)
    if (dto.financeManagerId) {
      const fmUser = this.usersService.findOne(dto.financeManagerId);
      if (fmUser.companyId && fmUser.companyId !== projectCompanyId) {
        throw new ForbiddenException(
          `Assigned Finance Manager (${fmUser.name}) belongs to another company workspace.`,
        );
      }
      if (fmUser.role !== 'finance_manager') {
        throw new BadRequestException(
          `Assigned user (${fmUser.name}) must have the finance_manager role (actual role: ${fmUser.role}).`,
        );
      }
    }
  }

  /**
   * What a client may see of a project. The contractor's internal site budget, spend and cost split stay hidden;
   * `budget` is replaced by the contract value (what the client pays), so existing client screens keep working.
   */
  private clientView(p: any) {
    const { allocations, spent, internalBaseCost, markupPercent, ...rest } = p;
    return { ...rest, budget: Number(p.contractValue ?? p.budget) || 0 };
  }

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve projects (Superuser: all, Tenant: company projects, Client: assigned projects)' })
  @ApiResponse({ status: 200, description: 'List of projects.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      return this.service.findAll().filter((p) => p.clientId === user.userId).map((p) => this.clientView(p));
    }
    if (user.role === 'finance_manager') {
      return this.service.findByCompanyId(user.companyId).filter((p) => p.financeManagerId === user.userId);
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve a specific project by ID' })
  @ApiResponse({ status: 200, description: 'The project details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const project = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (TenantHelper.isClient(user)) {
        if (project.clientId !== user.userId) {
          throw new ForbiddenException('Access denied. Client can only access assigned projects.');
        }
        return this.clientView(project);
      } else if (user.role === 'finance_manager') {
        TenantHelper.validateCompanyAccess(user, project.companyId);
        if (project.financeManagerId !== user.userId) {
          throw new ForbiddenException('Access denied. Finance Manager can only access assigned projects.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, project.companyId);
      }
    }
    return project;
  }

  @Post()
  @Roles('superuser')
  @ApiOperation({ summary: 'Platform superuser only (data setup). Companies never create projects by hand: a project is created when a client awards their quotation in the Marketplace.' })
  @ApiResponse({ status: 201, description: 'Project created.' })
  @ApiResponse({ status: 403, description: 'Company roles: projects come from awarded quotations.' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);

    if (companyId) {
      const companyUsers = this.usersService.findByCompanyId(companyId);
      const hasPM = companyUsers.some((u) => u.role === 'project_manager');
      const hasFM = companyUsers.some((u) => u.role === 'finance_manager');
      const hasSE = companyUsers.some((u) => u.role === 'site_engineer');
      if (!hasPM || !hasFM || !hasSE) {
        const missingRoles: string[] = [];
        if (!hasPM) missingRoles.push('Project Manager');
        if (!hasFM) missingRoles.push('Finance Manager');
        if (!hasSE) missingRoles.push('Site Engineer');
        throw new BadRequestException(
          `Company setup incomplete: You must create at least one ${missingRoles.join(', ')} before creating projects.`,
        );
      }
    }

    this.validateProjectUserAssignments(dto, companyId);
    // Spend is calculated from approved expenses, so a new project always starts at zero.
    const payload = { ...dto, companyId, spent: 0, progress: Number(dto.progress) || 0 };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager')
  @ApiOperation({ summary: 'Update a project. Company Admin: any field. Project Manager: own projects. Finance Manager: budget split of own projects. Site Engineer: progress of a project without milestones.' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    const changes: Record<string, any> = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
      const onlyFields = (allowed: string[], who: string) => {
        const extra = Object.keys(changes).filter((k) => !allowed.includes(k) && !(k === 'companyId' && changes[k] === existing.companyId));
        if (extra.length) throw new ForbiddenException(`${who} cannot change ${extra.join(', ')} on a project.`);
      };
      if (user.role === 'project_manager' && existing.managerId !== user.userId) {
        throw new ForbiddenException('Only the project manager of this project (or the Company Admin) can edit it.');
      }
      if (user.role === 'finance_manager') {
        if (existing.financeManagerId !== user.userId) throw new ForbiddenException('Only the Finance Manager of this project can change its budget split.');
        onlyFields(['allocations', 'budget'], 'A Finance Manager');
      }
      if (user.role === 'site_engineer') {
        const tasks = this.moduleRef.get(TasksRepository, { strict: false });
        if (!tasks.hasOpenTask(user.userId, id)) throw new ForbiddenException('You can only report progress on a project where you have an unfinished task assigned to you.');
        onlyFields(['progress'], 'A Site Engineer');
        if (existing.progressMode === 'milestones') {
          throw new BadRequestException('Progress of this project is calculated from its milestones.');
        }
        if (Number(changes.progress) < Number(existing.progress || 0)) {
          throw new BadRequestException('Reported progress cannot go below the current progress.');
        }
      }
    }
    // The site budget of an awarded (staged) project is the Finance Manager's cap. Only the Company Admin can raise it,
    // and the normal way is a contingency top-up request (see /budget-topups), so staff cannot move it by hand.
    if (existing.internalBaseCost !== undefined && user && !['company_admin', 'superuser'].includes(user.role)
      && changes.budget !== undefined && Number(changes.budget) !== Number(existing.budget)) {
      throw new ForbiddenException('The site budget of this project is fixed. Ask the Company Admin for a contingency top-up instead.');
    }
    // A budget can never be set below what has already been approved as spend.
    if (changes.budget !== undefined && Number(changes.budget) < Number(existing.spent || 0)) {
      throw new BadRequestException(`The budget cannot be lower than what is already spent (${existing.spent}).`);
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (changes.companyId !== undefined ? changes.companyId : existing.companyId)
      : existing.companyId;

    this.validateProjectUserAssignments(changes, companyId, id);

    const payload = { ...changes, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Delete a project that has no financial or site records yet (its tasks and milestones go with it)' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
      if (user.role === 'project_manager' && existing.managerId !== user.userId) {
        throw new ForbiddenException('Only the project manager of this project (or the Company Admin) can delete it.');
      }
    }
    // Money and site records must never point at a project that no longer exists.
    const get = <T>(cls: any): T => this.moduleRef.get(cls, { strict: false });
    const blockers: string[] = [];
    const count = (n: number, label: string) => { if (n > 0) blockers.push(`${n} ${label}`); };
    count(get<BillsRepository>(BillsRepository).findAll().filter((b: any) => b.projectId === id).length, 'bill(s)');
    count(get<PaymentsRepository>(PaymentsRepository).findAll().filter((p: any) => p.projectId === id).length, 'payment(s)');
    count(get<ExpensesRepository>(ExpensesRepository).findByProjectId(id).filter((e: any) => e.status !== 'cancelled').length, 'expense claim(s)');
    count(get<PurchaseOrdersRepository>(PurchaseOrdersRepository).findAll().filter((p: any) => p.projectId === id && p.status !== 'cancelled').length, 'purchase order(s)');
    count(get<ContractsRepository>(ContractsRepository).findAll().filter((c: any) => c.projectId === id).length, 'contract(s)');
    count(get<ReportsRepository>(ReportsRepository).findAll().filter((r: any) => r.projectId === id).length, 'site report(s)');
    if (blockers.length > 0) {
      throw new ConflictException(`"${existing.name}" cannot be deleted because it has ${blockers.join(', ')}. Mark it Completed or On Hold instead.`);
    }
    // Nothing financial yet: remove its planning records with it.
    const tasks = get<TasksRepository>(TasksRepository);
    tasks.findAll().filter((t: any) => t.projectId === id).map((t: any) => t.id).forEach((tid: string) => tasks.remove(tid));
    const milestones = get<MilestonesRepository>(MilestonesRepository);
    milestones.findByProjectId(id).map((m) => m.id).forEach((mid) => milestones.remove(mid));
    return this.service.remove(id);
  }
}
