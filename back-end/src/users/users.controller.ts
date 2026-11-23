import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
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
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Create a new user (Company ID & role validated by backend)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: CreateUserDto })
  @ApiResponse({ status: 400, description: 'Invalid input or domain mismatch.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user?: UserContext) {
    // 1. Role escalation check
    if (dto.role === 'superuser') {
      throw new ForbiddenException('Platform Superuser accounts cannot be created via user management.');
    }

    if (user && user.role === 'company_admin') {
      const allowedRoles = ['project_manager', 'site_engineer', 'finance_manager', 'procurement_storekeeper', 'client'];
      if (!allowedRoles.includes(dto.role)) {
        throw new ForbiddenException(
          'Company Admin can only create Project Manager, Site Engineer, Finance Manager, Procurement/Storekeeper, and Client accounts.',
        );
      }
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

    // Clients are platform-level: no company membership, only a record of who invited them.
    if (dto.role === 'client') {
      return this.service.create({ ...dto, companyId: '', invitedByCompanyId: companyId || '' });
    }

    const payload = { ...dto, companyId };
    return this.service.create(payload);
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
    if (!TenantHelper.isSuperuser(user) && user) {
      if (id !== user.userId) {
        if (targetUser.role === 'client') {
          if (!this.isClientOwnedByCompany(targetUser, user.companyId)) {
            throw new ForbiddenException('Access denied. You can only edit clients created by your company.');
          }
        } else {
          TenantHelper.validateCompanyAccess(user, targetUser.companyId);
        }
      }
    }

    // Prevent modifying user role upon edit
    if (dto.role && dto.role !== targetUser.role && !TenantHelper.isSuperuser(user)) {
      throw new BadRequestException('User role cannot be changed once created.');
    }

    // Role escalation check on update
    if (dto.role) {
      if (dto.role === 'superuser' && targetUser.role !== 'superuser') {
        throw new ForbiddenException('Cannot elevate account to Superuser role.');
      }
      if (user && user.role === 'company_admin' && dto.role !== targetUser.role && (dto.role === 'superuser' || dto.role === 'company_admin')) {
        throw new ForbiddenException('Company Admin cannot elevate account to Superuser or Company Admin roles.');
      }
    }

    // Prevent company admin from locking or deactivating own account
    if (user && user.role === 'company_admin' && id === user.userId && dto.status && dto.status !== 'active') {
      throw new BadRequestException('A company admin cannot lock or deactivate their own account.');
    }

    // Clients stay platform-level whoever edits them; staff keep their own company.
    const companyId = targetUser.role === 'client'
      ? ''
      : TenantHelper.isSuperuser(user)
        ? (dto.companyId !== undefined ? dto.companyId : targetUser.companyId)
        : (user ? user.companyId : targetUser.companyId);

    // Email Domain Validation on update (Clients are external parties)
    if (dto.email && companyId && targetUser.role !== 'client' && dto.role !== 'client') {
      const company = this.companiesService.findOne(companyId);
      const emailDomain = dto.email.split('@')[1]?.toLowerCase();
      const targetDomain = company.domain.toLowerCase();
      if (!emailDomain || emailDomain !== targetDomain) {
        throw new BadRequestException(
          `User email domain (@${emailDomain || 'invalid'}) must match company domain (@${targetDomain}).`,
        );
      }
    }

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
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
      if (user.role === 'company_admin' && id === user.userId) {
        throw new BadRequestException('A company admin cannot delete their own account.');
      }
      if (targetUser.role === 'client') {
        if (!this.isClientOwnedByCompany(targetUser, user.companyId)) {
          throw new ForbiddenException('Access denied. You can only delete clients created by your company.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, targetUser.companyId);
      }
    }
    return this.service.remove(id);
  }
}
