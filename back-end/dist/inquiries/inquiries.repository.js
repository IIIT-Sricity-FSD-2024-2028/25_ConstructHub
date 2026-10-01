"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InquiriesRepository = void 0;
const common_1 = require("@nestjs/common");
let InquiriesRepository = class InquiriesRepository {
    memoryData = [
        {
            id: 'INQ001',
            name: 'Rohan Sharma',
            email: 'rohan@builder.com',
            phone: '9876543210',
            message: 'We are interested in licensing Construct Hub for 50 construction sites.',
            status: 'New',
            createdAt: new Date().toISOString(),
        },
    ];
    findAll() {
        return this.memoryData;
    }
    findById(id) {
        return this.memoryData.find((inq) => inq.id === id) || null;
    }
    create(dto) {
        const id = `INQ${String(this.memoryData.length + 1).padStart(3, '0')}`;
        const newInquiry = {
            id,
            ...dto,
            status: 'New',
            createdAt: new Date().toISOString(),
        };
        this.memoryData.unshift(newInquiry);
        return newInquiry;
    }
    updateStatus(id, status) {
        const inquiry = this.findById(id);
        if (!inquiry)
            return null;
        inquiry.status = status;
        return inquiry;
    }
};
exports.InquiriesRepository = InquiriesRepository;
exports.InquiriesRepository = InquiriesRepository = __decorate([
    (0, common_1.Injectable)()
], InquiriesRepository);
//# sourceMappingURL=inquiries.repository.js.map