import { TasksRepository } from './tasks.repository';
export declare class TasksService {
    private readonly repo;
    constructor(repo: TasksRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    private validateBusinessRules;
    remove(id: string): boolean;
}
