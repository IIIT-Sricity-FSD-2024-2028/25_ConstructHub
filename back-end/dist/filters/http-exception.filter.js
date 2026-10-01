"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const log_writer_1 = require("../utils/log-writer");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();
        const raw = exception.getResponse();
        const reqId = request.headers['x-request-id'] || '-';
        const user = request.user;
        const userId = user?.userId || 'anonymous';
        const role = user?.role || 'anonymous';
        const companyId = user?.companyId || 'none';
        const message = typeof raw === 'string'
            ? raw
            : raw?.message || exception.message;
        const errorName = common_1.HttpStatus[status] ?? 'HTTP_ERROR';
        const body = {
            statusCode: status,
            error: String(errorName).replace(/_/g, ' '),
            message,
            path: request.originalUrl,
            timestamp: new Date().toISOString(),
            requestId: reqId,
        };
        (0, log_writer_1.logError)(`[${status}] ${request.method} ${request.originalUrl} requestId=${reqId} userId=${userId} role=${role} companyId=${companyId} | Message: ${JSON.stringify(message)}`);
        response.status(status).json(body);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)(common_1.HttpException)
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map