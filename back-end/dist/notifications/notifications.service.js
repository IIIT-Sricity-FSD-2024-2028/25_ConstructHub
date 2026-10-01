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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const notifications_repository_1 = require("./notifications.repository");
const crypto_1 = require("crypto");
let NotificationsService = class NotificationsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll() { return this.repo.findAll(); }
    findByCompanyId(companyId) { return this.repo.findByCompanyId(companyId); }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Notifications record not found.');
        return record;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        const record = { ...data, id: data.id || (0, crypto_1.randomUUID)() };
        return this.repo.create(record);
    }
    update(id, data) {
        this.findOne(id);
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        return this.repo.update(id, data);
    }
    remove(id) {
        this.findOne(id);
        return this.repo.remove(id);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_repository_1.NotificationsRepository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map