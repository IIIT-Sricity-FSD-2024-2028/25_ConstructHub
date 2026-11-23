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
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ProcurementModule } from './procurement/procurement.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    MarketplaceModule,
    MilestonesModule,
    ProcurementModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
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
        { path: 'tasks/team/:projectId', method: RequestMethod.GET },
        { path: 'tasks/:id', method: RequestMethod.ALL },
        { path: 'reports', method: RequestMethod.ALL },
        { path: 'reports/:id', method: RequestMethod.ALL },
        { path: 'reports/upload', method: RequestMethod.POST },
        { path: 'reports/stock-available', method: RequestMethod.GET },
        { path: 'budget-topups', method: RequestMethod.ALL },
        { path: 'bills/billable/:projectId', method: RequestMethod.GET },
        { path: 'budget-topups/:id/approve', method: RequestMethod.POST },
        { path: 'budget-topups/:id/reject', method: RequestMethod.POST },
        { path: 'bills', method: RequestMethod.ALL },
        { path: 'bills/:id', method: RequestMethod.ALL },
        { path: 'expenses', method: RequestMethod.ALL },
        { path: 'expenses/:id', method: RequestMethod.ALL },
        { path: 'messages', method: RequestMethod.ALL },
        { path: 'messages/:id', method: RequestMethod.ALL },
        { path: 'feedback', method: RequestMethod.ALL },
        { path: 'notifications', method: RequestMethod.ALL },
        { path: 'notifications/clear/all', method: RequestMethod.ALL },
        { path: 'notifications/:id', method: RequestMethod.ALL },
        { path: 'inquiries', method: RequestMethod.GET },
        { path: 'inquiries/:id', method: RequestMethod.PATCH },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/:id', method: RequestMethod.ALL },
        { path: 'companies', method: RequestMethod.ALL },
        { path: 'companies/:id', method: RequestMethod.ALL },
        { path: 'companies/:id/overage', method: RequestMethod.ALL },
        { path: 'companies/:id/approval', method: RequestMethod.PATCH },
        { path: 'plans/overage-rates', method: RequestMethod.PATCH },
        { path: 'plans/:name', method: RequestMethod.PATCH },
        { path: 'companies/platform/revenue', method: RequestMethod.GET },
        { path: 'companies/:id/subscription', method: RequestMethod.GET },
        // Marketplace (every route here is authenticated; a route missing from this list would be public)
        { path: 'requirements', method: RequestMethod.ALL },
        { path: 'requirements/:id', method: RequestMethod.ALL },
        { path: 'requirements/:id/close', method: RequestMethod.POST },
        { path: 'requirements/:id/documents', method: RequestMethod.POST },
        { path: 'requirements/:id/documents/:docId', method: RequestMethod.GET },
        { path: 'requirements/:id/quotations', method: RequestMethod.ALL },
        { path: 'requirements/:id/assign-team', method: RequestMethod.POST },
        { path: 'quotations', method: RequestMethod.ALL },
        { path: 'quotations/estimates', method: RequestMethod.GET },
        { path: 'quotations/:id', method: RequestMethod.ALL },
        { path: 'quotations/:id/pm-estimate', method: RequestMethod.PATCH },
        { path: 'quotations/:id/fm-estimate', method: RequestMethod.PATCH },
        { path: 'quotations/:id/release', method: RequestMethod.POST },
        { path: 'quotations/:id/accept', method: RequestMethod.POST },
        { path: 'quotations/:id/reject', method: RequestMethod.POST },
        { path: 'quotations/:id/withdraw', method: RequestMethod.POST },
        { path: 'contracts', method: RequestMethod.ALL },
        { path: 'contracts/:id', method: RequestMethod.ALL },
        // Milestones & progress
        { path: 'milestones', method: RequestMethod.ALL },
        { path: 'milestones/progress/:projectId', method: RequestMethod.GET },
        { path: 'milestones/:id', method: RequestMethod.ALL },
        { path: 'milestones/:id/approve', method: RequestMethod.POST },
        { path: 'milestones/:id/reopen', method: RequestMethod.POST },
        // Procurement & stock
        { path: 'suppliers', method: RequestMethod.ALL },
        { path: 'suppliers/:id', method: RequestMethod.ALL },
        { path: 'material-requests', method: RequestMethod.ALL },
        { path: 'material-requests/:id', method: RequestMethod.ALL },
        { path: 'material-requests/:id/cancel', method: RequestMethod.POST },
        { path: 'material-requests/:id/approve', method: RequestMethod.POST },
        { path: 'material-requests/:id/reject', method: RequestMethod.POST },
        { path: 'purchase-orders', method: RequestMethod.ALL },
        { path: 'purchase-orders/:id', method: RequestMethod.ALL },
        { path: 'purchase-orders/:id/approve', method: RequestMethod.POST },
        { path: 'purchase-orders/:id/reject', method: RequestMethod.POST },
        { path: 'purchase-orders/:id/cancel', method: RequestMethod.POST },
        { path: 'goods-receipts', method: RequestMethod.ALL },
        { path: 'goods-receipts/:id/invoice', method: RequestMethod.ALL },
        { path: 'stock', method: RequestMethod.GET },
        { path: 'stock/ledger', method: RequestMethod.GET },
        { path: 'stock/issues', method: RequestMethod.ALL },
        { path: 'procurement/settings', method: RequestMethod.ALL },
        // Bill payments
        { path: 'bills/:id/payments', method: RequestMethod.ALL },
        { path: 'payments', method: RequestMethod.GET },
        // Dashboards
        { path: 'dashboard', method: RequestMethod.GET },
        // Expense workflow
        { path: 'expenses/:id/withdraw', method: RequestMethod.POST },
        { path: 'expenses/:id/receipts', method: RequestMethod.POST },
        { path: 'expenses/:id/receipts/:receiptId', method: RequestMethod.GET },
        { path: 'expenses/:id/verify', method: RequestMethod.POST },
        { path: 'expenses/:id/pm-return', method: RequestMethod.POST },
        { path: 'expenses/:id/pm-reject', method: RequestMethod.POST },
        { path: 'expenses/:id/approve', method: RequestMethod.POST },
        { path: 'expenses/:id/return', method: RequestMethod.POST },
        { path: 'expenses/:id/reject', method: RequestMethod.POST },
        { path: 'expenses/:id/reimburse', method: RequestMethod.POST },
        { path: 'api/logs', method: RequestMethod.GET }, // log viewer (superuser only)
        { path: 'api/logs/:type', method: RequestMethod.GET }, // log viewer (superuser only)
      );
  }
}
