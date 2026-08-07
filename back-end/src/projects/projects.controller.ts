import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './create-project.dto';
import { UpdateProjectDto } from './update-project.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('projects')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all projects' })
  @ApiResponse({ status: 200, description: 'List of all projects.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific project by ID' })
  @ApiResponse({ status: 200, description: 'The project details.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Create a new project (Superuser, Project Manager)' })
  @ApiResponse({ status: 201, description: 'The project has been successfully created.', type: CreateProjectDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateProjectDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'site_engineer', 'finance_manager')
  @ApiOperation({ summary: 'Update an existing project (Superuser, Project Manager, Site Engineer, Finance Manager)' })
  @ApiResponse({ status: 200, description: 'The project has been successfully updated.', type: UpdateProjectDto })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete a project (Superuser, Project Manager)' })
  @ApiResponse({ status: 200, description: 'The project has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
