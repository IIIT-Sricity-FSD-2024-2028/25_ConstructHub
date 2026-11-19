import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetTopupsController } from './budget-topups.controller';
import { BudgetTopupsService } from './budget-topups.service';
import { BudgetTopupsRepository } from './budget-topups.repository';

@Module({
  imports: [forwardRef(() => UsersModule), forwardRef(() => CompaniesModule), forwardRef(() => NotificationsModule)],
  controllers: [ProjectsController, BudgetTopupsController],
  providers: [ProjectsService, ProjectsRepository, BudgetTopupsService, BudgetTopupsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}