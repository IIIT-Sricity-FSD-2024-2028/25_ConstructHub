import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { UpdatePlanDto } from './update-plan.dto';
import { UpdateOverageRatesDto } from './update-overage-rates.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Subscription Plans')
@UseGuards(RolesGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List subscription plans and overage rates (public, used by the registration page)' })
  @ApiResponse({ status: 200, description: 'Current plans and overage rates.' })
  findAll() {
    return this.plans.getAll();
  }

  // Declared before ':name' so "overage-rates" is not read as a plan name.
  @Patch('overage-rates')
  @Roles('superuser')
  @ApiOperation({ summary: 'Update per-user / per-project overage rates (Superuser only)' })
  updateOverageRates(@Body() dto: UpdateOverageRatesDto) {
    return this.plans.updateOverageRates(dto);
  }

  @Patch(':name')
  @Roles('superuser')
  @ApiOperation({ summary: 'Update a plan price, limits or description (Superuser only)' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  updatePlan(@Param('name') name: string, @Body() dto: UpdatePlanDto) {
    return this.plans.updatePlan(name, dto);
  }
}
