import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, UserContext } from '../auth/current-user.decorator';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace - Contracts')
@UseGuards(RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: MarketplaceService) {}

  @Get()
  @Roles('client', 'company_admin', 'project_manager', 'finance_manager', 'superuser')
  @ApiOperation({ summary: 'Contracts / work orders visible to the caller (client: own, company roles: own company)' })
  findAll(@CurrentUser() user: UserContext) {
    return this.service.listContracts(user);
  }

  @Get(':id')
  @Roles('client', 'company_admin', 'project_manager', 'finance_manager', 'superuser')
  @ApiOperation({ summary: 'Contract details' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.getContract(user, id);
  }
}
