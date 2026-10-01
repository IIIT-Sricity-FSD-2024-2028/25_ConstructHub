import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './create-notification.dto';
import { UpdateNotificationDto } from './update-notification.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class NotificationsController {
    private readonly service;
    constructor(service: NotificationsService);
    findAll(user?: UserContext): any[];
    findOne(id: string, user?: UserContext): any;
    create(dto: CreateNotificationDto, user?: UserContext): any;
    update(id: string, dto: UpdateNotificationDto, user?: UserContext): any;
    remove(id: string, user?: UserContext): boolean;
}
