import { Injectable } from '@nestjs/common';

@Injectable()
export class BillsRepository {
  private memoryData: any[] = [
    { "id": "BILL-2024-001", "projectId": "P001", "projectName": "Skyline Tower",          "clientId": "U005", "clientName": "Vikram Patel",  "amount": 2500000, "milestone": "Foundation Complete",    "description": "Billing for completed foundation work including materials and labor.", "generatedBy": "U004", "status": "Approved", "decisionDate": "2026-03-05", "dueDate": "2026-03-11", "rejectionReason": "" },
    { "id": "BILL-2024-002", "projectId": "P002", "projectName": "Metro Plaza",            "clientId": "U007", "clientName": "John Doe",      "amount": 3750000, "milestone": "Structure Phase 1",      "description": "Billing for completed structural work phase 1.",                      "generatedBy": "U004", "status": "Pending",  "decisionDate": "",           "dueDate": "2026-03-12", "rejectionReason": "" },
    { "id": "BILL-2024-003", "projectId": "P003", "projectName": "Green Valley Residency", "clientId": "U008", "clientName": "Sanjay Verma",  "amount": 1800000, "milestone": "Foundation & Site Prep", "description": "Site preparation and foundation billing.",                            "generatedBy": "U004", "status": "Approved", "decisionDate": "2026-03-02", "dueDate": "2026-03-08", "rejectionReason": "" },
    { "id": "BILL-2024-004", "projectId": "P004", "projectName": "Tech Park Complex",      "clientId": "U009", "clientName": "Priya Menon",   "amount": 4200000, "milestone": "Site Clearing",          "description": "Site clearing and initial groundwork.",                               "generatedBy": "U004", "status": "Rejected", "decisionDate": "2026-03-01", "dueDate": "2026-03-07", "rejectionReason": "Amount disputed. Requesting revised invoice." },
    { "id": "BILL-2024-005", "projectId": "P002", "projectName": "Metro Plaza",            "clientId": "U007", "clientName": "John Doe",      "amount": 5600000, "milestone": "Structure Phase 2",      "description": "Billing for structure phase 2 completion.",                           "generatedBy": "U004", "status": "Pending",  "decisionDate": "",           "dueDate": "2026-03-18", "rejectionReason": "" }
  ];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}