import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './create-notification.dto';
import { UpdateNotificationDto } from './update-notification.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('notifications')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all notifications' })
  @ApiResponse({ status: 200, description: 'List of all notifications.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific notification by ID' })
  @ApiResponse({ status: 200, description: 'The notification details.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'The notification has been successfully created.', type: CreateNotificationDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateNotificationDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Update an existing notification' })
  @ApiResponse({ status: 200, description: 'The notification has been successfully updated.', type: UpdateNotificationDto })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'The notification has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
