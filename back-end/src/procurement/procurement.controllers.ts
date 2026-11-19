import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { grnInvoiceUploadConfig } from './procurement-upload.config';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { ProcurementService } from './procurement.service';
import {
  CreateSupplierDto, UpdateSupplierDto, CreateMaterialRequestDto, DecisionDto, CreatePurchaseOrderDto, CancelDto,
  CreateGoodsReceiptDto, CreateMaterialIssueDto, UpdateProcurementSettingsDto,
} from './procurement.dto';

const PROC = 'procurement_storekeeper';

@ApiTags('Procurement - Suppliers')
@UseGuards(RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager')
  @ApiOperation({ summary: "The company's supplier directory" })
  list(@CurrentUser() user: UserContext) { return this.service.listSuppliers(user); }

  @Post()
  @Roles(PROC)
  @ApiOperation({ summary: 'Add a supplier' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: UserContext) { return this.service.createSupplier(user, dto); }

  @Patch(':id')
  @Roles(PROC)
  @ApiOperation({ summary: 'Edit a supplier or mark it inactive' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: UserContext) { return this.service.updateSupplier(user, id, dto); }

  @Delete(':id')
  @Roles(PROC)
  @ApiOperation({ summary: 'Delete a supplier that has no purchase orders' })
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.removeSupplier(user, id); }
}

@ApiTags('Procurement - Material Requests')
@UseGuards(RolesGuard)
@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles('site_engineer', 'project_manager', 'finance_manager', 'company_admin', PROC)
  @ApiOperation({ summary: 'Site engineer: own requests. PM/FM: their projects. Procurement: approved requests to order.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  list(@Query() query: Record<string, any>, @CurrentUser() user: UserContext) { return this.service.listRequests(user, query); }

  @Get(':id')
  @Roles('site_engineer', 'project_manager', 'finance_manager', 'company_admin', PROC)
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.getRequest(user, id); }

  @Post()
  @Roles('site_engineer')
  @ApiOperation({ summary: 'Site engineer requests materials for a project they work on' })
  create(@Body() dto: CreateMaterialRequestDto, @CurrentUser() user: UserContext) { return this.service.createRequest(user, dto); }

  @Post(':id/cancel')
  @Roles('site_engineer')
  @ApiOperation({ summary: 'Cancel your own request while it is still waiting for approval' })
  cancel(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.cancelRequest(user, id); }

  @Post(':id/approve')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Project manager verifies and approves a request' })
  approve(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: UserContext) { return this.service.decideRequest(user, id, true, dto?.note); }

  @Post(':id/reject')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Project manager rejects a request (reason required)' })
  reject(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: UserContext) { return this.service.decideRequest(user, id, false, dto?.note); }
}

@ApiTags('Procurement - Purchase Orders')
@UseGuards(RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager', 'site_engineer')
  @ApiOperation({ summary: 'Purchase orders the caller may see (site engineers see them without prices)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  list(@Query() query: Record<string, any>, @CurrentUser() user: UserContext) { return this.service.listOrders(user, query); }

  @Get(':id')
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager', 'site_engineer')
  @ApiOperation({ summary: 'Purchase order with budget check and receipts' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.getOrder(user, id); }

  @Post()
  @Roles(PROC)
  @ApiOperation({ summary: 'Create a purchase order from an approved material request' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: UserContext) { return this.service.createOrder(user, dto); }

  @Post(':id/approve')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: "Finance Manager approves an order that is above the company limit or over the project's budget" })
  approve(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: UserContext) { return this.service.decideOrder(user, id, true, dto?.note); }

  @Post(':id/reject')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Finance Manager rejects an order (reason required)' })
  reject(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: UserContext) { return this.service.decideOrder(user, id, false, dto?.note); }

  @Post(':id/cancel')
  @Roles(PROC)
  @ApiOperation({ summary: 'Cancel an order before any material was received' })
  cancel(@Param('id') id: string, @Body() dto: CancelDto, @CurrentUser() user: UserContext) { return this.service.cancelOrder(user, id, dto.reason); }
}

@ApiTags('Procurement - Goods Receipts')
@UseGuards(RolesGuard)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager')
  @ApiQuery({ name: 'poId', required: false })
  list(@Query('poId') poId: string | undefined, @CurrentUser() user: UserContext) { return this.service.listReceipts(user, poId || undefined); }

  @Post()
  @Roles(PROC)
  @ApiOperation({ summary: 'Record a (partial) delivery against an approved purchase order; this adds the material to site stock' })
  create(@Body() dto: CreateGoodsReceiptDto, @CurrentUser() user: UserContext) { return this.service.createReceipt(user, dto); }

  @Post(':id/invoice')
  @Roles(PROC)
  @UseInterceptors(FileInterceptor('invoice', grnInvoiceUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { invoice: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: "Attach the vendor's delivery challan / invoice (PDF or image, 5 MB) to a goods receipt" })
  attachInvoice(@Param('id') id: string, @UploadedFile() file: any, @CurrentUser() user: UserContext) { return this.service.attachInvoice(user, id, file); }

  @Get(':id/invoice')
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager')
  @ApiOperation({ summary: 'Download the vendor invoice of a goods receipt (authenticated; not publicly served)' })
  downloadInvoice(@Param('id') id: string, @CurrentUser() user: UserContext, @Res() res: Response) {
    const f = this.service.getInvoiceFile(user, id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(f.path, f.name);
  }
}

@ApiTags('Procurement - Stock')
@UseGuards(RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager', 'site_engineer')
  @ApiOperation({ summary: 'Current stock per project (changes only through goods receipts and material issues)' })
  @ApiQuery({ name: 'projectId', required: false })
  stock(@Query('projectId') projectId: string | undefined, @CurrentUser() user: UserContext) { return this.service.listStock(user, projectId || undefined); }

  @Get('ledger')
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager', 'site_engineer')
  @ApiOperation({ summary: 'Stock movements, newest first' })
  @ApiQuery({ name: 'projectId', required: false })
  ledger(@Query('projectId') projectId: string | undefined, @CurrentUser() user: UserContext) { return this.service.ledger(user, projectId || undefined); }

  @Get('issues')
  @Roles(PROC, 'company_admin', 'project_manager', 'finance_manager', 'site_engineer')
  @ApiQuery({ name: 'projectId', required: false })
  issues(@Query('projectId') projectId: string | undefined, @CurrentUser() user: UserContext) { return this.service.listIssues(user, projectId || undefined); }

  @Post('issues')
  @Roles(PROC)
  @ApiOperation({ summary: 'Issue material from site stock to a site engineer / task' })
  issue(@Body() dto: CreateMaterialIssueDto, @CurrentUser() user: UserContext) { return this.service.createIssue(user, dto); }
}

@ApiTags('Procurement - Settings')
@UseGuards(RolesGuard)
@Controller('procurement/settings')
export class ProcurementSettingsController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  @Roles('company_admin', 'finance_manager', PROC)
  @ApiOperation({ summary: 'Purchase approval limit of the company' })
  get(@CurrentUser() user: UserContext) { return this.service.getSettings(user); }

  @Patch()
  @Roles('company_admin')
  @ApiOperation({ summary: 'Set the amount above which purchase orders need Finance Manager approval' })
  update(@Body() dto: UpdateProcurementSettingsDto, @CurrentUser() user: UserContext) { return this.service.updateSettings(user, dto.poApprovalLimit); }
}
