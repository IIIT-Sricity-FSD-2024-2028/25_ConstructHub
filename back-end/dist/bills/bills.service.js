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
exports.BillsService = void 0;
const common_1 = require("@nestjs/common");
const bills_repository_1 = require("./bills.repository");
const projects_repository_1 = require("../projects/projects.repository");
const crypto_1 = require("crypto");
let BillsService = class BillsService {
    repo;
    projectsRepo;
    constructor(repo, projectsRepo) {
        this.repo = repo;
        this.projectsRepo = projectsRepo;
    }
    findAll() { return this.repo.findAll(); }
    findByCompanyId(companyId) { return this.repo.findByCompanyId(companyId); }
    findOne(id) {
        const record = this.repo.findById(id);
        if (!record)
            throw new common_1.NotFoundException('Bills record not found.');
        return record;
    }
    create(data) {
        if (!data || Object.keys(data).length === 0)
            throw new common_1.BadRequestException('Payload cannot be empty.');
        if (data.projectId) {
            const project = this.projectsRepo.findById(data.projectId);
            if (project) {
                const billedSoFar = this.repo.findAll()
                    .filter(b => b.projectId === data.projectId && b.status !== 'Rejected')
                    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                const remaining = (Number(project.budget) || 0) - billedSoFar;
                if (Number(data.amount) > remaining) {
                    throw new common_1.BadRequestException(`Bill amount exceeds remaining project budget. Remaining: ${remaining}`);
                }
            }
        }
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
exports.BillsService = BillsService;
exports.BillsService = BillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bills_repository_1.BillsRepository,
        projects_repository_1.ProjectsRepository])
], BillsService);
//# sourceMappingURL=bills.service.js.map