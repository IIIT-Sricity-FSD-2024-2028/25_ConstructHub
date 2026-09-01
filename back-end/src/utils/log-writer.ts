import * as fs from 'fs';
import * as path from 'path';

// ─── Directory Setup ────────────────────────────────────────────────────────
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ─── In-memory buffers ──────────────────────────────────────────────────────
let accessBuffer: string[] = [];
let errorBuffer: string[] = [];

// ─── Helpers ────────────────────────────────────────────────────────────────
function todayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function logFilePath(type: 'access' | 'error'): string {
  return path.join(LOGS_DIR, `${type}-${todayStamp()}.log`);
}

function flush(buffer: string[], filePath: string): void {
  if (buffer.length === 0) return;
  const lines = buffer.splice(0, buffer.length); // drain buffer atomically
  fs.appendFile(filePath, lines.join('\n') + '\n', (err) => {
    if (err) console.error('[LogWriter] Failed to flush log:', err.message);
  });
}

// ─── Flush every 30 seconds ─────────────────────────────────────────────────
setInterval(() => {
  flush(accessBuffer, logFilePath('access'));
  flush(errorBuffer, logFilePath('error'));
}, 30_000);

// Flush on process exit so no logs are lost
process.on('exit', () => {
  flush(accessBuffer, logFilePath('access'));
  flush(errorBuffer, logFilePath('error'));
});
process.on('SIGINT', () => {
  flush(accessBuffer, logFilePath('access'));
  flush(errorBuffer, logFilePath('error'));
  process.exit(0);
});

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Append a line to the access log buffer.
 * Format: [TIMESTAMP] METHOD URL STATUS ms | Role: ROLE | IP: IP | ReqId: ID
 */
export function logAccess(line: string): void {
  accessBuffer.push(`[${timestamp()}] ${line}`);
}

/**
 * Append a line to the error log buffer.
 * Used by the global exception filter.
 */
export function logError(line: string): void {
  errorBuffer.push(`[${timestamp()}] ${line}`);
}

/**
 * Read the last N lines of a log file (for the log viewer endpoint).
 */
export function readLogTail(type: 'access' | 'error', lines = 100): string[] {
  const filePath = logFilePath(type);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const all = content.split('\n').filter(Boolean);
  return all.slice(-lines);
}

/**
 * List all log files in the logs directory.
 */
export function listLogFiles(): string[] {
  return fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith('.log'));
}
