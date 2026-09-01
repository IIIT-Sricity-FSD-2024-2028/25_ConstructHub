import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BillsRepository } from './bills.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class BillsService {
  constructor(
    private readonly repo: BillsRepository,
    private readonly projectsRepo: ProjectsRepository,
  ) {}

  findAll() { return this.repo.findAll(); }

  findByCompanyId(companyId: string) { return this.repo.findByCompanyId(companyId); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Bills record not found.');
    return record;
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');

    if (data.projectId) {
      const project = this.projectsRepo.findById(data.projectId);
      if (project) {
        const billedSoFar = this.repo.findAll()
          .filter(b => b.projectId === data.projectId && b.status !== 'Rejected')
          .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const remaining = (Number(project.budget) || 0) - billedSoFar;
        if (Number(data.amount) > remaining) {
          throw new BadRequestException(
            `Bill amount exceeds remaining project budget. Remaining: ${remaining}`
          );
        }
      }
    }

    const record = { ...data, id: data.id || randomUUID() };
    return this.repo.create(record);
  }

  update(id: string, data: any) {
    this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    return this.repo.update(id, data);
  }

  remove(id: string) {
    this.findOne(id);
    return this.repo.remove(id);
  }
}


