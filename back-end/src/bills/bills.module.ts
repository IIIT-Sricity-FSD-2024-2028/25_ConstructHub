import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { ReportsModule } from '../reports/reports.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { CompaniesModule } from '../companies/companies.module';
import { BillsController, PaymentsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillsRepository } from './bills.repository';
import { PaymentsRepository } from './payments.repository';

@Module({
  imports: [ProjectsModule, UsersModule, NotificationsModule, MilestonesModule, ReportsModule, ExpensesModule, ProcurementModule, CompaniesModule],
  controllers: [BillsController, PaymentsController],
  providers: [BillsService, BillsRepository, PaymentsRepository],
  exports: [BillsService, BillsRepository, PaymentsRepository],
})
export class BillsModule {}
