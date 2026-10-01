import { ProjectsRepository } from './projects.repository';
import { CompaniesRepository } from '../companies/companies.repository';
import { UsersService } from '../users/users.service';
export declare class ProjectsService {
    private readonly repo;
    private readonly usersService;
    private readonly companiesRepo;
    constructor(repo: ProjectsRepository, usersService: UsersService, companiesRepo: CompaniesRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    private validateBusinessRules;
    remove(id: string): boolean;
}
