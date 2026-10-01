"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const log_writer_1 = require("../utils/log-writer");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        if (exception instanceof common_1.HttpException) {
            throw exception;
        }
        const reqId = request.headers['x-request-id'] || '-';
        const user = request.user;
        const userId = user?.userId || 'anonymous';
        const role = user?.role || 'anonymous';
        const companyId = user?.companyId || 'none';
        const err = exception;
        const stack = err?.stack || String(exception);
        (0, log_writer_1.logError)(`[500 INTERNAL] ${request.method} ${request.originalUrl} requestId=${reqId} userId=${userId} role=${role} companyId=${companyId}\n  ${stack}`);
        console.error('\x1b[31m[AllExceptionsFilter]\x1b[0m Unexpected error:', err);
        response.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected internal error occurred. Please try again later.',
            path: request.originalUrl,
            timestamp: new Date().toISOString(),
            requestId: reqId,
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map