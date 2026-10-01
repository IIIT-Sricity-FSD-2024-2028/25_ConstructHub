export declare class UsersRepository {
    private memoryData;
    findAll(): any[];
    findById(id: string): any;
    findByEmail(email: string): any;
    findByCompanyId(companyId: string): any[];
    create(user: any): any;
    update(id: string, partialUser: any): any;
    remove(id: string): boolean;
}
