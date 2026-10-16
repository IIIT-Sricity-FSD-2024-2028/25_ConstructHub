import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagesRepository {
  private memoryData: any[] = [
    {
      id: 'M001',
      companyId: 'COMP001',
      from: 'U002',
      fromName: 'Rajesh Kumar',
      to: 'U003',
      toName: 'Priya Sharma',
      text: 'Please review the updated project timeline for Apex Skyline Tower.',
      time: '10:30 AM',
      date: '2026-03-24',
    },
    {
      id: 'M002',
      companyId: 'COMP001',
      from: 'U003',
      fromName: 'Priya Sharma',
      to: 'U002',
      toName: 'Rajesh Kumar',
      text: 'Sure, I will inspect block A site progress and send the report.',
      time: '10:32 AM',
      date: '2026-03-24',
    },
    {
      id: 'M003',
      companyId: 'COMP002',
      from: 'U007',
      fromName: 'Sanjay Mehta',
      to: 'U008',
      toName: 'Rohan Gupta',
      text: 'Check pier cap alignment for metro pillar 12.',
      time: '11:15 AM',
      date: '2026-03-24',
    },
    {
      id: 'M004',
      companyId: 'COMP002',
      from: 'U008',
      fromName: 'Rohan Gupta',
      to: 'U007',
      toName: 'Sanjay Mehta',
      text: 'Alignment verified. Concrete pouring scheduled for 2 PM.',
      time: '11:30 AM',
      date: '2026-03-24',
    },
    {
      id: 'M005',
      companyId: 'COMP001',
      from: 'U005',
      fromName: 'Vikram Patel',
      to: 'U002',
      toName: 'Rajesh Kumar',
      text: 'Hi Rajesh, please let me know when we can expect the structural steel framework update.',
      time: '03:20 PM',
      date: '2026-03-23',
    },
    {
      id: 'M006',
      companyId: 'COMP001',
      from: 'U002',
      fromName: 'Rajesh Kumar',
      to: 'U005',
      toName: 'Vikram Patel',
      text: 'Hello Vikram! Steel framework installation is scheduled starting March 10th.',
      time: '03:45 PM',
      date: '2026-03-23',
    },
    {
      id: 'M007',
      companyId: 'COMP001',
      from: 'U004',
      fromName: 'Amit Verma',
      to: 'U002',
      toName: 'Rajesh Kumar',
      text: 'Rajesh, we recorded the 500 bags OPC Grade 53 cement expense (₹4.50L) for Skyline Tower.',
      time: '11:30 AM',
      date: '2026-03-23',
    },
    {
      id: 'M008',
      companyId: 'COMP001',
      from: 'U002',
      fromName: 'Rajesh Kumar',
      to: 'U004',
      toName: 'Amit Verma',
      text: 'Acknowledged Amit. Delivery challans and weighbridge slips are verified on site.',
      time: '11:50 AM',
      date: '2026-03-23',
    },
  ];

  private getCompanyId(item: any) {
    if (item.companyId) return item.companyId;
    if (item.from === 'U005' || item.to === 'U005' || item.from === 'U004' || item.to === 'U004' || item.from === 'U001' || item.to === 'U001' || item.from === 'U002' || item.to === 'U002' || item.from === 'U003' || item.to === 'U003') return 'COMP001';
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
    this.memoryData.push(record);
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