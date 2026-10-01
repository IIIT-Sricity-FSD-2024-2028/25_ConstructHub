import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './create-expense.dto';
import { UpdateExpenseDto } from './update-expense.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class ExpensesController {
    private readonly service;
    constructor(service: ExpensesService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateExpenseDto, user?: UserContext): any;
    update(id: string, dto: UpdateExpenseDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
