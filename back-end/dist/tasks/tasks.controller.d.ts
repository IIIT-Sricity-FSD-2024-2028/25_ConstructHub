import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class TasksController {
    private readonly service;
    constructor(service: TasksService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateTaskDto, user?: UserContext): any;
    update(id: string, dto: UpdateTaskDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
