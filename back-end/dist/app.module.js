"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const logger_middleware_1 = require("./middleware/logger.middleware");
const security_middleware_1 = require("./middleware/security.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const users_module_1 = require("./users/users.module");
const projects_module_1 = require("./projects/projects.module");
const tasks_module_1 = require("./tasks/tasks.module");
const reports_module_1 = require("./reports/reports.module");
const bills_module_1 = require("./bills/bills.module");
const expenses_module_1 = require("./expenses/expenses.module");
const messages_module_1 = require("./messages/messages.module");
const notifications_module_1 = require("./notifications/notifications.module");
const companies_module_1 = require("./companies/companies.module");
const auth_module_1 = require("./auth/auth.module");
const inquiries_module_1 = require("./inquiries/inquiries.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(security_middleware_1.SecurityMiddleware, logger_middleware_1.LoggerMiddleware)
            .forRoutes('*');
        consumer
            .apply(auth_middleware_1.AuthMiddleware)
            .exclude({ path: 'companies/register', method: common_1.RequestMethod.POST }, { path: 'inquiries', method: common_1.RequestMethod.POST })
            .forRoutes({ path: 'projects', method: common_1.RequestMethod.ALL }, { path: 'projects/:id', method: common_1.RequestMethod.ALL }, { path: 'tasks', method: common_1.RequestMethod.ALL }, { path: 'tasks/:id', method: common_1.RequestMethod.ALL }, { path: 'reports', method: common_1.RequestMethod.ALL }, { path: 'reports/:id', method: common_1.RequestMethod.ALL }, { path: 'reports/upload', method: common_1.RequestMethod.POST }, { path: 'bills', method: common_1.RequestMethod.ALL }, { path: 'bills/:id', method: common_1.RequestMethod.ALL }, { path: 'expenses', method: common_1.RequestMethod.ALL }, { path: 'expenses/:id', method: common_1.RequestMethod.ALL }, { path: 'messages', method: common_1.RequestMethod.ALL }, { path: 'messages/:id', method: common_1.RequestMethod.ALL }, { path: 'notifications', method: common_1.RequestMethod.ALL }, { path: 'notifications/:id', method: common_1.RequestMethod.ALL }, { path: 'inquiries', method: common_1.RequestMethod.GET }, { path: 'inquiries/:id', method: common_1.RequestMethod.PATCH }, { path: 'users', method: common_1.RequestMethod.ALL }, { path: 'users/:id', method: common_1.RequestMethod.ALL }, { path: 'companies', method: common_1.RequestMethod.ALL }, { path: 'companies/:id', method: common_1.RequestMethod.ALL }, { path: 'companies/:id/overage', method: common_1.RequestMethod.ALL }, { path: 'companies/platform/revenue', method: common_1.RequestMethod.GET }, { path: 'companies/:id/subscription', method: common_1.RequestMethod.GET }, { path: 'api/logs/:type', method: common_1.RequestMethod.GET });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            projects_module_1.ProjectsModule,
            tasks_module_1.TasksModule,
            reports_module_1.ReportsModule,
            bills_module_1.BillsModule,
            expenses_module_1.ExpensesModule,
            messages_module_1.MessagesModule,
            notifications_module_1.NotificationsModule,
            companies_module_1.CompaniesModule,
            inquiries_module_1.InquiriesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map