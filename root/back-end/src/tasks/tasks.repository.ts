import { Injectable } from '@nestjs/common';

@Injectable()
export class TasksRepository {
  private memoryData: any[] = [
    { "id": "T001", "title": "Foundation Concrete Pouring",  "projectId": "P001", "projectName": "Skyline Tower",          "assignedTo": "U003", "assignedName": "Priya Sharma", "priority": "High",   "status": "In Progress", "progress": 75,  "startDate": "2026-03-01", "deadline": "2026-03-08", "description": "Complete the foundation concrete pouring for blocks A and B. Ensure proper curing time is maintained.", "remarks": "75% done. Block A complete, Block B in progress." },
    { "id": "T002", "title": "Steel Framework Installation",  "projectId": "P001", "projectName": "Skyline Tower",          "assignedTo": "U003", "assignedName": "Priya Sharma", "priority": "Medium", "status": "Pending",     "progress": 0,   "startDate": "2026-03-10", "deadline": "2026-03-20", "description": "Install steel framework for floors 1-5.", "remarks": "" },
    { "id": "T003", "title": "Electrical Wiring - Floor 2",   "projectId": "P002", "projectName": "Metro Plaza",            "assignedTo": "U003", "assignedName": "Priya Sharma", "priority": "High",   "status": "In Progress", "progress": 60,  "startDate": "2026-03-05", "deadline": "2026-03-12", "description": "Complete electrical wiring for Floor 2 including main panels and junction boxes.", "remarks": "60% done. Main panels installed." },
    { "id": "T004", "title": "Plumbing Installation",          "projectId": "P003", "projectName": "Green Valley Residency", "assignedTo": "U003", "assignedName": "Priya Sharma", "priority": "Medium", "status": "Completed",   "progress": 100, "startDate": "2026-02-25", "deadline": "2026-03-05", "description": "Install plumbing lines for blocks C and D.", "remarks": "Completed on time. All checks passed." },
    { "id": "T005", "title": "Foundation Inspection",          "projectId": "P001", "projectName": "Skyline Tower",          "assignedTo": "U006", "assignedName": "Amit Sharma",  "priority": "High",   "status": "In Progress", "progress": 60,  "startDate": "2026-03-01", "deadline": "2026-03-08", "description": "Inspect foundation work quality and compliance.", "remarks": "Inspection ongoing." },
    { "id": "T006", "title": "Budget Review Q1",               "projectId": "P002", "projectName": "Metro Plaza",            "assignedTo": "U006", "assignedName": "Amit Sharma",  "priority": "Medium", "status": "Pending",     "progress": 0,   "startDate": "2026-03-10", "deadline": "2026-03-15", "description": "Review Q1 budget allocations and expenditures.", "remarks": "" },
    { "id": "T007", "title": "Safety Audit",                   "projectId": "P004", "projectName": "Tech Park Complex",      "assignedTo": "U006", "assignedName": "Amit Sharma",  "priority": "High",   "status": "Completed",   "progress": 100, "startDate": "2026-03-01", "deadline": "2026-03-05", "description": "Conduct safety audit across all active zones.", "remarks": "All safety checks passed. No critical issues." },
    { "id": "T008", "title": "Roofing Work - Block A",         "projectId": "P001", "projectName": "Skyline Tower",          "assignedTo": "U003", "assignedName": "Priya Sharma", "priority": "Low",    "status": "Pending",     "progress": 0,   "startDate": "2026-03-20", "deadline": "2026-04-05", "description": "Complete roofing for Block A.", "remarks": "" }
  ];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}