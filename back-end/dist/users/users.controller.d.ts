import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { UserContext } from '../auth/current-user.decorator';
import { CompaniesService } from '../companies/companies.service';
export declare class UsersController {
    private readonly service;
    private readonly companiesService;
    constructor(service: UsersService, companiesService: CompaniesService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateUserDto, user?: UserContext): any;
    update(id: string, dto: UpdateUserDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
