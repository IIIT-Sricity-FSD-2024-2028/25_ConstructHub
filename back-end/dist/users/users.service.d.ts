import { UsersRepository } from './users.repository';
import { CompaniesRepository } from '../companies/companies.repository';
export declare class UsersService {
    private readonly repo;
    private readonly companiesRepo;
    constructor(repo: UsersRepository, companiesRepo: CompaniesRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findByEmail(email: string): any;
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
