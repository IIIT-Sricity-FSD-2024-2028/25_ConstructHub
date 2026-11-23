import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

import { CompaniesModule } from '../companies/companies.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [forwardRef(() => CompaniesModule), forwardRef(() => ProjectsModule)],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}