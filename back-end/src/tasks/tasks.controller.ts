import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';

@ApiTags('tasks')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve tasks (Superuser: all, Tenant: company tasks)' })
  @ApiResponse({ status: 200, description: 'List of tasks.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      throw new ForbiddenException('Clients do not have access to internal site tasks.');
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific task by ID' })
  @ApiResponse({ status: 200, description: 'The task details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    if (TenantHelper.isClient(user)) {
      throw new ForbiddenException('Clients do not have access to internal site tasks.');
    }
    const task = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, task.companyId);
    }
    return task;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Create a new task (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The task has been successfully created.', type: CreateTaskDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const payload = { ...dto, companyId };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Update an existing task' })
  @ApiResponse({ status: 200, description: 'The task has been successfully updated.', type: UpdateTaskDto })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'The task has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
