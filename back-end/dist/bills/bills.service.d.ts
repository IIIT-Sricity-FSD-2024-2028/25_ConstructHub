import { BillsRepository } from './bills.repository';
import { ProjectsRepository } from '../projects/projects.repository';
export declare class BillsService {
    private readonly repo;
    private readonly projectsRepo;
    constructor(repo: BillsRepository, projectsRepo: ProjectsRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
