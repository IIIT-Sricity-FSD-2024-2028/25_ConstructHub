import { Module, forwardRef } from '@nestjs/common';
import { MilestonesModule } from '../milestones/milestones.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';

@Module({
  imports: [ProjectsModule, forwardRef(() => UsersModule), forwardRef(() => MilestonesModule)],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksRepository],
})
export class TasksModule {}