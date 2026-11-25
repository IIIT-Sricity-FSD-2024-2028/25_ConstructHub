import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';
import { CompaniesService } from '../companies/companies.service';
import { ProjectsRepository } from '../projects/projects.repository';

@ApiTags('users')
@ApiHeader({ name: 'Authorization', required: false, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly projectsRepo: ProjectsRepository,
  ) {}

  /**
   * Clients are platform-level users (no companyId). A company can see:
   *  - clients it invited itself (invitedByCompanyId), and
   *  - clients who have a project with that company.
   */
  private isClientVisibleToCompany(client: any, companyId: string): boolean {
    if (!client || client.role !== 'client' || !companyId) return false;
    if (client.invitedByCompanyId === companyId) return true;
    return this.projectsRepo.findAll().some((p) => p.clientId === client.id && p.companyId === companyId);
  }

  /** A company may modify/delete only clients it created itself. */
  private isClientOwnedByCompany(client: any, companyId: string): boolean {
    return !!client && client.role === 'client' && !!companyId && client.invitedByCompanyId === companyId;
  }

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve users (Scoped by tenant companyId)' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      // A client sees themselves and the staff of companies they have a project with.
      const companyIds = TenantHelper.clientCompanyIds(user, this.projectsRepo.findAll());
      return this.service
        .findAll()
        .filter((u) => u.id === user.userId || (u.role !== 'client' && companyIds.includes(u.companyId)));
    }
    if (!user.companyId) {
      return this.service.findAll().filter((u) => u.id === user.userId);
    }
    const staff = this.service.findByCompanyId(user.companyId);
    const clients = this.service.findAll().filter((u) => this.isClientVisibleToCompany(u, user.companyId));
    return [...staff, ...clients];
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve a specific user by ID' })
  @ApiResponse({ status: 200, description: 'The user details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const targetUser = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (id === user.userId) return targetUser;
      if (TenantHelper.isClient(user)) {
        const companyIds = TenantHelper.clientCompanyIds(user, this.projectsRepo.findAll());
        if (targetUser.role === 'client' || !companyIds.includes(targetUser.companyId)) {
          throw new ForbiddenException('Access denied.');
        }
      } else if (targetUser.role === 'client') {
        if (!this.isClientVisibleToCompany(targetUser, user.companyId)) {
          throw new ForbiddenException('Access denied. This client is not associated with your company.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, targetUser.companyId);
      }
    }
    return targetUser;
  }

  @Post()
  @Roles('superuser', 'company_admin')
  @ApiOperation({ summary: 'Create a new user (Company ID & role validated by backend)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: CreateUserDto })
  @ApiResponse({ status: 400, description: 'Invalid input or domain mismatch.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user?: UserContext) {
    UsersController.assertPlainPassword(dto.password);
    // 1. Who may create which role
    if (dto.role === 'superuser') {
      throw new ForbiddenException('Platform Superuser accounts cannot be created via user management.');
    }
    if (user && user.role === 'company_admin' && !UsersController.ADMIN_CREATABLE.includes(dto.role)) {
      throw new ForbiddenException(
        'Company Admin can only create Project Manager, Site Engineer, Finance Manager, Procurement/Storekeeper, and Client accounts.',
      );
    }

    // 2. Authoritative companyId derivation
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);

    // 3. Backend Email Domain Validation (Clients are external parties)
    if (companyId && dto.role !== 'client') {
      const company = this.companiesService.findOne(companyId);
      const emailDomain = dto.email.split('@')[1]?.toLowerCase();
      const targetDomain = company.domain.toLowerCase();
      if (!emailDomain || emailDomain !== targetDomain) {
        throw new BadRequestException(
          `User email domain (@${emailDomain || 'invalid'}) must match company domain (@${targetDomain}).`,
        );
      }
    }

    // New accounts always start active unless an admin explicitly creates them inactive.
    const base = { ...dto, status: dto.status || 'active' };

    // Clients are platform-level: no company membership, only a record of who invited them.
    if (dto.role === 'client') {
      return this.service.create({ ...base, companyId: '', invitedByCompanyId: companyId || '' });
    }

    return this.service.create({ ...base, companyId });
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.', type: UpdateUserDto })
  @ApiResponse({ status: 400, description: 'Invalid input or domain mismatch.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user?: UserContext) {
    const targetUser = this.service.findOne(id);
    const isSelf = !!user && id === user.userId;
    const isSuper = TenantHelper.isSuperuser(user);
    const isAdmin = !!user && user.role === 'company_admin';
    const changes: Record<string, any> = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    const currentPassword = changes.currentPassword;
    delete changes.currentPassword;

    if (user && !isSuper) {
      if (!isSelf) {
        // Only a Company Admin manages other accounts: staff of the same company, or clients the company created.
        if (!isAdmin) throw new ForbiddenException('You can only edit your own account. Ask your Company Admin to change other accounts.');
        if (targetUser.role === 'client') {
          if (!this.isClientOwnedByCompany(targetUser, user.companyId)) {
            throw new ForbiddenException('Access denied. You can only edit clients created by your company.');
          }
        } else {
          TenantHelper.validateCompanyAccess(user, targetUser.companyId);
        }
      } else {
        // Your own account: profile fields and password only. Status and role are set by an admin.
        if (changes.status !== undefined) {
          if (changes.status !== targetUser.status) {
            throw new BadRequestException(isAdmin
              ? 'A company admin cannot lock or deactivate their own account.'
              : 'You cannot change the status of your own account.');
          }
          delete changes.status;
        }
        for (const k of ['role', 'companyId', 'createdAt']) {
          if (changes[k] !== undefined && changes[k] === (targetUser as any)[k]) delete changes[k];
        }
        const notAllowed = Object.keys(changes).filter((k) => !UsersController.SELF_EDITABLE.includes(k));
        if (notAllowed.length > 0) throw new ForbiddenException(`You cannot change ${notAllowed.join(', ')} on your own account.`);
      }
    }

    if (changes.password !== undefined) {
      UsersController.assertPlainPassword(changes.password);
      // Changing your OWN password needs the current one (an admin resetting someone else's does not).
      if (isSelf && !isSuper && !this.service.passwordMatches(id, String(currentPassword || ''))) {
        throw new BadRequestException('Your current password is not correct.');
      }
    }

    // Role is fixed once created (only the platform superuser may change it, and never to superuser).
    if (changes.role !== undefined && changes.role !== targetUser.role) {
      if (!isSuper) throw new BadRequestException('User role cannot be changed once created.');
      if (changes.role === 'superuser') throw new ForbiddenException('Cannot elevate account to Superuser role.');
    }

    // Clients stay platform-level whoever edits them; staff keep their own company.
    const companyId = targetUser.role === 'client'
      ? ''
      : isSuper
        ? (changes.companyId !== undefined ? changes.companyId : targetUser.companyId)
        : targetUser.companyId;

    // Email Domain Validation on update (Clients are external parties)
    if (changes.email && companyId && targetUser.role !== 'client') {
      const company = this.companiesService.findOne(companyId);
      const emailDomain = String(changes.email).split('@')[1]?.toLowerCase();
      const targetDomain = company.domain.toLowerCase();
      if (!emailDomain || emailDomain !== targetDomain) {
        throw new BadRequestException(
          `User email domain (@${emailDomain || 'invalid'}) must match company domain (@${targetDomain}).`,
        );
      }
    }

    if (Object.keys(changes).length === 0) throw new BadRequestException('Nothing to update.');
    return this.service.update(id, { ...changes, companyId });
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin')
  @ApiOperation({ summary: 'Delete a user (Superuser or Company Admin for company user)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const targetUser = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (id === user.userId) {
        throw new BadRequestException('You cannot delete your own account.');
      }
      if (targetUser.role === 'client') {
        if (!this.isClientOwnedByCompany(targetUser, user.companyId)) {
          throw new ForbiddenException('Access denied. You can only delete clients created by your company.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, targetUser.companyId);
      }
    }
    // Keep project records consistent: someone still on a project team (or a client with a project) cannot be removed.
    const linked = this.projectsRepo.findAll().filter((p) =>
      [p.managerId, p.financeManagerId, p.siteEngineerId, p.clientId].includes(id));
    if (linked.length > 0) {
      throw new ConflictException(
        `${targetUser.name} is still assigned to ${linked.length} project(s) (${linked.map((p) => p.name).slice(0, 3).join(', ')}). Reassign or close those projects first, or set the account to inactive.`,
      );
    }
    return this.service.remove(id);
  }

  /** Roles a Company Admin may create. */
  private static readonly ADMIN_CREATABLE = ['project_manager', 'site_engineer', 'finance_manager', 'procurement_storekeeper', 'client'];
  /** Fields anyone may change on their own account. */
  private static readonly SELF_EDITABLE = ['name', 'email', 'phone', 'avatar', 'password'];

  /** Passwords are always sent as plain text and hashed by the server, never as a ready-made hash. */
  private static assertPlainPassword(password?: string) {
    if (password !== undefined && /^\$2[aby]\$/.test(String(password))) {
      throw new BadRequestException('Send the password as plain text; the server hashes it.');
    }
  }
}
