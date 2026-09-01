import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './create-notification.dto';
import { UpdateNotificationDto } from './update-notification.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';

@ApiTags('notifications')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve notifications (Superuser: all, Users: user/company notifications)' })
  @ApiResponse({ status: 200, description: 'List of notifications.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    return this.service.findAll().filter(
      (n) => n.userId === user.userId || (n.companyId && n.companyId === user.companyId)
    );
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific notification by ID' })
  @ApiResponse({ status: 200, description: 'The notification details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const notification = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (notification.userId !== user.userId) {
        TenantHelper.validateCompanyAccess(user, notification.companyId);
      }
    }
    return notification;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Create a new notification (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The notification has been successfully created.', type: CreateNotificationDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const payload = { ...dto, companyId };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Update an existing notification' })
  @ApiResponse({ status: 200, description: 'The notification has been successfully updated.', type: UpdateNotificationDto })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (existing.userId !== user.userId) {
        TenantHelper.validateCompanyAccess(user, existing.companyId);
      }
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'The notification has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (existing.userId !== user.userId) {
        TenantHelper.validateCompanyAccess(user, existing.companyId);
      }
    }
    return this.service.remove(id);
  }
}
