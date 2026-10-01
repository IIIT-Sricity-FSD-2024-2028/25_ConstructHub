import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';
import { UpdateMessageDto } from './update-message.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class MessagesController {
    private readonly service;
    constructor(service: MessagesService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateMessageDto, user?: UserContext): any;
    update(id: string, dto: UpdateMessageDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
