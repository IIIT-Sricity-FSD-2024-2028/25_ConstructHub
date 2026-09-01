import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logError } from '../utils/log-writer';

/**
 * All-Exceptions Filter (Catch-all for uncaught errors)
 *
 * Catches unhandled runtime exceptions (TypeError, stack errors, internal crashes).
 * Logs stack trace to error log file with user context. Returns safe HTTP 500 response without internal leak.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      throw exception;
    }

    const reqId     = (request.headers['x-request-id'] as string) || '-';
    const user      = (request as any).user;
    const userId    = user?.userId || 'anonymous';
    const role      = user?.role || 'anonymous';
    const companyId = user?.companyId || 'none';

    const err = exception as Error;
    const stack = err?.stack || String(exception);

    // Write full error log with stack trace
    logError(
      `[500 INTERNAL] ${request.method} ${request.originalUrl} requestId=${reqId} userId=${userId} role=${role} companyId=${companyId}\n  ${stack}`,
    );

    console.error('\x1b[31m[AllExceptionsFilter]\x1b[0m Unexpected error:', err);

    response.status(500).json({
      statusCode: 500,
      error:      'Internal Server Error',
      message:    'An unexpected internal error occurred. Please try again later.',
      path:       request.originalUrl,
      timestamp:  new Date().toISOString(),
      requestId:  reqId,
    });
  }
}
