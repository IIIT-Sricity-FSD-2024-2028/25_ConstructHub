import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';
import { QuotationItem } from './quotations.repository';

export interface ContractRecord {
  id: string;
  workOrderNumber: string;
  requirementId: string;
  quotationId: string;
  projectId: string;
  companyId: string;
  companyName: string;
  clientId: string;
  clientName: string;
  title: string;
  location: string;
  value: number; // original agreed value; later changes are recorded as variations, not overwrites
  items: QuotationItem[]; // scope copied from the accepted quotation
  startDate: string;
  endDate: string;
  durationDays: number;
  terms: string;
  status: 'active' | 'completed' | 'terminated';
  acceptedAt: string;
  createdAt: string;
}

@Injectable()
export class ContractsRepository {
  constructor() {
    attachStore<ContractRecord[]>('contracts', this.memoryData, () => this.memoryData, (v) => {
      this.memoryData = v;
    });
  }

  private memoryData: ContractRecord[] = [
    {
      id: 'CON001',
      workOrderNumber: 'WO-CON001',
      requirementId: 'REQ003',
      quotationId: 'QUO005',
      projectId: 'P001',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      title: 'Apex Skyline Tower',
      location: 'Mumbai, Maharashtra',
      value: 31250000,
      items: [
        { description: 'Foundation', unit: 'stage', quantity: 1, rate: 5000000, amount: 5000000 },
        { description: 'Structure', unit: 'stage', quantity: 1, rate: 26250000, amount: 26250000 },
      ],
      startDate: '2026-01-01',
      endDate: '2027-03-31',
      durationDays: 180,
      terms: 'Scope of work as itemised in accepted quotation QUO005 for "Apex Skyline Tower" at Mumbai, Maharashtra. Agreed contract value: INR 3,12,50,000. Planned duration: 180 days from 2026-01-01. A mobilization advance of 10% (INR 31,25,000) is payable before work starts. Payment is made against milestone-based interim bills approved by the client. Additional or changed work requires a written variation approved by both parties before it starts.',
      status: 'active',
      acceptedAt: '2025-12-20T09:30:00.000Z',
      createdAt: '2025-12-20',
    },
    {
      id: 'CON002',
      workOrderNumber: 'WO-CON002',
      requirementId: 'REQ004',
      quotationId: 'QUO007',
      projectId: 'P002',
      companyId: 'COMP001',
      companyName: 'Apex Builders',
      clientId: 'U011',
      clientName: 'Suresh Shah',
      title: 'Apex Commercial Complex',
      location: 'Pune, Maharashtra',
      value: 50400000,
      items: [
        { description: 'Electrical & plumbing rough-in', unit: 'stage', quantity: 1, rate: 25200000, amount: 25200000 },
        { description: 'Finishing', unit: 'stage', quantity: 1, rate: 25200000, amount: 25200000 },
      ],
      startDate: '2026-01-15',
      endDate: '2027-02-28',
      durationDays: 150,
      terms: 'Scope of work as itemised in accepted quotation QUO007 for "Apex Commercial Complex" at Pune, Maharashtra. Agreed contract value: INR 5,04,00,000. Mobilization advance of 10% (INR 50,40,000) is recovered proportionally across milestone stage bills.',
      status: 'active',
      acceptedAt: '2026-01-10T11:00:00.000Z',
      createdAt: '2026-01-10',
    },
    {
      id: 'CON003',
      workOrderNumber: 'WO-CON003',
      requirementId: 'REQ005',
      quotationId: 'QUO008',
      projectId: 'P003',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      title: 'L&T Infrastructure Project',
      location: 'Delhi NCR',
      value: 78000000,
      items: [
        { description: 'Pier construction', unit: 'stage', quantity: 1, rate: 39000000, amount: 39000000 },
        { description: 'Superstructure', unit: 'stage', quantity: 1, rate: 39000000, amount: 39000000 },
      ],
      startDate: '2026-02-01',
      endDate: '2027-04-30',
      durationDays: 240,
      terms: 'Scope of work as itemised in accepted quotation QUO008 for "L&T Infrastructure Project" at Delhi NCR. Agreed contract value: INR 7,80,00,000. Mobilization advance of 10% (INR 78,00,000) is recovered proportionally across milestone stage bills.',
      status: 'active',
      acceptedAt: '2026-01-25T10:00:00.000Z',
      createdAt: '2026-01-25',
    },
    {
      id: 'CON004',
      workOrderNumber: 'WO-CON004',
      requirementId: 'REQ006',
      quotationId: 'QUO009',
      projectId: 'P004',
      companyId: 'COMP002',
      companyName: 'L&T Infrastructure',
      clientId: 'U010',
      clientName: 'Anand Mahindra',
      title: 'L&T Metro Development',
      location: 'Bangalore, Karnataka',
      value: 37200000,
      items: [
        { description: 'Site preparation', unit: 'stage', quantity: 1, rate: 11160000, amount: 11160000 },
        { description: 'Drainage works', unit: 'stage', quantity: 1, rate: 26040000, amount: 26040000 },
      ],
      startDate: '2026-02-15',
      endDate: '2027-05-31',
      durationDays: 285,
      terms: 'Scope of work as itemised in accepted quotation QUO009 for "L&T Metro Development" at Bangalore, Karnataka. Agreed contract value: INR 3,72,00,000. Mobilization advance of 10% (INR 37,20,000) is recovered proportionally across milestone stage bills.',
      status: 'active',
      acceptedAt: '2026-02-05T14:00:00.000Z',
      createdAt: '2026-02-05',
    },
  ];

  findAll(): ContractRecord[] {
    return this.memoryData;
  }
  findById(id: string): ContractRecord | undefined {
    return this.memoryData.find((c) => c.id === id);
  }
  nextId(): string {
    return nextSequentialId('CON', this.memoryData);
  }
  create(record: ContractRecord): ContractRecord {
    this.memoryData.push(record);
    return record;
  }
  update(id: string, patch: Partial<ContractRecord>): ContractRecord | undefined {
    const i = this.memoryData.findIndex((c) => c.id === id);
    if (i === -1) return undefined;
    this.memoryData[i] = { ...this.memoryData[i], ...patch };
    return this.memoryData[i];
  }
  remove(id: string): boolean {
    const i = this.memoryData.findIndex((c) => c.id === id);
    if (i === -1) return false;
    this.memoryData.splice(i, 1);
    return true;
  }
}
