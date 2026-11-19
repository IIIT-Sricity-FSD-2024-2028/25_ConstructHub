import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFiles, Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { MarketplaceService } from './marketplace.service';
import { CreateRequirementDto, UpdateRequirementDto } from './requirement.dto';
import { SaveQuotationDto, AssignTeamDto } from './quotation.dto';
import { requirementUploadConfig, MAX_DOCS_PER_UPLOAD } from './marketplace-upload.config';

@ApiTags('Marketplace - Requirements')
@UseGuards(RolesGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly service: MarketplaceService) {}

  @Post()
  @Roles('client')
  @ApiOperation({ summary: 'Client posts a construction requirement' })
  @ApiResponse({ status: 201, description: 'Requirement published.' })
  create(@Body() dto: CreateRequirementDto, @CurrentUser() user: UserContext) {
    return this.service.createRequirement(user, dto);
  }

  @Get()
  @Roles('client', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Client: own requirements. Company admin: open marketplace listings. Superuser: all.' })
  @ApiQuery({ name: 'scope', required: false, description: 'Company admin only: "open" (default) or "mine" (requirements my company quoted on)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'projectType', required: false })
  @ApiQuery({ name: 'minBudget', required: false })
  @ApiQuery({ name: 'maxBudget', required: false })
  findAll(@Query() query: Record<string, any>, @CurrentUser() user: UserContext) {
    return this.service.listRequirements(user, query);
  }

  @Get(':id')
  @Roles('client', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Requirement details (companies never see client contact details or competing quotations)' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.getRequirement(user, id);
  }

  @Patch(':id')
  @Roles('client')
  @ApiOperation({ summary: 'Client edits an open requirement that has no quotations yet' })
  update(@Param('id') id: string, @Body() dto: UpdateRequirementDto, @CurrentUser() user: UserContext) {
    return this.service.updateRequirement(user, id, dto);
  }

  @Post(':id/close')
  @Roles('client')
  @ApiOperation({ summary: 'Client closes an open requirement (open quotations are rejected)' })
  close(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.closeRequirement(user, id);
  }

  @Post(':id/documents')
  @Roles('client')
  @UseInterceptors(FilesInterceptor('documents', MAX_DOCS_PER_UPLOAD, requirementUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { documents: { type: 'array', items: { type: 'string', format: 'binary' } } } },
  })
  @ApiOperation({ summary: 'Client uploads drawings/specifications (PDF, Word, Excel, images; 10 MB each, max 10 per requirement)' })
  uploadDocuments(@Param('id') id: string, @UploadedFiles() files: any[], @CurrentUser() user: UserContext) {
    return this.service.addDocuments(user, id, files);
  }

  @Get(':id/documents/:docId')
  @Roles('client', 'company_admin', 'superuser')
  @ApiOperation({ summary: 'Download a requirement document (authenticated; not publicly served)' })
  download(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser() user: UserContext,
    @Res() res: Response,
  ) {
    const file = this.service.getDocumentFile(user, id, docId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(file.path, file.name);
  }

  // ── Quotations under a requirement ──

  @Get(':id/quotations')
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Client compares all quotations received for their requirement (cheapest first)' })
  listQuotations(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.listQuotationsForRequirement(user, id);
  }

  @Post(':id/assign-team')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Company admin opens a bid estimate and assigns the PM (stages) and FM (costs) who prepare it' })
  assignTeam(@Param('id') id: string, @Body() dto: AssignTeamDto, @CurrentUser() user: UserContext) {
    return this.service.assignTeam(user, id, dto);
  }

  @Post(':id/quotations')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Closed: quotations must go through the PM -> FM -> Admin estimate (use assign-team). Always answers 400.', deprecated: true })
  @ApiResponse({ status: 409, description: 'Your company already quoted on this requirement.' })
  submitQuotation(@Param('id') id: string, @Body() dto: SaveQuotationDto, @CurrentUser() user: UserContext) {
    return this.service.submitQuotation(user, id, dto);
  }
}
