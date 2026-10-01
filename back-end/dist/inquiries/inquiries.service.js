"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InquiriesService = void 0;
const common_1 = require("@nestjs/common");
const inquiries_repository_1 = require("./inquiries.repository");
const notifications_repository_1 = require("../notifications/notifications.repository");
let InquiriesService = class InquiriesService {
    repo;
    notifRepo;
    constructor(repo, notifRepo) {
        this.repo = repo;
        this.notifRepo = notifRepo;
    }
    findAll() {
        return this.repo.findAll();
    }
    create(dto) {
        const inquiry = this.repo.create(dto);
        this.notifRepo.create({
            userId: 'U000',
            companyId: '',
            type: 'system',
            title: 'New Contact Inquiry',
            body: `Contact inquiry received from ${dto.name} (${dto.email}, ${dto.phone}).`,
            time: 'Just now',
            read: false,
        });
        return inquiry;
    }
    updateStatus(id, status) {
        const updated = this.repo.updateStatus(id, status);
        if (!updated) {
            throw new common_1.NotFoundException(`Inquiry with ID "${id}" not found.`);
        }
        return updated;
    }
};
exports.InquiriesService = InquiriesService;
exports.InquiriesService = InquiriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [inquiries_repository_1.InquiriesRepository,
        notifications_repository_1.NotificationsRepository])
], InquiriesService);
//# sourceMappingURL=inquiries.service.js.map