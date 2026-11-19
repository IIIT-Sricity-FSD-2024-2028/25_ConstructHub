import { Module, forwardRef } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { ReportsModule } from '../reports/reports.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { MilestonesRepository } from './milestones.repository';
import { ProgressService } from './progress.service';

@Module({
  imports: [ProjectsModule, UsersModule, NotificationsModule, forwardRef(() => TasksModule), forwardRef(() => ReportsModule)],
  controllers: [MilestonesController],
  providers: [MilestonesService, MilestonesRepository, ProgressService],
  exports: [ProgressService, MilestonesRepository],
})
export class MilestonesModule {}
