import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InquiriesRepository, InquiryRecord } from './inquiries.repository';
import { CreateInquiryDto } from './create-inquiry.dto';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { today } from '../utils/ids';

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
    // Route notification to Platform Super Admin (U000)
    const isFirmRequest = dto.type === 'firm_request' || !!dto.company;
    this.notifRepo.create({
      id: randomUUID(),
      userId: 'U000',
      companyId: '',
      type: 'system',
      date: today(),
      title: isFirmRequest ? 'New Firm Creation Request' : 'New Contact Inquiry',
      body: isFirmRequest
        ? `Firm creation request received from ${dto.name} (${dto.company || 'New Firm'}, ${dto.email}, ${dto.phone}).`
        : `Contact inquiry received from ${dto.name} (${dto.email}, ${dto.phone}).`,
      time: 'Just now',
      read: false,
    });
    return inquiry;
  }

  updateStatus(id: string, status: 'New' | 'Read' | 'Onboarded' | 'Resolved'): InquiryRecord {
    const updated = this.repo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found.`);
    }
    return updated;
  }

  remove(id: string): InquiryRecord {
    const removed = this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found.`);
    }
    return removed;
  }
}
