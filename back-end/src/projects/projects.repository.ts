import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsRepository {
  private memoryData: any[] = [
    {
      id: 'P001',
      name: 'Apex Skyline Tower',
      location: 'Mumbai, Maharashtra',
      companyId: 'COMP001',
      clientId: 'U005',
      clientName: 'Vikram Patel',
      managerId: 'U002',
      managerName: 'Rajesh Kumar',
      siteEngineerId: 'U003',
      financeManagerId: 'U004',
      budget: 25000000,
      spent: 18750000,
      progress: 75,
      status: 'On Track',
      startDate: '2026-01-01',
      endDate: '2026-04-30',
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
      clientId: 'U005',
      clientName: 'Vikram Patel',
      managerId: 'U002',
      managerName: 'Rajesh Kumar',
      siteEngineerId: 'U003',
      financeManagerId: 'U004',
      budget: 42000000,
      spent: 25200000,
      progress: 60,
      status: 'On Track',
      startDate: '2026-01-15',
      endDate: '2026-06-15',
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
      clientName: 'Anand Mahindra',
      managerId: 'U007',
      managerName: 'Sanjay Mehta',
      siteEngineerId: 'U008',
      financeManagerId: 'U009',
      budget: 65000000,
      spent: 26000000,
      progress: 40,
      status: 'On Track',
      startDate: '2026-02-01',
      endDate: '2026-09-30',
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
      clientName: 'Anand Mahindra',
      managerId: 'U007',
      managerName: 'Sanjay Mehta',
      siteEngineerId: 'U008',
      financeManagerId: 'U009',
      budget: 31000000,
      spent: 6200000,
      progress: 20,
      status: 'At Risk',
      startDate: '2026-02-15',
      endDate: '2026-11-30',
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