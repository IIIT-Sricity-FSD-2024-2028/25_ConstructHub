import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@UseGuards(RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles('client', 'project_manager', 'finance_manager', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Live numbers for the caller\'s dashboard (budget vs spent, receivables, pending approvals, progress, marketplace)' })
  get(@CurrentUser() user: UserContext) {
    return this.service.get(user);
  }
}
