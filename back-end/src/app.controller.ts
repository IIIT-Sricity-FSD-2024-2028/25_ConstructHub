import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { readLogTail, listLogFiles } from './utils/log-writer';
import { today } from './utils/ids';

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

  // Authorised by the signed login token (RolesGuard). The old check trusted a client-supplied "x-role" header,
  // which anyone could set, so these endpoints were readable by the whole internet.
  @ApiTags('logs')
  @UseGuards(RolesGuard)
  @Roles('superuser')
  @Get('api/logs')
  @ApiOperation({ summary: 'List all log files (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Array of log filenames.' })
  @ApiResponse({ status: 403, description: 'Forbidden — superuser only.' })
  listLogs() {
    return { files: listLogFiles() };
  }

  @ApiTags('logs')
  @UseGuards(RolesGuard)
  @Roles('superuser')
  @Get('api/logs/:type')
  @ApiOperation({
    summary: "Read last 100 lines of today's log file (Superuser only)",
    description: 'Type must be "access" or "error".',
  })
  @ApiResponse({ status: 200, description: 'Last 100 lines of the log file.' })
  @ApiResponse({ status: 403, description: 'Forbidden — superuser only.' })
  @ApiResponse({ status: 404, description: 'Invalid log type.' })
  readLog(@Param('type') type: string) {
    if (type !== 'access' && type !== 'error') {
      throw new NotFoundException(`Unknown log type "${type}". Use "access" or "error".`);
    }
    const lines = readLogTail(type as 'access' | 'error', 100);
    return {
      type,
      date: today(),
      lineCount: lines.length,
      lines,
    };
  }
}
