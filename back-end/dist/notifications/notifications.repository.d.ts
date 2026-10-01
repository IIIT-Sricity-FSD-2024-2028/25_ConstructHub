export declare class NotificationsRepository {
    private memoryData;
    private getCompanyId;
    findAll(): any[];
    findById(id: string): any;
    findByCompanyId(companyId: string): any[];
    create(record: any): any;
    update(id: string, record: any): any;
    remove(id: string): boolean;
}
