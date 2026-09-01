import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsRepository {
  private memoryData: any[] = [
    {
      id: 'N001',
      companyId: 'COMP001',
      userId: 'U003',
      type: 'task',
      title: 'New Task Assigned',
      body: 'Task "Steel Framework Installation" assigned by Rajesh Kumar.',
      date: '2026-03-02',
      read: false,
    },
    {
      id: 'N002',
      companyId: 'COMP001',
      userId: 'U002',
      type: 'bill',
      title: 'Bill Created',
      body: 'Bill INV-APEX-001 created for Apex Skyline Tower.',
      date: '2026-03-01',
      read: true,
    },
    {
      id: 'N003',
      companyId: 'COMP001',
      userId: 'U005',
      type: 'bill',
      title: 'Milestone Bill Pending',
      body: 'Invoice INV-APEX-001 for Apex Skyline Tower requires your approval.',
      date: '2026-03-01',
      read: false,
    },
    {
      id: 'N004',
      companyId: 'COMP002',
      userId: 'U008',
      type: 'task',
      title: 'Metro Site Log Due',
      body: 'Submit daily site report for L&T Infrastructure Project.',
      date: '2026-03-03',
      read: false,
    },
    {
      id: 'N005',
      companyId: 'COMP002',
      userId: 'U007',
      type: 'bill',
      title: 'Bill Approved',
      body: 'Bill INV-LT-001 approved by client Anand Mahindra.',
      date: '2026-03-02',
      read: true,
    },
    {
      id: 'N000',
      companyId: '',
      userId: 'U000',
      type: 'system',
      title: 'New Platform Inquiry',
      body: 'Contact inquiry received for Construct Hub SaaS Platform.',
      date: '2026-03-03',
      read: false,
    },
  ];

  private getCompanyId(item: any) {
    if (item.companyId !== undefined) return item.companyId;
    if (
      item.userId === 'U005' ||
      item.userId === 'U001' ||
      item.userId === 'U002' ||
      item.userId === 'U003' ||
      item.userId === 'U004'
    )
      return 'COMP001';
    if (item.userId === 'U000') return '';
    return 'COMP002';
  }

  findAll() {
    return this.memoryData.map((item) => ({
      ...item,
      companyId: this.getCompanyId(item),
    }));
  }

  findById(id: string) {
    const item = this.memoryData.find((i) => i.id === id);
    if (!item) return null;
    return { ...item, companyId: this.getCompanyId(item) };
  }

  findByCompanyId(companyId: string) {
    return this.findAll().filter((item) => item.companyId === companyId);
  }

  create(record: any) {
    this.memoryData.unshift(record);
    return record;
  }
  update(id: string, record: any) {
    const idx = this.memoryData.findIndex((i) => i.id === id);
    if (idx > -1) {
      this.memoryData[idx] = { ...this.memoryData[idx], ...record };
      return this.memoryData[idx];
    }
    return null;
  }
  remove(id: string) {
    const startObj = this.memoryData.length;
    this.memoryData = this.memoryData.filter((i) => i.id !== id);
    return this.memoryData.length < startObj;
  }
}