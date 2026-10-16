import { Injectable } from '@nestjs/common';

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  type?: 'firm_request' | 'general_inquiry';
  message: string;
  status: 'New' | 'Read' | 'Onboarded' | 'Resolved';
  createdAt: string;
}

@Injectable()
export class InquiriesRepository {
  private memoryData: InquiryRecord[] = [
    {
      id: 'INQ001',
      name: 'Rohan Sharma',
      email: 'rohan@builder.com',
      phone: '9876543210',
      company: 'Apex Metro Works',
      type: 'firm_request',
      message: 'We are interested in licensing Construct Hub for 50 construction sites.',
      status: 'New',
      createdAt: new Date().toISOString(),
    },
  ];

  findAll(): InquiryRecord[] {
    return this.memoryData;
  }

  findById(id: string): InquiryRecord | null {
    return this.memoryData.find((inq) => inq.id === id) || null;
  }

  create(dto: { name: string; email: string; phone: string; message: string; company?: string; type?: string }): InquiryRecord {
    const id = `INQ${String(this.memoryData.length + 1).padStart(3, '0')}`;
    const newInquiry: InquiryRecord = {
      id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company || '',
      type: (dto.type as any) || (dto.company ? 'firm_request' : 'general_inquiry'),
      message: dto.message,
      status: 'New',
      createdAt: new Date().toISOString(),
    };
    this.memoryData.unshift(newInquiry);
    return newInquiry;
  }

  updateStatus(id: string, status: 'New' | 'Read' | 'Onboarded' | 'Resolved'): InquiryRecord | null {
    const inquiry = this.findById(id);
    if (!inquiry) return null;
    inquiry.status = status;
    return inquiry;
  }
}
