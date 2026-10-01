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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const tasks_repository_1 = require("./tasks.repository");
const crypto_1 = require("crypto");
let TasksService = class TasksService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll() { return this.repo.findAll(); }
    findByCompanyId(companyId) { return this.repo.findByCompanyId(companyId); }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Tasks record not found.');
        return record;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        this.validateBusinessRules(data);
        const record = { ...data, id: data.id || (0, crypto_1.randomUUID)() };
        return this.repo.create(record);
    }
    update(id, data) {
        const existing = this.findOne(id);
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        const merged = { ...existing, ...data };
        this.validateBusinessRules(merged);
        return this.repo.update(id, data);
    }
    validateBusinessRules(data) {
        if (data.startDate && data.deadline) {
            const start = new Date(data.startDate);
            const deadline = new Date(data.deadline);
            if (start > deadline) {
                throw new common_1.BadRequestException('Deadline cannot be before start date.');
            }
        }
    }
    remove(id) {
        this.findOne(id);
        return this.repo.remove(id);
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_repository_1.TasksRepository])
], TasksService);
//# sourceMappingURL=tasks.service.js.map