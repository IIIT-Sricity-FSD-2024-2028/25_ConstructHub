import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { MarketplaceService } from './marketplace.service';
import { SaveQuotationDto, RejectQuotationDto, PmEstimateDto, FmEstimateDto, ReleaseQuotationDto } from './quotation.dto';

@ApiTags('Marketplace - Quotations')
@UseGuards(RolesGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly service: MarketplaceService) {}

  @Get()
  @Roles('client', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Company admin: own quotations. Client: quotations on own requirements. Superuser: all.' })
  findAll(@CurrentUser() user: UserContext) {
    return this.service.listQuotations(user);
  }

  @Get('estimates')
  @Roles('project_manager', 'finance_manager')
  @ApiOperation({ summary: 'PM / FM "Bid Estimates" queue: only the estimates assigned to the caller, only the step they own' })
  estimates(@CurrentUser() user: UserContext) {
    return this.service.listEstimates(user);
  }

  @Get(':id')
  @Roles('client', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Quotation details (404 for quotations the caller is not allowed to see)' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.getQuotation(user, id);
  }

  @Patch(':id')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin revises a submitted quotation before the deadline' })
  update(@Param('id') id: string, @Body() dto: SaveQuotationDto, @CurrentUser() user: UserContext) {
    return this.service.updateQuotation(user, id, dto);
  }

  @Patch(':id/pm-estimate')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Assigned PM defines milestone stages (name, days, material scope). The PM sets no costs.' })
  pmEstimate(@Param('id') id: string, @Body() dto: PmEstimateDto, @CurrentUser() user: UserContext) {
    return this.service.pmEstimate(user, id, dto);
  }

  @Patch(':id/fm-estimate')
  @Roles('finance_manager')
  @ApiOperation({ summary: 'Assigned FM prices every stage (internal cost) and proposes the mobilization advance %. The FM sets no markup.' })
  fmEstimate(@Param('id') id: string, @Body() dto: FmEstimateDto, @CurrentUser() user: UserContext) {
    return this.service.fmEstimate(user, id, dto);
  }

  @Post(':id/release')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin applies the profit markup % and sends the finished quotation to the client' })
  release(@Param('id') id: string, @Body() dto: ReleaseQuotationDto, @CurrentUser() user: UserContext) {
    return this.service.releaseQuotation(user, id, dto);
  }

  @Post(':id/withdraw')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin withdraws a submitted quotation' })
  withdraw(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.withdrawQuotation(user, id);
  }

  @Post(':id/reject')
  @Roles('client')
  @ApiOperation({ summary: 'Client rejects a quotation' })
  reject(@Param('id') id: string, @Body() dto: RejectQuotationDto, @CurrentUser() user: UserContext) {
    return this.service.rejectQuotation(user, id, dto?.reason);
  }

  @Post(':id/accept')
  @Roles('client')
  @ApiOperation({
    summary: 'Client accepts a quotation: other quotations are rejected, the requirement is awarded, and a contract + project are created',
  })
  accept(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.acceptQuotation(user, id);
  }
}
