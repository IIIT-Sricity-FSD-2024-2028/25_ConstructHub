import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './create-report.dto';
import { UpdateReportDto } from './update-report.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('reports')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all reports' })
  @ApiResponse({ status: 200, description: 'List of all reports.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific report by ID' })
  @ApiResponse({ status: 200, description: 'The report details.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Create a new report (Superuser, Project Manager, Site Engineer)' })
  @ApiResponse({ status: 201, description: 'The report has been successfully created.', type: CreateReportDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateReportDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Update an existing report (Superuser, Project Manager, Site Engineer)' })
  @ApiResponse({ status: 200, description: 'The report has been successfully updated.', type: UpdateReportDto })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateReportDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete a report (Superuser, Project Manager)' })
  @ApiResponse({ status: 200, description: 'The report has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
