import { Controller, Get, Post, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, MinLength, MaxLength } from 'class-validator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { UsersRepository } from '../users/users.repository';
import { FeedbackRepository, FEEDBACK_CATEGORIES } from './feedback.repository';
import { NotificationsService } from './notifications.service';
import { today } from '../utils/ids';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'P005' }) @IsString() @IsNotEmpty()
  projectId: string;

  @ApiProperty({ enum: FEEDBACK_CATEGORIES }) @IsIn(FEEDBACK_CATEGORIES)
  category: string;

  @ApiProperty({ example: 'Site cleanliness' }) @IsString() @MinLength(3) @MaxLength(100)
  subject: string;

  @ApiProperty({ example: 'Debris is not cleared at the end of the day.' }) @IsString() @MinLength(3) @MaxLength(1000)
  message: string;

  @ApiProperty({ enum: ['Low', 'Medium', 'High'] }) @IsIn(['Low', 'Medium', 'High'])
  priority: 'Low' | 'Medium' | 'High';
}

@ApiTags('Feedback')
@UseGuards(RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly repo: FeedbackRepository,
    private readonly projects: ProjectsRepository,
    private readonly users: UsersRepository,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @Roles('client', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Client: own submitted feedback. Project manager: feedback on projects they manage. Company admin: whole company.' })
  list(@CurrentUser() user: UserContext) {
    const rows = this.repo.findAll().filter((f) => {
      if (user.role === 'client') return f.clientId === user.userId;
      if (f.companyId !== user.companyId) return false;
      if (user.role === 'project_manager') return this.projects.findById(f.projectId)?.managerId === user.userId;
      return true;
    });
    return [...rows].sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
  }

  @Post()
  @Roles('client')
  @ApiOperation({ summary: 'Client sends feedback about one of their projects (kept permanently in their history)' })
  create(@Body() dto: CreateFeedbackDto, @CurrentUser() user: UserContext) {
    const project = this.projects.findById(dto.projectId);
    if (!project || project.clientId !== user.userId) throw new NotFoundException('Project not found.');
    const client = this.users.findById(user.userId);
    const saved = this.repo.create({
      companyId: project.companyId, projectId: project.id, projectName: project.name,
      clientId: user.userId, clientName: client?.name || 'Client',
      category: dto.category, subject: dto.subject.trim(), message: dto.message.trim(), priority: dto.priority, createdAt: new Date().toISOString(),
    });
    const body = `${saved.subject}: ${saved.message}`;
    [project.managerId].filter(Boolean).forEach((uid) =>
      this.notifications.create({
        userId: uid, companyId: project.companyId, type: 'feedback', title: `Client feedback (${saved.priority})`,
        body, message: body, date: today(), time: 'Just now', read: false,
      }),
    );
    return saved;
  }
}
