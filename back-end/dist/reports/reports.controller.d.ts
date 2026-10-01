import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './create-report.dto';
import { UpdateReportDto } from './update-report.dto';
import { UserContext } from '../auth/current-user.decorator';
import { ProjectsService } from '../projects/projects.service';
export declare class ReportsController {
    private readonly service;
    private readonly projectsService;
    constructor(service: ReportsService, projectsService: ProjectsService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateReportDto, user?: UserContext): any;
    uploadPhotos(files: any[], req: Request, user?: UserContext, reportId?: string, projectId?: string): {
        message: string;
        count: number;
        photoUrls: string[];
        files: {
            originalName: any;
            size: any;
            mimetype: any;
            url: string;
        }[];
    };
    update(id: string, dto: UpdateReportDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
