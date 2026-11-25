import { attachStore } from '../utils/json-store';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BillsRepository {
  constructor() {
    attachStore('bills', this.memoryData, () => this.memoryData, (v) => { this.memoryData = v; });
  }

  private memoryData: any[] = [
    {
      id: 'B001',
      billNumber: 'INV-APEX-001',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      // Foundation stage bill: quoted stage amount 50,00,000 less 10% mobilization advance recovery 5,00,000.
      amount: 4500000,
      stageAmount: 5000000,
      advanceRecovery: 500000,
      milestone: 'Foundation',
      milestoneId: 'MS001',
      billType: 'milestone',
      siteReportIds: ['R001'],
      date: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'Pending Decision',
      priority: 'High',
      description: 'Stage bill for "Foundation" (1 site report attached). Stage amount ₹50,00,000 less mobilization advance recovery ₹5,00,000.',
      generatedBy: 'U004',
    },
    {
      id: 'B002',
      billNumber: 'INV-APEX-002',
      companyId: 'COMP001',
      projectId: 'P002',
      projectName: 'Apex Commercial Complex',
      clientId: 'U011',
      clientName: 'Suresh Shah',
      amount: 22680000,
      stageAmount: 25200000,
      advanceRecovery: 2520000,
      milestone: 'Electrical & plumbing rough-in',
      milestoneId: 'MS003',
      billType: 'milestone',
      siteReportIds: ['R002'],
      date: '2026-02-20',
      dueDate: '2026-03-05',
      status: 'Accepted',
      decisionDate: '2026-03-02',
      priority: 'Medium',
      description: 'Stage bill for "Electrical & plumbing rough-in" (1 site report attached). Stage amount ₹2,52,00,000 less mobilization advance recovery ₹25,20,000.',
      generatedBy: 'U004',
      contractId: 'CON002',
      quotationId: 'QUO007',
    },
    {
      id: 'B003',
      billNumber: 'INV-LT-001',
      companyId: 'COMP002',
      projectId: 'P003',
      projectName: 'L&T Infrastructure Project',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      amount: 35100000,
      stageAmount: 39000000,
      advanceRecovery: 3900000,
      milestone: 'Pier construction',
      milestoneId: 'MS005',
      billType: 'milestone',
      siteReportIds: ['R003'],
      date: '2026-03-01',
      dueDate: '2026-03-20',
      status: 'Accepted',
      decisionDate: '2026-03-02',
      priority: 'High',
      description: 'Stage bill for "Pier construction" (1 site report attached). Stage amount ₹3,90,00,000 less mobilization advance recovery ₹39,00,000.',
      generatedBy: 'U009',
      contractId: 'CON003',
      quotationId: 'QUO008',
    },
    {
      id: 'B004',
      billNumber: 'INV-LT-002',
      companyId: 'COMP002',
      projectId: 'P004',
      projectName: 'L&T Metro Development',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      amount: 10044000,
      stageAmount: 11160000,
      advanceRecovery: 1116000,
      milestone: 'Site preparation',
      milestoneId: 'MS007',
      billType: 'milestone',
      siteReportIds: ['R004'],
      date: '2026-02-28',
      dueDate: '2026-03-14',
      status: 'Pending Decision',
      priority: 'Medium',
      description: 'Stage bill for "Site preparation" (1 site report attached). Stage amount ₹1,11,60,000 less mobilization advance recovery ₹11,16,000.',
      generatedBy: 'U009',
      contractId: 'CON004',
      quotationId: 'QUO009',
    },
    {
      // Bill #1 of the awarded project: mobilization advance (10% of the contract value), paid by the client before work started.
      id: 'B005',
      billNumber: 'INV-APEX-003',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      amount: 3125000,
      milestone: 'Mobilization Advance',
      milestoneId: null,
      billType: 'advance',
      date: '2026-01-02',
      dueDate: '2026-01-02',
      status: 'Accepted',
      decisionDate: '2026-01-02',
      priority: 'High',
      description: 'Mobilization advance (10% of the contract value) payable before work starts.',
      generatedBy: 'U004',
      contractId: 'CON001',
      quotationId: 'QUO005',
    },
    // Mobilization advances (10% of contract value) of the other awarded projects, paid before work started.
    {
      id: 'B006', billNumber: 'INV-APEX-004', companyId: 'COMP001', projectId: 'P002', projectName: 'Apex Commercial Complex',
      clientId: 'U011', clientName: 'Suresh Shah', amount: 5040000, milestone: 'Mobilization Advance', milestoneId: null, billType: 'advance',
      date: '2026-01-14', dueDate: '2026-01-14', status: 'Accepted', decisionDate: '2026-01-14', priority: 'High',
      description: 'Mobilization advance (10% of the contract value) payable before work starts.', generatedBy: 'U004',
    },
    {
      id: 'B007', billNumber: 'INV-LT-003', companyId: 'COMP002', projectId: 'P003', projectName: 'L&T Infrastructure Project',
      clientId: 'U010', clientName: 'Anand Mahindra', amount: 7800000, milestone: 'Mobilization Advance', milestoneId: null, billType: 'advance',
      date: '2026-01-30', dueDate: '2026-01-30', status: 'Accepted', decisionDate: '2026-01-30', priority: 'High',
      description: 'Mobilization advance (10% of the contract value) payable before work starts.', generatedBy: 'U009',
    },
    {
      id: 'B008', billNumber: 'INV-LT-004', companyId: 'COMP002', projectId: 'P004', projectName: 'L&T Metro Development',
      clientId: 'U010', clientName: 'Anand Mahindra', amount: 3720000, milestone: 'Mobilization Advance', milestoneId: null, billType: 'advance',
      date: '2026-02-13', dueDate: '2026-02-13', status: 'Accepted', decisionDate: '2026-02-13', priority: 'High',
      description: 'Mobilization advance (10% of the contract value) payable before work starts.', generatedBy: 'U009',
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