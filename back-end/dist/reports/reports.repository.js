"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsRepository = void 0;
const common_1 = require("@nestjs/common");
let ReportsRepository = class ReportsRepository {
    memoryData = [
        {
            id: 'R001',
            title: 'Daily Site Log - Apex Skyline Tower',
            companyId: 'COMP001',
            projectId: 'P001',
            projectName: 'Apex Skyline Tower',
            submittedBy: 'U003',
            reporterName: 'Priya Sharma',
            date: '2026-03-02',
            workDone: 'Concrete pouring for Block A complete.',
            issues: 'None.',
            photos: 0,
            photoUrls: [],
        },
        {
            id: 'R002',
            title: 'Structural Work Progress Log',
            companyId: 'COMP001',
            projectId: 'P002',
            projectName: 'Apex Commercial Complex',
            submittedBy: 'U003',
            reporterName: 'Priya Sharma',
            date: '2026-03-05',
            workDone: 'Steel framework installation on floors 3-5 completed.',
            issues: 'Minor material delay.',
            photos: 0,
            photoUrls: [],
        },
        {
            id: 'R003',
            title: 'Metro Corridor Inspection Log',
            companyId: 'COMP002',
            projectId: 'P003',
            projectName: 'L&T Infrastructure Project',
            submittedBy: 'U008',
            reporterName: 'Rohan Gupta',
            date: '2026-03-02',
            workDone: 'Pillar 12 pier cap alignment checked.',
            issues: 'Traffic diversion required on main highway.',
            photos: 0,
            photoUrls: [],
        },
        {
            id: 'R004',
            title: 'Smart City Site Excavation Log',
            companyId: 'COMP002',
            projectId: 'P004',
            projectName: 'L&T Metro Development',
            submittedBy: 'U008',
            reporterName: 'Rohan Gupta',
            date: '2026-03-04',
            workDone: 'Mass excavation and land clearing finished.',
            issues: 'None.',
            photos: 0,
            photoUrls: [],
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
exports.ReportsRepository = ReportsRepository;
exports.ReportsRepository = ReportsRepository = __decorate([
    (0, common_1.Injectable)()
], ReportsRepository);
//# sourceMappingURL=reports.repository.js.map