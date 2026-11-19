import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';

import { ProjectsModule } from '../projects/projects.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [ProjectsModule, forwardRef(() => MilestonesModule), forwardRef(() => TasksModule), forwardRef(() => ProcurementModule)],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsRepository],
})
export class ReportsModule {}