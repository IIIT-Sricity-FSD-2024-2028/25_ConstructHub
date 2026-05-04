import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  private memoryData: any[] = [
    {
        "id": "U001",
        "name": "Super Admin",
        "email": "super@ch.com",
        "password": "123456",
        "role": "superuser",
        "phone": "+91 98000 00001",
        "avatar": "SA",
        "status": "active",
        "createdAt": "2026-01-01"
    },
    {
        "id": "U002",
        "name": "Rajesh Kumar",
        "email": "rajesh@ch.com",
        "password": "123456",
        "role": "project_manager",
        "phone": "+91 98765 43210",
        "avatar": "RK",
        "status": "active",
        "createdAt": "2026-01-05"
    },
    {
        "id": "U003",
        "name": "Priya Sharma",
        "email": "priya@ch.com",
        "password": "123456",
        "role": "site_engineer",
        "phone": "+91 98765 43211",
        "avatar": "PS",
        "status": "active",
        "createdAt": "2026-01-06"
    },
    {
        "id": "U004",
        "name": "Amit Verma",
        "email": "amit@ch.com",
        "password": "123456",
        "role": "finance_manager",
        "phone": "+91 98765 43212",
        "avatar": "AV",
        "status": "active",
        "createdAt": "2026-01-07"
    },
    {
        "id": "U005",
        "name": "Vikram Patel",
        "email": "vikram@ch.com",
        "password": "123456",
        "role": "client",
        "phone": "+91 98765 43213",
        "avatar": "VP",
        "status": "active",
        "createdAt": "2026-01-10"
    },
    {
        "id": "U006",
        "name": "Amit Sharma",
        "email": "amits@ch.com",
        "password": "123456",
        "role": "site_engineer",
        "phone": "+91 98765 43214",
        "avatar": "AS",
        "status": "active",
        "createdAt": "2026-01-12"
    },
    {
        "id": "U007",
        "name": "John Doe",
        "email": "john@ch.com",
        "password": "123456",
        "role": "client",
        "phone": "+91 98765 43215",
        "avatar": "JD",
        "status": "inactive",
        "createdAt": "2026-01-15"
    },
    {
        "id": "U008",
        "name": "Sanjay Verma",
        "email": "sanjay@ch.com",
        "password": "123456",
        "role": "client",
        "phone": "+91 98765 88811",
        "avatar": "SV",
        "status": "active",
        "createdAt": "2026-02-10"
    },
    {
        "id": "U009",
        "name": "Priya Menon",
        "email": "priyam@ch.com",
        "password": "123456",
        "role": "client",
        "phone": "+91 98765 99922",
        "avatar": "PM",
        "status": "active",
        "createdAt": "2026-02-12"
    }
];

  findAll() { return this.memoryData; }
  findById(id: string) { return this.memoryData.find(item => item.id === id); }
  create(record: any) { this.memoryData.unshift(record); return record; }
  update(id: string, record: any) { const idx = this.memoryData.findIndex(i => i.id === id); if (idx > -1) { this.memoryData[idx] = { ...this.memoryData[idx], ...record }; return this.memoryData[idx]; } return null; }
  remove(id: string) { const startObj = this.memoryData.length; this.memoryData = this.memoryData.filter(i => i.id !== id); return this.memoryData.length < startObj; }
}