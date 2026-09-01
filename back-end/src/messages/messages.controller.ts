import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';
import { UpdateMessageDto } from './update-message.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';

@ApiTags('messages')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve messages (Superuser: all, Tenant: company messages, Client: direct user messages)' })
  @ApiResponse({ status: 200, description: 'List of messages.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      return this.service.findAll().filter(
        (m) => m.from === user.userId || m.to === user.userId || m.senderId === user.userId || m.receiverId === user.userId
      );
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific message by ID' })
  @ApiResponse({ status: 200, description: 'The message details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const message = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (TenantHelper.isClient(user)) {
        if (message.from !== user.userId && message.to !== user.userId && message.senderId !== user.userId && message.receiverId !== user.userId) {
          throw new ForbiddenException('Access denied. Client can only view direct messages.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, message.companyId);
      }
    }
    return message;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Create a new message (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The message has been successfully created.', type: CreateMessageDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateMessageDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const from = user ? user.userId : (dto.from || dto.senderId);
    const payload = { ...dto, companyId, from: from || dto.from };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Update an existing message' })
  @ApiResponse({ status: 200, description: 'The message has been successfully updated.', type: UpdateMessageDto })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto, @CurrentUser() user?: UserContext) {
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
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'The message has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
