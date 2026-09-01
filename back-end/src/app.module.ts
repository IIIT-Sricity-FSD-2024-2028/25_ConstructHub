import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportsModule } from './reports/reports.module';
import { BillsModule } from './bills/bills.module';
import { ExpensesModule } from './expenses/expenses.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CompaniesModule } from './companies/companies.module';
import { AuthModule } from './auth/auth.module';
import { InquiriesModule } from './inquiries/inquiries.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    ReportsModule,
    BillsModule,
    ExpensesModule,
    MessagesModule,
    NotificationsModule,
    CompaniesModule,
    InquiriesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Global middleware for security headers, rate-limiting, and structured logging
    consumer
      .apply(SecurityMiddleware, LoggerMiddleware)
      .forRoutes('*');

    // Router-level authentication middleware attaching identity context
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'companies/register', method: RequestMethod.POST }, // public self-service registration
        { path: 'inquiries', method: RequestMethod.POST },  // public contact us submission
      )
      .forRoutes(
        { path: 'projects', method: RequestMethod.ALL },
        { path: 'projects/:id', method: RequestMethod.ALL },
        { path: 'tasks', method: RequestMethod.ALL },
        { path: 'tasks/:id', method: RequestMethod.ALL },
        { path: 'reports', method: RequestMethod.ALL },
        { path: 'reports/:id', method: RequestMethod.ALL },
        { path: 'reports/upload', method: RequestMethod.POST },
        { path: 'bills', method: RequestMethod.ALL },
        { path: 'bills/:id', method: RequestMethod.ALL },
        { path: 'expenses', method: RequestMethod.ALL },
        { path: 'expenses/:id', method: RequestMethod.ALL },
        { path: 'messages', method: RequestMethod.ALL },
        { path: 'messages/:id', method: RequestMethod.ALL },
        { path: 'notifications', method: RequestMethod.ALL },
        { path: 'notifications/:id', method: RequestMethod.ALL },
        { path: 'inquiries', method: RequestMethod.GET },
        { path: 'inquiries/:id', method: RequestMethod.PATCH },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/:id', method: RequestMethod.ALL },
        { path: 'companies', method: RequestMethod.ALL },
        { path: 'companies/:id', method: RequestMethod.ALL },
        { path: 'companies/:id/overage', method: RequestMethod.ALL },
        { path: 'companies/platform/revenue', method: RequestMethod.GET },
        { path: 'companies/:id/subscription', method: RequestMethod.GET },
        { path: 'api/logs/:type', method: RequestMethod.GET }, // log viewer
      );
  }
}
