import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { FeedbackController } from './feedback.controller';
import { FeedbackRepository } from './feedback.repository';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [forwardRef(() => ProjectsModule), forwardRef(() => UsersModule)],
  controllers: [NotificationsController, FeedbackController],
  providers: [NotificationsService, NotificationsRepository, FeedbackRepository],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}