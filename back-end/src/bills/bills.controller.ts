import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { BillsService, billDecision } from './bills.service';
import { IsNumber, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBillDto } from './create-bill.dto';
import { UpdateBillDto } from './update-bill.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';

export class RecordPaymentDto {
  @ApiProperty({ example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100000000000)
  amount: number;

  @ApiPropertyOptional({ example: 'Bank transfer', description: 'Finance manager only; clients always pay through the demo gateway' })
  @IsOptional() @IsString() @MaxLength(30)
  method?: string;

  @ApiPropertyOptional({ example: 'NEFT-778812' })
  @IsOptional() @IsString() @MaxLength(80)
  reference?: string;

  @ApiPropertyOptional({ example: '2026-11-09' })
  @IsOptional() @IsString() @MaxLength(10)
  paidAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

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

  @Get('billable/:projectId')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Stage-billing sheet: milestones with quoted amount, site reports, billed state and internal spend (staff only)' })
  billable(@Param('projectId') projectId: string, @CurrentUser() user: UserContext) {
    return this.service.billable(user, projectId);
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
    return this.service.create(payload, user);
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
    // A client may only DECIDE a pending bill (accept / decline). Amount, parties and everything else stay untouched,
    // and the decision date is set by the server.
    if (user && TenantHelper.isClient(user)) {
      const decision = dto.status ? billDecision(dto.status) : undefined;
      if (!decision || decision === 'Pending Decision') {
        throw new BadRequestException('A client can only accept or decline a bill.');
      }
      if (billDecision(existing.status) !== 'Pending Decision') {
        throw new ConflictException('This bill was already decided and cannot be changed.');
      }
      const clientPayload: Record<string, any> = { status: decision === 'Accepted' ? 'Accepted' : 'Declined', decisionDate: new Date().toISOString().split('T')[0] };
      if (decision === 'Declined') clientPayload.rejectionReason = String((dto as any).rejectionReason || '').trim().slice(0, 500);
      return this.service.update(id, clientPayload);
    }

    // Everyone else cannot decide a bill on the client's behalf.
    if (user && !TenantHelper.isSuperuser(user) && dto.status !== undefined && billDecision(dto.status) !== billDecision(existing.status)) {
      throw new ForbiddenException('Only the client can accept or decline a bill.');
    }

    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Get(':id/payments')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'client')
  @ApiOperation({ summary: 'Payments received against a bill' })
  payments(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.listPayments(user, id);
  }

  @Post(':id/payments')
  @Roles('client', 'finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Pay an ACCEPTED bill. Client: demo "Pay now". Finance Manager: record money received offline. Partial payments allowed.' })
  @ApiResponse({ status: 400, description: 'Bill not accepted, or amount above the outstanding balance.' })
  pay(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: UserContext) {
    return this.service.recordPayment(user, id, dto);
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

@ApiTags('payments')
@UseGuards(RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: BillsService) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'client')
  @ApiOperation({ summary: 'Payment history the caller may see (client: own bills; finance manager: own projects; company roles: company)' })
  list(@CurrentUser() user: UserContext) {
    return this.service.listPayments(user);
  }
}
