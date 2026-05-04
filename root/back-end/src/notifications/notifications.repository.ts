import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsRepository {
  private memoryData: any[] = [
    { "id": "N001", "userId": "U002", "type": "task",    "title": "Task Completed",   "body": "Foundation work for Skyline Tower has been completed",   "time": "2 hours ago", "read": false },
    { "id": "N002", "userId": "U002", "type": "report",  "title": "New Site Report",  "body": "Daily progress report submitted for Metro Plaza",         "time": "4 hours ago", "read": false },
    { "id": "N003", "userId": "U002", "type": "payment", "title": "Payment Approved", "body": "Invoice #2401 has been approved by client",              "time": "1 day ago",   "read": true  },
    { "id": "N004", "userId": "U003", "type": "task",    "title": "New Task Assigned","body": "Foundation Concrete Pouring assigned to you",            "time": "1 day ago",   "read": false },
    { "id": "N005", "userId": "U004", "type": "bill",    "title": "Bill Approved",    "body": "BILL-2024-001 has been approved by Vikram Patel",        "time": "2 days ago",  "read": false },
    { "id": "N006", "userId": "U005", "type": "bill",    "title": "New Bill Pending", "body": "Invoice for Skyline Tower requires your approval",       "time": "3 hours ago", "read": false }
  ];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}