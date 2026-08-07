import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsRepository {
  private memoryData: any[] = [
    {
        "id": "P001",
        "name": "Skyline Tower",
        "location": "Mumbai, Maharashtra",
        "clientId": "U005",
        "clientName": "Vikram Patel",
        "managerId": "U002",
        "budget": 25000000,
        "spent": 18750000,
        "progress": 75,
        "status": "On Track",
        "startDate": "2026-01-01",
        "endDate": "2026-04-30",
        "teamSize": 24,
        "allocations": {
            "Materials": 12000000,
            "Labor": 8000000,
            "Equipment": 3000000,
            "Other": 2000000
        },
        "description": "Residential high-rise construction project in South Mumbai."
    },
    {
        "id": "P002",
        "name": "Metro Plaza",
        "location": "Delhi NCR",
        "clientId": "U007",
        "clientName": "John Doe",
        "managerId": "U002",
        "budget": 52000000,
        "spent": 31200000,
        "progress": 60,
        "status": "On Track",
        "startDate": "2026-01-15",
        "endDate": "2026-06-15",
        "teamSize": 38,
        "allocations": {
            "Materials": 25000000,
            "Labor": 15000000,
            "Equipment": 8000000,
            "Other": 4000000
        },
        "description": "Commercial complex with retail and office spaces."
    },
    {
        "id": "P003",
        "name": "Green Valley Residency",
        "location": "Bangalore, Karnataka",
        "clientId": "U008",
        "clientName": "Sanjay Verma",
        "managerId": "U002",
        "budget": 38000000,
        "spent": 17100000,
        "progress": 45,
        "status": "At Risk",
        "startDate": "2026-02-01",
        "endDate": "2026-07-20",
        "teamSize": 32,
        "allocations": {
            "Materials": 18000000,
            "Labor": 12000000,
            "Equipment": 5000000,
            "Other": 3000000
        },
        "description": "Gated residential community with 200 units."
    },
    {
        "id": "P004",
        "name": "Tech Park Complex",
        "location": "Pune, Maharashtra",
        "clientId": "U009",
        "clientName": "Priya Menon",
        "managerId": "U002",
        "budget": 85000000,
        "spent": 25500000,
        "progress": 30,
        "status": "On Track",
        "startDate": "2026-02-15",
        "endDate": "2026-09-10",
        "teamSize": 52,
        "allocations": {
            "Materials": 45000000,
            "Labor": 20000000,
            "Equipment": 12000000,
            "Other": 8000000
        },
        "description": "IT park with multiple buildings and amenities."
    }
];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}