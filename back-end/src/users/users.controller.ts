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

@ApiTags('users')
@ApiHeader({ name: 'Authorization', required: false, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly companiesService: CompaniesService,
  ) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client')
  @ApiOperation({ summary: 'Retrieve users (Scoped by tenant companyId)' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user || !user.companyId) {
      return this.service.findAll();
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific user by ID' })
  @ApiResponse({ status: 200, description: 'The user details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const targetUser = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (user.role === 'client' && id !== user.userId) {
        TenantHelper.validateCompanyAccess(user, targetUser.companyId);
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
      const allowedRoles = ['project_manager', 'site_engineer', 'finance_manager', 'client'];
      if (!allowedRoles.includes(dto.role)) {
        throw new ForbiddenException(
          'Company Admin can only create Project Manager, Site Engineer, Finance Manager, and Client accounts.',
        );
      }
    }

    // 2. Authoritative companyId derivation
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);

    // 3. Backend Email Domain Validation
    if (companyId) {
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
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.', type: UpdateUserDto })
  @ApiResponse({ status: 400, description: 'Invalid input or domain mismatch.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user?: UserContext) {
    const targetUser = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (id !== user.userId) {
        TenantHelper.validateCompanyAccess(user, targetUser.companyId);
      }
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

    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : targetUser.companyId)
      : (user ? user.companyId : targetUser.companyId);

    // Email Domain Validation on update
    if (dto.email && companyId) {
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
      TenantHelper.validateCompanyAccess(user, targetUser.companyId);
    }
    return this.service.remove(id);
  }
}
