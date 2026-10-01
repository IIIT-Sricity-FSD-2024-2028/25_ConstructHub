import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './create-inquiry.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class InquiriesController {
    private readonly service;
    constructor(service: InquiriesService);
    create(dto: CreateInquiryDto): import("./inquiries.repository").InquiryRecord;
    findAll(user?: UserContext): import("./inquiries.repository").InquiryRecord[];
    updateStatus(id: string, body: {
        status: 'New' | 'Read' | 'Resolved';
    }, user?: UserContext): import("./inquiries.repository").InquiryRecord;
}
