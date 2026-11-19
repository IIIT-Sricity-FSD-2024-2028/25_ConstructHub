import { attachStore } from '../utils/json-store';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsRepository {
  constructor() {
    attachStore('reports', this.memoryData, () => this.memoryData, (v) => { this.memoryData = v; });
  }

  private memoryData: any[] = [
    {
      id: 'R001',
      title: 'Daily Site Log - Apex Skyline Tower',
      companyId: 'COMP001',
      projectId: 'P001',
      projectName: 'Apex Skyline Tower',
      submittedBy: 'U003',
      reporterName: 'Priya Sharma',
      date: '2026-03-02',
      workDone: 'Concrete pouring for Blocks A and B complete.',
      issues: 'None.',
      photos: 0,
      photoUrls: [],
      // linked to the Foundation milestone and task, with weather, labor and stock that Site Stock issued to the engineer
      milestoneId: 'MS001',
      milestoneName: 'Foundation',
      taskId: 'T001',
      taskTitle: 'Foundation Concrete Pouring',
      weather: 'Sunny',
      laborCount: 22,
      progress: 100,
      status: 'Completed',
      priority: 'Low',
      materials: [{ name: 'Cement OPC 53 grade', qty: 20, unit: 'bags' }],
    },
    {
      id: 'R002',
      title: 'MEP & Rough-In Progress Log - Apex Commercial Complex',
      companyId: 'COMP001',
      projectId: 'P002',
      projectName: 'Apex Commercial Complex',
      submittedBy: 'U003',
      reporterName: 'Priya Sharma',
      date: '2026-03-05',
      workDone: 'Main water supply pipeline pressure test passed and Floor 2 electrical conduit routing completed.',
      issues: 'Minor conduit delivery delay resolved.',
      photos: 0,
      photoUrls: [],
      milestoneId: 'MS003',
      milestoneName: 'Electrical & plumbing rough-in',
      taskId: 'T004',
      taskTitle: 'Plumbing Line Inspection',
      weather: 'Sunny',
      laborCount: 28,
      progress: 100,
      status: 'Completed',
      priority: 'Low',
      materials: [{ name: 'UPVC Pressure Pipe 110mm', qty: 45, unit: 'lengths' }],
    },
    {
      id: 'R003',
      title: 'Metro Corridor Pier Cap Log - L&T Infrastructure',
      companyId: 'COMP002',
      projectId: 'P003',
      projectName: 'L&T Infrastructure Project',
      submittedBy: 'U008',
      reporterName: 'Rohan Gupta',
      date: '2026-03-02',
      workDone: 'Pillar 10-15 pier cap reinforcement cage inspection and M40 concrete pour completed.',
      issues: 'Traffic diversion coordinated on main highway.',
      photos: 0,
      photoUrls: [],
      milestoneId: 'MS005',
      milestoneName: 'Pier construction',
      taskId: 'T005',
      taskTitle: 'Pier Cap Casting - Zone 1',
      weather: 'Sunny',
      laborCount: 45,
      progress: 100,
      status: 'Completed',
      priority: 'Medium',
      materials: [{ name: 'Cement OPC 53 grade', qty: 80, unit: 'bags' }],
    },
    {
      id: 'R004',
      title: 'Site Preparation & Excavation Log - L&T Metro Development',
      companyId: 'COMP002',
      projectId: 'P004',
      projectName: 'L&T Metro Development',
      submittedBy: 'U008',
      reporterName: 'Rohan Gupta',
      date: '2026-03-04',
      workDone: 'Mass excavation, grading and soil stabilization across Zone A finished.',
      issues: 'None.',
      photos: 0,
      photoUrls: [],
      milestoneId: 'MS007',
      milestoneName: 'Site preparation',
      taskId: 'T007',
      taskTitle: 'Land Clearing & Excavation',
      weather: 'Cloudy',
      laborCount: 30,
      progress: 100,
      status: 'Completed',
      priority: 'Low',
      materials: [{ name: 'Granular Sub-Base (GSB)', qty: 120, unit: 'm3' }],
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
