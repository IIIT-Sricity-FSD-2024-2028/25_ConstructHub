import { ExpensesRepository } from './expenses.repository';
export declare class ExpensesService {
    private readonly repo;
    constructor(repo: ExpensesRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
