"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesRepository = void 0;
const common_1 = require("@nestjs/common");
let ExpensesRepository = class ExpensesRepository {
    memoryData = [
        {
            id: 'E001',
            companyId: 'COMP001',
            projectId: 'P001',
            projectName: 'Apex Skyline Tower',
            category: 'Materials',
            amount: 450000,
            date: '2026-03-02',
            recordedBy: 'U004',
            description: '500 bags OPC Grade 53 cement.',
        },
        {
            id: 'E002',
            companyId: 'COMP001',
            projectId: 'P002',
            projectName: 'Apex Commercial Complex',
            category: 'Equipment',
            amount: 280000,
            date: '2026-03-01',
            recordedBy: 'U004',
            description: 'Tower crane monthly rental.',
        },
        {
            id: 'E003',
            companyId: 'COMP002',
            projectId: 'P003',
            projectName: 'L&T Infrastructure Project',
            category: 'Materials',
            amount: 1850000,
            date: '2026-03-01',
            recordedBy: 'U009',
            description: 'TMT steel rebar shipment for metro girders.',
        },
        {
            id: 'E004',
            companyId: 'COMP002',
            projectId: 'P004',
            projectName: 'L&T Metro Development',
            category: 'Labor',
            amount: 350000,
            date: '2026-03-02',
            recordedBy: 'U009',
            description: 'Site labor payout for excavation.',
        },
    ];
    getCompanyId(item) {
        if (item.companyId)
            return item.companyId;
        if (item.projectId === 'P001' || item.projectId === 'P002')
            return 'COMP001';
        if (item.projectId === 'P003' || item.projectId === 'P004')
            return 'COMP002';
        return 'COMP001';
    }
    findAll() {
        return this.memoryData.map((item) => ({
            ...item,
            companyId: this.getCompanyId(item),
        }));
    }
    findById(id) {
        const item = this.memoryData.find((i) => i.id === id);
        if (!item)
            return null;
        return { ...item, companyId: this.getCompanyId(item) };
    }
    findByCompanyId(companyId) {
        return this.findAll().filter((item) => item.companyId === companyId);
    }
    create(record) {
        this.memoryData.unshift(record);
        return record;
    }
    update(id, record) {
        const idx = this.memoryData.findIndex((i) => i.id === id);
        if (idx > -1) {
            this.memoryData[idx] = { ...this.memoryData[idx], ...record };
            return this.memoryData[idx];
        }
        return null;
    }
    remove(id) {
        const startObj = this.memoryData.length;
        this.memoryData = this.memoryData.filter((i) => i.id !== id);
        return this.memoryData.length < startObj;
    }
};
exports.ExpensesRepository = ExpensesRepository;
exports.ExpensesRepository = ExpensesRepository = __decorate([
    (0, common_1.Injectable)()
], ExpensesRepository);
//# sourceMappingURL=expenses.repository.js.map