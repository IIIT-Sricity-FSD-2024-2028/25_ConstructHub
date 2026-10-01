import { NotificationsRepository } from './notifications.repository';
export declare class NotificationsService {
    private readonly repo;
    constructor(repo: NotificationsRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
