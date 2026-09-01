import { Injectable } from '@nestjs/common';

@Injectable()
export class BillsRepository {
  private memoryData: any[] = [
    {
      id: 'B001',
      billNumber: 'INV-APEX-001',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      amount: 4500000,
      date: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'Pending Approval',
      priority: 'High',
      description: 'Foundation completion billing.',
      generatedBy: 'U004',
    },
    {
      id: 'B002',
      billNumber: 'INV-APEX-002',
      companyId: 'COMP001',
      projectId: 'P002',
      projectName: 'Apex Commercial Complex',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      amount: 8200000,
      date: '2026-02-20',
      dueDate: '2026-03-05',
      status: 'Paid',
      priority: 'Medium',
      description: 'Structure milestone billing.',
      generatedBy: 'U004',
    },
    {
      id: 'B003',
      billNumber: 'INV-LT-001',
      companyId: 'COMP002',
      projectId: 'P003',
      projectName: 'L&T Infrastructure Project',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      amount: 12500000,
      date: '2026-03-01',
      dueDate: '2026-03-20',
      status: 'Approved',
      priority: 'High',
      description: 'Metro pillar foundation milestone.',
      generatedBy: 'U009',
    },
    {
      id: 'B004',
      billNumber: 'INV-LT-002',
      companyId: 'COMP002',
      projectId: 'P004',
      projectName: 'L&T Metro Development',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      amount: 3500000,
      date: '2026-02-28',
      dueDate: '2026-03-14',
      status: 'Pending Approval',
      priority: 'Medium',
      description: 'Land excavation milestone billing.',
      generatedBy: 'U009',
    },
  ];

  private getCompanyId(item: any) {
    if (item.companyId) return item.companyId;
    if (item.projectId === 'P001' || item.projectId === 'P002' || item.clientId === 'U005') return 'COMP001';
    if (item.projectId === 'P003' || item.projectId === 'P004' || item.clientId === 'U010') return 'COMP002';
    return 'COMP001';
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