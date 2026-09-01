import { Injectable, NotFoundException } from '@nestjs/common';
import { InquiriesRepository, InquiryRecord } from './inquiries.repository';
import { CreateInquiryDto } from './create-inquiry.dto';
import { NotificationsRepository } from '../notifications/notifications.repository';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly repo: InquiriesRepository,
    private readonly notifRepo: NotificationsRepository,
  ) {}

  findAll(): InquiryRecord[] {
    return this.repo.findAll();
  }

  create(dto: CreateInquiryDto): InquiryRecord {
    const inquiry = this.repo.create(dto);
    // Route notification to Platform Admin (U000)
    this.notifRepo.create({
      userId: 'U000',
      companyId: '',
      type: 'system',
      title: 'New Contact Inquiry',
      body: `Contact inquiry received from ${dto.name} (${dto.email}, ${dto.phone}).`,
      time: 'Just now',
      read: false,
    });
    return inquiry;
  }

  updateStatus(id: string, status: 'New' | 'Read' | 'Resolved'): InquiryRecord {
    const updated = this.repo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found.`);
    }
    return updated;
  }
}
