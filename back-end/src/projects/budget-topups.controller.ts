import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { BudgetTopupsService } from './budget-topups.service';

export class RequestTopupDto {
  @ApiProperty({ example: 'P005' }) @IsString() @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 300000, description: 'Extra site budget requested, in INR' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000000000)
  amount: number;

  @ApiProperty({ example: 'Steel price rose 12% after the PO was approved' })
  @IsString() @MinLength(10) @MaxLength(500)
  reason: string;
}

export class TopupDecisionDto {
  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

@ApiTags('Budget top-ups')
@UseGuards(RolesGuard)
@Controller('budget-topups')
export class BudgetTopupsController {
  constructor(private readonly service: BudgetTopupsService) {}

  @Get()
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Finance manager: requests on own projects. Company admin: all requests of the company (with the remaining profit margin).' })
  list(@CurrentUser() user: UserContext) { return this.service.list(user); }

  @Post()
  @Roles('finance_manager')
  @ApiOperation({ summary: 'Finance manager asks the Company Admin to release part of the profit margin as extra site budget' })
  request(@Body() dto: RequestTopupDto, @CurrentUser() user: UserContext) { return this.service.request(user, dto); }

  @Post(':id/approve')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin approves: the amount moves from profit margin to the project site budget' })
  approve(@Param('id') id: string, @Body() dto: TopupDecisionDto, @CurrentUser() user: UserContext) { return this.service.approve(user, id, dto?.note); }

  @Post(':id/reject')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin rejects a top-up request (reason required)' })
  reject(@Param('id') id: string, @Body() dto: TopupDecisionDto, @CurrentUser() user: UserContext) { return this.service.reject(user, id, dto?.note); }
}
