import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagesRepository {
  private memoryData: any[] = [
    { "id": "M001", "from": "U002", "fromName": "Rajesh Kumar", "to": "U003", "toName": "Priya Sharma", "text": "Please review the updated project timeline.", "time": "10:30 AM", "date": "2026-03-24" },
    { "id": "M002", "from": "U003", "fromName": "Priya Sharma", "to": "U002", "toName": "Rajesh Kumar", "text": "Sure, I'll take a look at it right away.",    "time": "10:32 AM", "date": "2026-03-24" },
    { "id": "M003", "from": "U002", "fromName": "Rajesh Kumar", "to": "U003", "toName": "Priya Sharma", "text": "Great! Let me know if you have any questions.", "time": "10:35 AM", "date": "2026-03-24" },
    { "id": "M004", "from": "U004", "fromName": "Amit Verma",   "to": "U002", "toName": "Rajesh Kumar", "text": "Invoice #2401 approved and sent.",              "time": "08:00 AM", "date": "2026-03-24" }
  ];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}