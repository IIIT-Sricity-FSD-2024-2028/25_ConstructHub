import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
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
  ) {}

  private validateProjectUserAssignments(dto: any, projectCompanyId: string) {
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

    // 2. Client Assignment Validation
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

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve projects (Superuser: all, Tenant: company projects, Client: assigned projects)' })
  @ApiResponse({ status: 200, description: 'List of projects.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      return this.service.findAll().filter((p) => p.clientId === user.userId);
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
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
      } else {
        TenantHelper.validateCompanyAccess(user, project.companyId);
      }
    }
    return project;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Create a new project (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The project has been successfully created.', type: CreateProjectDto })
  @ApiResponse({ status: 400, description: 'Invalid input or user assignment mismatch.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    this.validateProjectUserAssignments(dto, companyId);
    const payload = { ...dto, companyId };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager')
  @ApiOperation({ summary: 'Update an existing project' })
  @ApiResponse({ status: 200, description: 'The project has been successfully updated.', type: UpdateProjectDto })
  @ApiResponse({ status: 400, description: 'Invalid input or user assignment mismatch.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    this.validateProjectUserAssignments(dto, companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'The project has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
