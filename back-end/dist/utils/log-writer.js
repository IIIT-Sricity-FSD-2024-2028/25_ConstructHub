"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAccess = logAccess;
exports.logError = logError;
exports.readLogTail = readLogTail;
exports.listLogFiles = listLogFiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}
let accessBuffer = [];
let errorBuffer = [];
function todayStamp() {
    return new Date().toISOString().slice(0, 10);
}
function timestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function logFilePath(type) {
    return path.join(LOGS_DIR, `${type}-${todayStamp()}.log`);
}
function flush(buffer, filePath) {
    if (buffer.length === 0)
        return;
    const lines = buffer.splice(0, buffer.length);
    fs.appendFile(filePath, lines.join('\n') + '\n', (err) => {
        if (err)
            console.error('[LogWriter] Failed to flush log:', err.message);
    });
}
setInterval(() => {
    flush(accessBuffer, logFilePath('access'));
    flush(errorBuffer, logFilePath('error'));
}, 30_000);
process.on('exit', () => {
    flush(accessBuffer, logFilePath('access'));
    flush(errorBuffer, logFilePath('error'));
});
process.on('SIGINT', () => {
    flush(accessBuffer, logFilePath('access'));
    flush(errorBuffer, logFilePath('error'));
    process.exit(0);
});
function logAccess(line) {
    accessBuffer.push(`[${timestamp()}] ${line}`);
}
function logError(line) {
    errorBuffer.push(`[${timestamp()}] ${line}`);
}
function readLogTail(type, lines = 100) {
    const filePath = logFilePath(type);
    if (!fs.existsSync(filePath))
        return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const all = content.split('\n').filter(Boolean);
    return all.slice(-lines);
}
function listLogFiles() {
    return fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith('.log'));
}
//# sourceMappingURL=log-writer.js.map