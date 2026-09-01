import { Injectable } from '@nestjs/common';

@Injectable()
export class TasksRepository {
  private memoryData: any[] = [
    {
      id: 'T001',
      title: 'Foundation Concrete Pouring',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      assignedTo: 'U003',
      assignedName: 'Priya Sharma',
      priority: 'High',
      status: 'In Progress',
      progress: 75,
      startDate: '2026-03-01',
      deadline: '2026-03-08',
      description: 'Pour concrete for blocks A and B.',
      remarks: '75% done. Block A complete.',
    },
    {
      id: 'T002',
      title: 'Steel Framework Installation',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      assignedTo: 'U003',
      assignedName: 'Priya Sharma',
      priority: 'Medium',
      status: 'Pending',
      progress: 0,
      startDate: '2026-03-10',
      deadline: '2026-03-20',
      description: 'Install steel framework for floors 1-5.',
      remarks: '',
    },
    {
      id: 'T003',
      title: 'Electrical Wiring - Floor 2',
      companyId: 'COMP001',
      projectId: 'P002',
      projectName: 'Apex Commercial Complex',
      assignedTo: 'U003',
      assignedName: 'Priya Sharma',
      priority: 'High',
      status: 'In Progress',
      progress: 60,
      startDate: '2026-03-05',
      deadline: '2026-03-12',
      description: 'Complete electrical wiring for Floor 2.',
      remarks: '60% done.',
    },
    {
      id: 'T004',
      title: 'Plumbing Line Inspection',
      companyId: 'COMP001',
      projectId: 'P002',
      projectName: 'Apex Commercial Complex',
      assignedTo: 'U003',
      assignedName: 'Priya Sharma',
      priority: 'Medium',
      status: 'Completed',
      progress: 100,
      startDate: '2026-02-25',
      deadline: '2026-03-05',
      description: 'Inspect main water supply pipelines.',
      remarks: 'Passed inspection.',
    },
    {
      id: 'T005',
      title: 'Pier Cap Casting - Zone 1',
      companyId: 'COMP002',
      projectId: 'P003',
      projectName: 'L&T Infrastructure Project',
      assignedTo: 'U008',
      assignedName: 'Rohan Gupta',
      priority: 'High',
      status: 'In Progress',
      progress: 50,
      startDate: '2026-03-01',
      deadline: '2026-03-15',
      description: 'Cast pier caps for metro pillars 10-15.',
      remarks: 'Zone 1 half done.',
    },
    {
      id: 'T006',
      title: 'Viaduct Girder Launching',
      companyId: 'COMP002',
      projectId: 'P003',
      projectName: 'L&T Infrastructure Project',
      assignedTo: 'U008',
      assignedName: 'Rohan Gupta',
      priority: 'High',
      status: 'Pending',
      progress: 0,
      startDate: '2026-03-16',
      deadline: '2026-03-30',
      description: 'Launch U-girders using crane.',
      remarks: '',
    },
    {
      id: 'T007',
      title: 'Land Clearing & Excavation',
      companyId: 'COMP002',
      projectId: 'P004',
      projectName: 'L&T Metro Development',
      assignedTo: 'U008',
      assignedName: 'Rohan Gupta',
      priority: 'Medium',
      status: 'Completed',
      progress: 100,
      startDate: '2026-02-15',
      deadline: '2026-03-01',
      description: 'Clear land area and finish mass excavation.',
      remarks: 'Site ready for foundation.',
    },
    {
      id: 'T008',
      title: 'Drainage Pipeline Installation',
      companyId: 'COMP002',
      projectId: 'P004',
      projectName: 'L&T Metro Development',
      assignedTo: 'U008',
      assignedName: 'Rohan Gupta',
      priority: 'Low',
      status: 'Pending',
      progress: 0,
      startDate: '2026-03-10',
      deadline: '2026-03-25',
      description: 'Install storm water drainage pipes.',
      remarks: '',
    },
  ];

  private getCompanyId(item: any) {
    if (item.companyId) return item.companyId;
    if (item.projectId === 'P001' || item.projectId === 'P002') return 'COMP001';
    if (item.projectId === 'P003' || item.projectId === 'P004') return 'COMP002';
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