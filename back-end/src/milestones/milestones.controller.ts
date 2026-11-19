import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './milestone.dto';

const READERS = ['superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client', 'procurement_storekeeper'] as const;

@ApiTags('Milestones')
@UseGuards(RolesGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get()
  @Roles(...READERS)
  @ApiOperation({ summary: 'List milestones the caller may see (optionally for one project)' })
  @ApiQuery({ name: 'projectId', required: false })
  list(@Query('projectId') projectId: string | undefined, @CurrentUser() user: UserContext) {
    return this.service.list(user, projectId || undefined);
  }

  // Declared before ':id' so "progress" is not read as a milestone id.
  @Get('progress/:projectId')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Physical progress (weighted) and milestone completion for a project, with all milestones' })
  progress(@Param('projectId') projectId: string, @CurrentUser() user: UserContext) {
    return this.service.projectSummary(user, projectId);
  }

  @Get(':id')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Milestone details (with tasks for company staff)' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.getOne(user, id);
  }

  @Post()
  @Roles('company_admin', 'project_manager')
  @ApiOperation({ summary: 'Create a milestone (assigned project manager or company admin)' })
  create(@Body() dto: CreateMilestoneDto, @CurrentUser() user: UserContext) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('company_admin', 'project_manager')
  @ApiOperation({ summary: 'Edit name, description, deadline or weight of a milestone' })
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @CurrentUser() user: UserContext) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('company_admin', 'project_manager')
  @ApiOperation({ summary: 'Delete a milestone (its tasks are kept, unassigned)' })
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.remove(user, id);
  }

  @Post(':id/approve')
  @Roles('company_admin', 'project_manager')
  @ApiOperation({ summary: 'Verify and approve a milestone whose tasks are all complete' })
  approve(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.approve(user, id);
  }

  @Post(':id/reopen')
  @Roles('company_admin', 'project_manager')
  @ApiOperation({ summary: 'Reopen an approved milestone (e.g. approved by mistake or rework needed)' })
  reopen(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.reopen(user, id);
  }
}
