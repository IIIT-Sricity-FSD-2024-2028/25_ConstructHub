"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const swagger_1 = require("@nestjs/swagger");
const log_writer_1 = require("./utils/log-writer");
const SERVER_BOOT_ID = Date.now().toString();
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    getHealth() {
        return { status: 'ok', serverBootId: SERVER_BOOT_ID, timestamp: new Date().toISOString() };
    }
    listLogs(role) {
        if (role !== 'superuser') {
            throw new common_1.ForbiddenException('Log viewer is restricted to superuser only.');
        }
        return { files: (0, log_writer_1.listLogFiles)() };
    }
    readLog(type, role) {
        if (role !== 'superuser') {
            throw new common_1.ForbiddenException('Log viewer is restricted to superuser only.');
        }
        if (type !== 'access' && type !== 'error') {
            throw new common_1.NotFoundException(`Unknown log type "${type}". Use "access" or "error".`);
        }
        const lines = (0, log_writer_1.readLogTail)(type, 100);
        return {
            type,
            date: new Date().toISOString().slice(0, 10),
            lineCount: lines.length,
            lines,
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Health check and server boot ID endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Server is healthy.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, swagger_1.ApiTags)('logs'),
    (0, common_1.Get)('api/logs'),
    (0, swagger_1.ApiOperation)({ summary: 'List all log files (Superuser only)' }),
    (0, swagger_1.ApiHeader)({ name: 'x-role', required: true, description: 'Must be superuser' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Array of log filenames.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — superuser only.' }),
    __param(0, (0, common_1.Headers)('x-role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "listLogs", null);
__decorate([
    (0, swagger_1.ApiTags)('logs'),
    (0, common_1.Get)('api/logs/:type'),
    (0, swagger_1.ApiOperation)({
        summary: "Read last 100 lines of today's log file (Superuser only)",
        description: 'Type must be "access" or "error".',
    }),
    (0, swagger_1.ApiHeader)({ name: 'x-role', required: true, description: 'Must be superuser' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Last 100 lines of the log file.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — superuser only.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Invalid log type.' }),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Headers)('x-role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "readLog", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map