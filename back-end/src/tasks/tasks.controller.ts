import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('tasks')
@ApiHeader({ name: 'x-role', required: true, description: 'Role used for RBAC. Allowed values depend on the endpoint.' })
@UseGuards(RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve all tasks' })
  @ApiResponse({ status: 200, description: 'List of all tasks.' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Roles('superuser', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific task by ID' })
  @ApiResponse({ status: 200, description: 'The task details.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Create a new task (Superuser, Project Manager)' })
  @ApiResponse({ status: 201, description: 'The task has been successfully created.', type: CreateTaskDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateTaskDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Update an existing task (Superuser, Project Manager, Site Engineer)' })
  @ApiResponse({ status: 200, description: 'The task has been successfully updated.', type: UpdateTaskDto })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete a task (Superuser, Project Manager)' })
  @ApiResponse({ status: 200, description: 'The task has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
