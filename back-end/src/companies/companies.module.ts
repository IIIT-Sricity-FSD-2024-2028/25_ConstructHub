import { Module, forwardRef } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [forwardRef(() => UsersModule), forwardRef(() => ProjectsModule)],
  controllers: [CompaniesController, PlansController],
  providers: [CompaniesService, CompaniesRepository, PlansService],
  exports: [CompaniesService, CompaniesRepository, PlansService],
})
export class CompaniesModule {}
