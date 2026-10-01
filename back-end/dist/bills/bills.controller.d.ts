import { BillsService } from './bills.service';
import { CreateBillDto } from './create-bill.dto';
import { UpdateBillDto } from './update-bill.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class BillsController {
    private readonly service;
    constructor(service: BillsService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateBillDto, user?: UserContext): any;
    update(id: string, dto: UpdateBillDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
