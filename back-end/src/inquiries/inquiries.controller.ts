import { Controller, Get, Post, Body, Patch, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './create-inquiry.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';

@ApiTags('inquiries')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'Public Contact Us inquiry submission' })
  @ApiResponse({ status: 201, description: 'Inquiry successfully submitted.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(@Body() dto: CreateInquiryDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('superuser')
  @ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
  @ApiOperation({ summary: 'Retrieve platform inquiries (Superuser ONLY)' })
  @ApiResponse({ status: 200, description: 'List of platform inquiries.' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-superuser.' })
  findAll(@CurrentUser() user?: UserContext) {
    if (!user || user.role !== 'superuser') {
      throw new ForbiddenException('Only Platform Super Admin can view platform inquiries.');
    }
    return this.service.findAll();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('superuser')
  @ApiHeader({ name: 'Authorization', required: true, description: 'Bearer JWT token' })
  @ApiOperation({ summary: 'Update inquiry status (Superuser ONLY)' })
  @ApiResponse({ status: 200, description: 'Inquiry status updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-superuser.' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'New' | 'Read' | 'Resolved' },
    @CurrentUser() user?: UserContext,
  ) {
    if (!user || user.role !== 'superuser') {
      throw new ForbiddenException('Only Platform Super Admin can update platform inquiries.');
    }
    return this.service.updateStatus(id, body.status);
  }
}
