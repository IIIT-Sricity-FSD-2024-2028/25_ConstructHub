import { ReportsRepository } from './reports.repository';
export declare class ReportsService {
    private readonly repo;
    constructor(repo: ReportsRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
