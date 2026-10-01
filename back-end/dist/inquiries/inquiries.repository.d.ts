export interface InquiryRecord {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    status: 'New' | 'Read' | 'Resolved';
    createdAt: string;
}
export declare class InquiriesRepository {
    private memoryData;
    findAll(): InquiryRecord[];
    findById(id: string): InquiryRecord | null;
    create(dto: {
        name: string;
        email: string;
        phone: string;
        message: string;
    }): InquiryRecord;
    updateStatus(id: string, status: 'New' | 'Read' | 'Resolved'): InquiryRecord | null;
}
