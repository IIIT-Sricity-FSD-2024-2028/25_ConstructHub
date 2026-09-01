import {
  Controller, Get, Param, Headers,
  ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { readLogTail, listLogFiles } from './utils/log-writer';

const SERVER_BOOT_ID = Date.now().toString();

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check and server boot ID endpoint' })
  @ApiResponse({ status: 200, description: 'Server is healthy.' })
  getHealth() {
    return { status: 'ok', serverBootId: SERVER_BOOT_ID, timestamp: new Date().toISOString() };
  }

  // ── Log Viewer Endpoints (Superuser only) ────────────────────────────────

  @ApiTags('logs')
  @Get('api/logs')
  @ApiOperation({ summary: 'List all log files (Superuser only)' })
  @ApiHeader({ name: 'x-role', required: true, description: 'Must be superuser' })
  @ApiResponse({ status: 200, description: 'Array of log filenames.' })
  @ApiResponse({ status: 403, description: 'Forbidden — superuser only.' })
  listLogs(@Headers('x-role') role: string) {
    if (role !== 'superuser') {
      throw new ForbiddenException('Log viewer is restricted to superuser only.');
    }
    return { files: listLogFiles() };
  }

  @ApiTags('logs')
  @Get('api/logs/:type')
  @ApiOperation({
    summary: "Read last 100 lines of today's log file (Superuser only)",
    description: 'Type must be "access" or "error".',
  })
  @ApiHeader({ name: 'x-role', required: true, description: 'Must be superuser' })
  @ApiResponse({ status: 200, description: 'Last 100 lines of the log file.' })
  @ApiResponse({ status: 403, description: 'Forbidden — superuser only.' })
  @ApiResponse({ status: 404, description: 'Invalid log type.' })
  readLog(
    @Param('type') type: string,
    @Headers('x-role') role: string,
  ) {
    if (role !== 'superuser') {
      throw new ForbiddenException('Log viewer is restricted to superuser only.');
    }
    if (type !== 'access' && type !== 'error') {
      throw new NotFoundException(`Unknown log type "${type}". Use "access" or "error".`);
    }
    const lines = readLogTail(type as 'access' | 'error', 100);
    return {
      type,
      date: new Date().toISOString().slice(0, 10),
      lineCount: lines.length,
      lines,
    };
  }
}
