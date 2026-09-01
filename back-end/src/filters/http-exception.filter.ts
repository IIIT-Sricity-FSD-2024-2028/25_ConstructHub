import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logError } from '../utils/log-writer';

/**
 * HTTP Exception Filter
 *
 * Catches all NestJS HttpExceptions (400, 401, 403, 404, 422, etc.)
 * and returns a consistent, sanitized JSON error response. Writes company-aware
 * error log entries with request ID, userId, role, and companyId.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    const status    = exception.getStatus();
    const raw       = exception.getResponse();
    const reqId     = (request.headers['x-request-id'] as string) || '-';

    const user      = (request as any).user;
    const userId    = user?.userId || 'anonymous';
    const role      = user?.role || 'anonymous';
    const companyId = user?.companyId || 'none';

    // Extract message cleanly without exposing sensitive internals or credentials
    const message =
      typeof raw === 'string'
        ? raw
        : (raw as any)?.message || exception.message;

    const errorName = HttpStatus[status] ?? 'HTTP_ERROR';

    const body = {
      statusCode: status,
      error:      String(errorName).replace(/_/g, ' '),
      message,
      path:       request.originalUrl,
      timestamp:  new Date().toISOString(),
      requestId:  reqId,
    };

    // Write audit error log entry to log file
    logError(
      `[${status}] ${request.method} ${request.originalUrl} requestId=${reqId} userId=${userId} role=${role} companyId=${companyId} | Message: ${JSON.stringify(message)}`,
    );

    response.status(status).json(body);
  }
}
