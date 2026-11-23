import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './create-company.dto';
import { RegisterCompanyDto } from './register-company.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';
import { ProjectsRepository } from '../projects/projects.repository';
import { SUBSCRIPTION_PLANS } from './subscription-plans';
import { ApprovalDecisionDto } from './approval-decision.dto';

@ApiTags('Companies')
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer JWT token',
  required: false,
})
@UseGuards(RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly projectsRepo: ProjectsRepository,
  ) {}

  /** What a client may see about a company they have a project with. */
  private publicCompany(c: any) {
    return { id: c.id, name: c.name, code: c.code, domain: c.domain, phone: c.phone };
  }

  @Post('register')
  @ApiOperation({ summary: 'Public self-service company registration & initial admin onboarding' })
  @ApiResponse({ status: 201, description: 'Company and initial admin created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error, domain mismatch, or duplicate company/admin.' })
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.companiesService.registerCompany(dto);
  }

  @Get('platform/revenue')
  @Roles('superuser')
  @ApiOperation({ summary: 'Retrieve Platform Revenue, MRR, ARR, and SaaS subscription metrics (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Platform revenue metrics returned successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-superusers.' })
  getPlatformRevenue() {
    return this.companiesService.getPlatformRevenue();
  }

  @Get(':id/subscription')
  @Roles('superuser', 'company_admin')
  @ApiOperation({ summary: 'Get company subscription & SaaS plan details' })
  @ApiResponse({ status: 200, description: 'Subscription details returned.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  getCompanySubscription(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    TenantHelper.validateCompanyAccess(user, id);
    return this.companiesService.getCompanySubscription(id);
  }

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'List companies (Superuser sees all, tenant users see their company)' })
  @ApiResponse({ status: 200, description: 'List of companies returned successfully.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.companiesService.findAll();
    }
    if (TenantHelper.isClient(user)) {
      const ids = TenantHelper.clientCompanyIds(user, this.projectsRepo.findAll());
      return this.companiesService.findAll().filter((c) => ids.includes(c.id as string)).map((c) => this.publicCompany(c));
    }
    if (!user.companyId) return [];
    try {
      const company = this.companiesService.findOne(user.companyId);
      return [company];
    } catch (e) {
      return [];
    }
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer', 'finance_manager', 'client', 'procurement_storekeeper')
  @ApiOperation({ summary: 'Get company details by ID' })
  @ApiResponse({ status: 200, description: 'Company details returned.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    if (TenantHelper.isClient(user)) {
      const ids = TenantHelper.clientCompanyIds(user, this.projectsRepo.findAll());
      if (!ids.includes(id)) {
        throw new ForbiddenException('Access denied. You can only view companies you have a project with.');
      }
      return this.publicCompany(this.companiesService.findOne(id));
    }
    TenantHelper.validateCompanyAccess(user, id);
    return this.companiesService.findOne(id);
  }

  @Post('onboard')
  @Roles('superuser')
  @ApiOperation({ summary: 'Onboard a new firm directly as approved with initial Company Admin (Superuser only)' })
  @ApiResponse({ status: 201, description: 'Company onboarded and approved.' })
  onboardCompany(@Body() dto: any) {
    return this.companiesService.onboardCompany(dto);
  }

  @Post()
  @Roles('superuser')
  @ApiOperation({ summary: 'Create a company directly (Superuser only; self-service signup uses POST /companies/register)' })
  @ApiResponse({ status: 201, description: 'Company created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate company code.' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Patch(':id/approval')
  @Roles('superuser')
  @ApiOperation({ summary: 'Approve or reject a newly registered company (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Approval decision saved.' })
  @ApiResponse({ status: 400, description: 'Invalid decision or missing rejection reason.' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-superusers.' })
  setApproval(@Param('id') id: string, @Body() dto: ApprovalDecisionDto, @CurrentUser() user?: UserContext) {
    return this.companiesService.setApproval(id, dto.decision, dto.reason, user?.userId || 'superuser');
  }

  @Patch(':id/overage')
  @Roles('superuser', 'company_admin')
  @ApiOperation({ summary: 'Toggle usage-based overage billing for a tenant' })
  @ApiResponse({ status: 200, description: 'Overage billing setting updated successfully.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  toggleOverage(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user?: UserContext,
  ) {
    TenantHelper.validateCompanyAccess(user, id);
    const enabled = body && body.overageEnabled !== undefined ? body.overageEnabled : (body && body.enabled !== undefined ? body.enabled : true);
    return this.companiesService.toggleOverage(id, !!enabled, body);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin')
  @ApiOperation({ summary: 'Update company details or self-service subscription plan' })
  @ApiResponse({ status: 200, description: 'Company updated successfully.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user?: UserContext) {
    TenantHelper.validateCompanyAccess(user, id);

    if (body && body.plan !== undefined && !SUBSCRIPTION_PLANS[body.plan]) {
      throw new BadRequestException(`Unknown plan "${body.plan}".`);
    }

    // Company admins may only change basic profile fields and their own plan/billing cycle.
    // Approval, status, custom limits and overage are platform-admin controls.
    if (!TenantHelper.isSuperuser(user)) {
      const safe: Record<string, any> = {};
      for (const key of CompaniesService.SELF_SERVICE_FIELDS) {
        if (body && body[key] !== undefined) safe[key] = body[key];
      }
      return this.companiesService.update(id, safe);
    }
    return this.companiesService.update(id, body);
  }

  @Delete(':id')
  @Roles('superuser')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a company by ID (Superuser only)' })
  @ApiResponse({ status: 204, description: 'Company deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  remove(@Param('id') id: string) {
    this.companiesService.remove(id);
  }
}
