import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getHealth(): {
        status: string;
        serverBootId: string;
        timestamp: string;
    };
    listLogs(role: string): {
        files: string[];
    };
    readLog(type: string, role: string): {
        type: string;
        date: string;
        lineCount: number;
        lines: string[];
    };
}
