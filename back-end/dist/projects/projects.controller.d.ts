import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './create-project.dto';
import { UpdateProjectDto } from './update-project.dto';
import { UserContext } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';
export declare class ProjectsController {
    private readonly service;
    private readonly usersService;
    constructor(service: ProjectsService, usersService: UsersService);
    private validateProjectUserAssignments;
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateProjectDto, user?: UserContext): any;
    update(id: string, dto: UpdateProjectDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
