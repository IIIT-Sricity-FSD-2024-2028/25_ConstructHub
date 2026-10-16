import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillDto } from './create-bill.dto';
import { UpdateBillDto } from './update-bill.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';

@ApiTags('bills')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly service: BillsService) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve bills (Superuser: all, Tenant: company bills, Client: assigned bills)' })
  @ApiResponse({ status: 200, description: 'List of bills.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      return this.service.findAll().filter((b) => b.clientId === user.userId);
    }
    if (user.role === 'finance_manager') {
      return this.service.findByFinanceManager(user.companyId, user.userId);
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific bill by ID' })
  @ApiResponse({ status: 200, description: 'The bill details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const bill = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (TenantHelper.isClient(user)) {
        if (bill.clientId !== user.userId) {
          throw new ForbiddenException('Access denied. Client can only view assigned bills.');
        }
      } else if (user.role === 'finance_manager') {
        TenantHelper.validateCompanyAccess(user, bill.companyId);
        const myBills = this.service.findByFinanceManager(user.companyId, user.userId);
        if (!myBills.some((b) => b.id === bill.id)) {
          throw new ForbiddenException('Access denied. Finance Manager can only view bills for assigned projects.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, bill.companyId);
      }
    }
    return bill;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'finance_manager', 'project_manager')
  @ApiOperation({ summary: 'Create a new bill (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The bill has been successfully created.', type: CreateBillDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateBillDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const payload = { ...dto, companyId };
    return this.service.create(payload);
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'finance_manager', 'project_manager', 'client')
  @ApiOperation({ summary: 'Update an existing bill' })
  @ApiResponse({ status: 200, description: 'The bill has been successfully updated.', type: UpdateBillDto })
  @ApiResponse({ status: 400, description: 'Invalid bill update or status change forbidden.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateBillDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (TenantHelper.isClient(user)) {
        if (existing.clientId !== user.userId) {
          throw new ForbiddenException('Access denied. Client can only update assigned bills.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, existing.companyId);
      }

      // Business rule: Finance manager cannot edit a generated bill once decided by the client (Accepted or Declined),
      // and cannot modify the payment status directly (only clients decide acceptance/rejection).
      if (user.role === 'finance_manager') {
        const s = (existing.status || '').toLowerCase();
        if (s === 'accepted' || s === 'declined' || s === 'approved' || s === 'rejected') {
          throw new ForbiddenException(
            `A finance manager cannot edit a generated bill once a decision has been made by the client (${existing.status}).`,
          );
        }
        if (dto.status !== undefined && dto.status !== existing.status) {
          throw new ForbiddenException(
            'A finance manager cannot change the bill payment status. Payment status is determined by client decision.',
          );
        }
      }
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'finance_manager')
  @ApiOperation({ summary: 'Delete a bill' })
  @ApiResponse({ status: 200, description: 'The bill has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
