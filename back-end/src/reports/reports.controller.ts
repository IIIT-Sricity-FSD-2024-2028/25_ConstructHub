import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, UseInterceptors, UploadedFiles,
  BadRequestException, Req, ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './create-report.dto';
import { UpdateReportDto } from './update-report.dto';
import {
  ApiHeader, ApiOperation, ApiResponse, ApiTags,
  ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { multerConfig } from '../middleware/upload.config';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { TenantHelper } from '../auth/tenant-helper';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('reports')
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
@UseGuards(RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve reports (Superuser: all, Tenant: company reports, Client: assigned project reports)' })
  @ApiResponse({ status: 200, description: 'List of reports.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (TenantHelper.isSuperuser(user) || !user) {
      return this.service.findAll();
    }
    if (TenantHelper.isClient(user)) {
      const clientProjects = this.projectsService.findAll().filter(p => p.clientId === user.userId);
      const projectIds = new Set(clientProjects.map(p => p.id));
      return this.service.findAll().filter(r => projectIds.has(r.projectId));
    }
    return this.service.findByCompanyId(user.companyId);
  }

  @Get(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'finance_manager', 'site_engineer', 'client')
  @ApiOperation({ summary: 'Retrieve a specific report by ID' })
  @ApiResponse({ status: 200, description: 'The report details.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const report = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      if (TenantHelper.isClient(user)) {
        const clientProjects = this.projectsService.findAll().filter(p => p.clientId === user.userId);
        const projectIds = new Set(clientProjects.map(p => p.id));
        if (!projectIds.has(report.projectId)) {
          throw new ForbiddenException('Access denied. Client can only view reports for assigned projects.');
        }
      } else {
        TenantHelper.validateCompanyAccess(user, report.companyId);
      }
    }
    return report;
  }

  @Post()
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Create a new report (Company ID derived from authenticated token)' })
  @ApiResponse({ status: 201, description: 'The report has been successfully created.', type: CreateReportDto })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user?: UserContext) {
    const companyId = TenantHelper.getAuthoritativeCompanyId(user, dto.companyId);
    const payload = { ...dto, companyId };
    return this.service.create(payload);
  }

  @Post('upload')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer')
  @UseInterceptors(FilesInterceptor('photos', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload up to 10 site report photos (JPEG, PNG, WebP, GIF — max 5 MB each).',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        reportId: { type: 'string', description: 'Optional report ID to verify authorization' },
        projectId: { type: 'string', description: 'Optional project ID to verify authorization' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload site report photos with tenant authorization check' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully. Returns array of URLs.' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  uploadPhotos(
    @UploadedFiles() files: any[],
    @Req() req: Request,
    @CurrentUser() user?: UserContext,
    @Body('reportId') reportId?: string,
    @Body('projectId') projectId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were uploaded. Please attach at least one photo.');
    }

    // Verify company ownership of associated report or project if supplied
    if (reportId && !TenantHelper.isSuperuser(user) && user) {
      const report = this.service.findOne(reportId);
      TenantHelper.validateCompanyAccess(user, report.companyId);
    }
    if (projectId && !TenantHelper.isSuperuser(user) && user) {
      const project = this.projectsService.findOne(projectId);
      TenantHelper.validateCompanyAccess(user, project.companyId);
    }

    const photoUrls = files.map((f) => {
      const rel = f.path.replace(/\\/g, '/').split('uploads/')[1];
      return `/uploads/${rel}`;
    });

    return {
      message: `${files.length} file(s) uploaded successfully.`,
      count: files.length,
      photoUrls,
      files: files.map((f) => ({
        originalName: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        url: `/uploads/${f.path.replace(/\\/g, '/').split('uploads/')[1]}`,
      })),
    };
  }

  @Patch(':id')
  @Roles('superuser', 'company_admin', 'project_manager', 'site_engineer')
  @ApiOperation({ summary: 'Update an existing report' })
  @ApiResponse({ status: 200, description: 'The report has been successfully updated.', type: UpdateReportDto })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    const companyId = TenantHelper.isSuperuser(user)
      ? (dto.companyId !== undefined ? dto.companyId : existing.companyId)
      : (user ? user.companyId : existing.companyId);

    const payload = { ...dto, companyId };
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Roles('superuser', 'company_admin', 'project_manager')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'The report has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  remove(@Param('id') id: string, @CurrentUser() user?: UserContext) {
    const existing = this.service.findOne(id);
    if (!TenantHelper.isSuperuser(user) && user) {
      TenantHelper.validateCompanyAccess(user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
