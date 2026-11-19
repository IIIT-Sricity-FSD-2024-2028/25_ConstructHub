import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { BillsModule } from '../bills/bills.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ProjectsModule, TasksModule, UsersModule, CompaniesModule, BillsModule, ExpensesModule, ProcurementModule, MilestonesModule, MarketplaceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
