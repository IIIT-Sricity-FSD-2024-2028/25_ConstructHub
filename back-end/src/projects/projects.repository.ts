import { attachStore } from '../utils/json-store';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsRepository {
  constructor() {
    attachStore('projects', this.memoryData, () => this.memoryData, (v) => { this.memoryData = v; });
  }

  private memoryData: any[] = [
    {
      id: 'P001',
      name: 'Apex Skyline Tower',
      location: 'Mumbai, Maharashtra',
      companyId: 'COMP001',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      clientEmail: 'client1@gmail.com',
      clientPhone: '+91 98765 43213',
      managerId: 'U002',
      managerName: 'Rajesh Kumar',
      siteEngineerId: 'U003',
      financeManagerId: 'U004',
      // Marketplace-awarded project (REQ003 -> QUO005 -> CON001): budget is the internal site cost cap,
      // contractValue is what the client pays (internal 2,50,00,000 + 25% markup).
      budget: 25000000,
      contractValue: 31250000,
      internalBaseCost: 25000000,
      markupPercent: 25,
      mobilizationAdvancePercent: 10,
      mobilizationAdvanceAmount: 3125000,
      source: 'marketplace',
      requirementId: 'REQ003',
      quotationId: 'QUO005',
      contractId: 'CON001',
      spent: 450000,
      progress: 40,
      status: 'On Track',
      startDate: '2026-01-01',
      endDate: '2027-03-31',
      teamSize: 24,
      allocations: {
        Materials: 12000000,
        Labor: 8000000,
        Equipment: 3000000,
        Other: 2000000,
      },
      description: 'High-rise luxury residential project in South Mumbai.',
    },
    {
      id: 'P002',
      name: 'Apex Commercial Complex',
      location: 'Pune, Maharashtra',
      companyId: 'COMP001',
      clientId: 'U011',
      clientName: 'Suresh Shah',
      clientEmail: 'client3@gmail.com',
      clientPhone: '+91 98765 43219',
      managerId: 'U002',
      managerName: 'Rajesh Kumar',
      siteEngineerId: 'U003',
      financeManagerId: 'U004',
      budget: 42000000,
      contractValue: 50400000,
      internalBaseCost: 42000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      mobilizationAdvanceAmount: 5040000,
      source: 'marketplace',
      requirementId: 'REQ004',
      quotationId: 'QUO007',
      contractId: 'CON002',
      spent: 280000,
      progress: 40,
      status: 'On Track',
      startDate: '2026-01-15',
      endDate: '2027-02-28',
      teamSize: 32,
      allocations: {
        Materials: 20000000,
        Labor: 12000000,
        Equipment: 6000000,
        Other: 4000000,
      },
      description: 'Modern IT and retail commercial complex.',
    },
    {
      id: 'P003',
      name: 'L&T Infrastructure Project',
      location: 'Delhi NCR',
      companyId: 'COMP002',
      clientId: 'U010',
      clientEmail: 'client2@gmail.com',
      clientName: 'Anand Mahindra',
      managerId: 'U007',
      managerName: 'Sanjay Mehta',
      siteEngineerId: 'U008',
      financeManagerId: 'U009',
      budget: 65000000,
      contractValue: 78000000,
      internalBaseCost: 65000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      mobilizationAdvanceAmount: 7800000,
      source: 'marketplace',
      requirementId: 'REQ005',
      quotationId: 'QUO008',
      contractId: 'CON003',
      spent: 1850000,
      progress: 25,
      status: 'On Track',
      startDate: '2026-02-01',
      endDate: '2027-04-30',
      teamSize: 50,
      allocations: {
        Materials: 30000000,
        Labor: 20000000,
        Equipment: 10000000,
        Other: 5000000,
      },
      description: 'Urban rapid transit metro elevated corridor.',
    },
    {
      id: 'P004',
      name: 'L&T Metro Development',
      location: 'Bangalore, Karnataka',
      companyId: 'COMP002',
      clientId: 'U010',
      clientEmail: 'client2@gmail.com',
      clientName: 'Anand Mahindra',
      managerId: 'U007',
      managerName: 'Sanjay Mehta',
      siteEngineerId: 'U008',
      financeManagerId: 'U009',
      budget: 31000000,
      contractValue: 37200000,
      internalBaseCost: 31000000,
      markupPercent: 20,
      mobilizationAdvancePercent: 10,
      mobilizationAdvanceAmount: 3720000,
      source: 'marketplace',
      requirementId: 'REQ006',
      quotationId: 'QUO009',
      contractId: 'CON004',
      spent: 350000,
      progress: 30,
      status: 'At Risk',
      startDate: '2026-02-15',
      endDate: '2027-05-31',
      teamSize: 22,
      allocations: {
        Materials: 15000000,
        Labor: 9000000,
        Equipment: 5000000,
        Other: 2000000,
      },
      description: 'Eco-friendly tech park infrastructure.',
    },
  ];

  private getCompanyId(item: any) {
    if (item.companyId) return item.companyId;
    if (item.id === 'P001' || item.id === 'P002') return 'COMP001';
    if (item.id === 'P003' || item.id === 'P004') return 'COMP002';
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