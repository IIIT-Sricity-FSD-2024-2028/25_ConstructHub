export declare function logAccess(line: string): void;
export declare function logError(line: string): void;
export declare function readLogTail(type: 'access' | 'error', lines?: number): string[];
export declare function listLogFiles(): string[];
