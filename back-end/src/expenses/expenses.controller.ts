import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFiles, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, DecisionNoteDto, ReimburseDto } from './create-expense.dto';
import { UpdateExpenseDto } from './update-expense.dto';
import { expenseUploadConfig, MAX_RECEIPTS_PER_UPLOAD } from './expense-upload.config';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';

const READERS = ['superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer'] as const;

@ApiTags('Expenses')
@UseGuards(RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @Roles(...READERS, 'client')
  @ApiOperation({ summary: 'Site engineer: own claims. PM / FM: expenses of their projects. Company admin: all. Clients: none.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query() query: Record<string, any>, @CurrentUser() user: UserContext) {
    if (user.role === 'client') return [];
    return this.service.list(user, query);
  }

  @Get(':id')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Expense with its history and budget position' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.get(user, id); }

  @Post()
  @Roles('site_engineer')
  @ApiOperation({ summary: 'Site engineer submits an expense claim (attach receipts afterwards)' })
  submit(@Body() dto: CreateExpenseDto, @CurrentUser() user: UserContext) { return this.service.submit(user, dto); }

  @Patch(':id')
  @Roles('site_engineer')
  @ApiOperation({ summary: 'Correct a RETURNED expense and resubmit it' })
  resubmit(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: UserContext) { return this.service.resubmit(user, id, dto); }

  @Post(':id/withdraw')
  @Roles('site_engineer')
  @ApiOperation({ summary: 'Withdraw your own expense before it is verified' })
  withdraw(@Param('id') id: string, @CurrentUser() user: UserContext) { return this.service.withdraw(user, id); }

  @Post(':id/receipts')
  @Roles('site_engineer')
  @UseInterceptors(FilesInterceptor('receipts', MAX_RECEIPTS_PER_UPLOAD, expenseUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { receipts: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @ApiOperation({ summary: 'Attach receipts (PDF or image, 5 MB each, max 8 per expense)' })
  upload(@Param('id') id: string, @UploadedFiles() files: any[], @CurrentUser() user: UserContext) { return this.service.addReceipts(user, id, files); }

  @Get(':id/receipts/:receiptId')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Download a receipt (authenticated; never served publicly)' })
  download(@Param('id') id: string, @Param('receiptId') receiptId: string, @CurrentUser() user: UserContext, @Res() res: Response) {
    const file = this.service.getReceiptFile(user, id, receiptId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(file.path, file.name);
  }

  @Post(':id/verify')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Project manager verifies the expense (receipt required above INR 1,000)' })
  verify(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.pmDecision(user, id, 'verify', dto?.note); }

  @Post(':id/pm-return')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Project manager returns the expense to the engineer (reason required)' })
  pmReturn(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.pmDecision(user, id, 'return', dto?.note); }

  @Post(':id/pm-reject')
  @Roles('project_manager')
  @ApiOperation({ summary: 'Project manager rejects the expense (reason required)' })
  pmReject(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.pmDecision(user, id, 'reject', dto?.note); }

  @Post(':id/approve')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Finance Manager approves a verified expense; it then counts as project spend' })
  approve(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.fmDecision(user, id, 'approve', dto?.note); }

  @Post(':id/return')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Finance Manager returns a verified expense to the engineer (reason required)' })
  fmReturn(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.fmDecision(user, id, 'return', dto?.note); }

  @Post(':id/reject')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Finance Manager rejects a verified expense (reason required)' })
  fmReject(@Param('id') id: string, @Body() dto: DecisionNoteDto, @CurrentUser() user: UserContext) { return this.service.fmDecision(user, id, 'reject', dto?.note); }

  @Post(':id/reimburse')
  @Roles('finance_manager', 'company_admin')
  @ApiOperation({ summary: 'Record that the engineer was paid back (separate from approval)' })
  reimburse(@Param('id') id: string, @Body() dto: ReimburseDto, @CurrentUser() user: UserContext) { return this.service.reimburse(user, id, dto?.reference); }
}
