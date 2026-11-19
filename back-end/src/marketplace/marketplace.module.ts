import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillsModule } from '../bills/bills.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { MarketplaceService } from './marketplace.service';
import { RequirementsController } from './requirements.controller';
import { QuotationsController } from './quotations.controller';
import { ContractsController } from './contracts.controller';
import { RequirementsRepository } from './requirements.repository';
import { QuotationsRepository } from './quotations.repository';
import { ContractsRepository } from './contracts.repository';

@Module({
  imports: [ProjectsModule, UsersModule, CompaniesModule, NotificationsModule, BillsModule, MilestonesModule],
  controllers: [RequirementsController, QuotationsController, ContractsController],
  providers: [MarketplaceService, RequirementsRepository, QuotationsRepository, ContractsRepository],
  exports: [MarketplaceService, RequirementsRepository, QuotationsRepository, ContractsRepository],
})
export class MarketplaceModule {}
