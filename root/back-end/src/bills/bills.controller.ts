import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillDto } from './create-bill.dto';
import { UpdateBillDto } from './update-bill.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('bills')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly service: BillsService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all bills' })
  @ApiResponse({ status: 200, description: 'List of all bills.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific bill by ID' })
  @ApiResponse({ status: 200, description: 'The bill details.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'finance_manager', 'project_manager')
  @ApiOperation({ summary: 'Create a new bill (Superuser, Finance Manager, Project Manager)' })
  @ApiResponse({ status: 201, description: 'The bill has been successfully created.', type: CreateBillDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateBillDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'finance_manager', 'project_manager', 'client')
  @ApiOperation({ summary: 'Update an existing bill (Superuser, Finance Manager, Project Manager, Client)' })
  @ApiResponse({ status: 200, description: 'The bill has been successfully updated.', type: UpdateBillDto })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateBillDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'finance_manager')
  @ApiOperation({ summary: 'Delete a bill (Superuser, Finance Manager)' })
  @ApiResponse({ status: 200, description: 'The bill has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
