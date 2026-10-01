import { MessagesRepository } from './messages.repository';
export declare class MessagesService {
    private readonly repo;
    constructor(repo: MessagesRepository);
    findAll(): any[];
    findByCompanyId(companyId: string): any[];
    findOne(id: string): any;
    create(data: any): any;
    update(id: string, data: any): any;
    remove(id: string): boolean;
}
