import { InquiriesRepository, InquiryRecord } from './inquiries.repository';
import { CreateInquiryDto } from './create-inquiry.dto';
import { NotificationsRepository } from '../notifications/notifications.repository';
export declare class InquiriesService {
    private readonly repo;
    private readonly notifRepo;
    constructor(repo: InquiriesRepository, notifRepo: NotificationsRepository);
    findAll(): InquiryRecord[];
    create(dto: CreateInquiryDto): InquiryRecord;
    updateStatus(id: string, status: 'New' | 'Read' | 'Resolved'): InquiryRecord;
}
