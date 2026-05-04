import { Injectable } from '@nestjs/common';

@Injectable()
export class ExpensesRepository {
  private memoryData: any[] = [
    { "id": "E001", "projectId": "P001", "projectName": "Skyline Tower",          "category": "Materials", "amount": 850000, "description": "Cement and steel for foundation", "date": "2026-03-01", "recordedBy": "U004", "receipt": "receipt_001.pdf" },
    { "id": "E002", "projectId": "P002", "projectName": "Metro Plaza",            "category": "Labor",     "amount": 450000, "description": "Weekly labor charges",           "date": "2026-03-03", "recordedBy": "U004", "receipt": "" },
    { "id": "E003", "projectId": "P001", "projectName": "Skyline Tower",          "category": "Equipment", "amount": 220000, "description": "Crane rental - 2 weeks",          "date": "2026-03-05", "recordedBy": "U004", "receipt": "receipt_003.pdf" },
    { "id": "E004", "projectId": "P003", "projectName": "Green Valley Residency", "category": "Materials", "amount": 310000, "description": "Bricks and sand",                 "date": "2026-03-06", "recordedBy": "U004", "receipt": "" },
    { "id": "E005", "projectId": "P004", "projectName": "Tech Park Complex",      "category": "Other",     "amount": 75000,  "description": "Site security charges",            "date": "2026-03-07", "recordedBy": "U004", "receipt": "" }
  ];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}