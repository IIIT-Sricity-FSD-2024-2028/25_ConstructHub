import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UsersRepository } from '../users/users.repository';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';
import { UpdateMessageDto } from './update-message.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';
import { ProjectsRepository } from '../projects/projects.repository';

@ApiTags('messages')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly projectsRepo: ProjectsRepository,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Messages are private conversations: only the sender and the receiver see them (the superuser sees all). */
  private isParticipant(user: UserContext, m: any) {
    return [m.from, m.to, m.senderId, m.receiverId].includes(user.userId);
  }

  /** Who may this user write to? Colleagues of the same company, and the clients of the company's projects (and back). */
  private assertCanMessage(user: UserContext, receiverId: string, companyId: string) {
    const users = this.moduleRef.get(UsersRepository, { strict: false });
    const receiver = users.findById(receiverId);
    if (!receiver || receiver.status === 'inactive') throw new NotFoundException('Recipient not found.');
    if (receiver.id === user.userId) throw new BadRequestException('You cannot send a message to yourself.');
    if (TenantHelper.isSuperuser(user)) return;
    const projects = this.projectsRepo.findAll();
    if (receiver.role === 'client') {
      const ok = projects.some((p) => p.companyId === companyId && p.clientId === receiver.id) || receiver.invitedByCompanyId === companyId;
      if (TenantHelper.isClient(user) || !ok) throw new ForbiddenException('You can only message clients of your company\'s projects.');
      return;
    }
    if (receiver.role === 'superuser' || receiver.companyId !== companyId) {
      throw new ForbiddenException('You can only message people of the same company.');
    }
  }


  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve messages (Superuser: all, Tenant: company messages, Client: direct user messages)' })
  @ApiResponse({ status: 200, description: 'List of messages.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    return this.service.findAll().filter((m) => this.isParticipant(user, m));
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Retrieve a specific message by ID' })
  @ApiResponse({ status: 200, description: 'The message details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const message = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (!this.isParticipant(user, message)) throw new ForbiddenException('Access denied. You can only view your own conversations.');
    }
    return message;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Create a new message (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The message has been successfully created.', type: CreateMessageDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateMessageDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.isClient(user)
      ? TenantHelper.resolveClientCompanyId(user, dto.companyId, this.projectsRepo.findAll())
      : TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const receiverId = dto.receiverId || dto.to;
    if (!receiverId) throw new BadRequestException('Choose who the message is for.');
    if (user) this.assertCanMessage(user, receiverId, companyId);
    const text = String((dto as any).text ?? (dto as any).content ?? '').trim();
    if (!text) throw new BadRequestException('The message is empty.');
    // The sender is always the signed-in user, whatever the body says.
    const senderName = user ? (this.moduleRef.get(UsersRepository, { strict: false }).findById(user.userId)?.name || dto.senderName) : dto.senderName;
    const payload = { ...dto, text, companyId, from: user?.userId || dto.from, senderId: user?.userId || dto.senderId, senderName, fromName: senderName, to: receiverId, receiverId };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Update an existing message' })
  @ApiResponse({ status: 200, description: 'The message has been successfully updated.', type: UpdateMessageDto })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (!this.isParticipant(user, existing)) throw new ForbiddenException('Access denied. You can only change your own conversations.');
      const isSender = existing.from === user.userId || existing.senderId === user.userId;
      // The sender may correct the text; either side may mark it read. Nobody rewrites who sent it or to whom.
      const allowed = isSender ? ['text', 'content', 'read'] : ['read'];
      const extra = Object.keys(dto).filter((k) => (dto as any)[k] !== undefined && !allowed.includes(k));
      if (extra.length) throw new ForbiddenException(`You cannot change ${extra.join(', ')} of this message.`);
    }
    return this.service.update(id, { ...dto, companyId: existing.companyId });
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'The message has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (existing.from !== user.userId && existing.senderId !== user.userId) {
        throw new ForbiddenException('Only the sender can delete a message.');
      }
    }
    return this.service.remove(id);
  }
}
