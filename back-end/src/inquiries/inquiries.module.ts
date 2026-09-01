import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiriesRepository } from './inquiries.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiriesRepository],
  exports: [InquiriesService, InquiriesRepository],
})
export class InquiriesModule {}
