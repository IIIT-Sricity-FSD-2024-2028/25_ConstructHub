"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerMiddleware = void 0;
const common_1 = require("@nestjs/common");
const log_writer_1 = require("../utils/log-writer");
let LoggerMiddleware = class LoggerMiddleware {
    use(req, res, next) {
        const start = Date.now();
        const { method, originalUrl } = req;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';
        const reqId = req.headers['x-request-id'] || '-';
        res.on('finish', () => {
            const ms = Date.now() - start;
            const { statusCode } = res;
            const user = req.user;
            const userId = user?.userId || 'anonymous';
            const role = user?.role || 'anonymous';
            const companyId = user?.companyId || 'none';
            const line = `${method} ${originalUrl} status=${statusCode} duration=${ms}ms requestId=${reqId} userId=${userId} role=${role} companyId=${companyId} ip=${ip}`;
            (0, log_writer_1.logAccess)(line);
            if (statusCode >= 400) {
                (0, log_writer_1.logError)(`[HTTP ${statusCode}] ${line}`);
            }
            const colour = statusCode >= 500 ? '\x1b[31m' :
                statusCode >= 400 ? '\x1b[33m' :
                    statusCode >= 300 ? '\x1b[36m' :
                        '\x1b[32m';
            console.log(`${colour}[HTTP]\x1b[0m ${line}`);
        });
        next();
    }
};
exports.LoggerMiddleware = LoggerMiddleware;
exports.LoggerMiddleware = LoggerMiddleware = __decorate([
    (0, common_1.Injectable)()
], LoggerMiddleware);
//# sourceMappingURL=logger.middleware.js.map