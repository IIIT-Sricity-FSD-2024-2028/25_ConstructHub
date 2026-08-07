import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './create-expense.dto';
import { UpdateExpenseDto } from './update-expense.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('expenses')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all expenses' })
  @ApiResponse({ status: 200, description: 'List of all expenses.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific expense by ID' })
  @ApiResponse({ status: 200, description: 'The expense details.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'finance_manager')
  @ApiOperation({ summary: 'Create a new expense (Superuser, Finance Manager)' })
  @ApiResponse({ status: 201, description: 'The expense has been successfully created.', type: CreateExpenseDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateExpenseDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'finance_manager')
  @ApiOperation({ summary: 'Update an existing expense (Superuser, Finance Manager)' })
  @ApiResponse({ status: 200, description: 'The expense has been successfully updated.', type: UpdateExpenseDto })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'finance_manager')
  @ApiOperation({ summary: 'Delete an expense (Superuser, Finance Manager)' })
  @ApiResponse({ status: 200, description: 'The expense has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
