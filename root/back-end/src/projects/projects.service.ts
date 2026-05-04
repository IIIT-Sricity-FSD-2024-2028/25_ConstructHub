import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  findAll() { return this.repo.findAll(); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Projects record not found.');
    return record;
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    this.validateBusinessRules(data);
    const record = { ...data, id: data.id || randomUUID() };
    return this.repo.create(record);
  }

  update(id: string, data: any) {
    const existing = this.findOne(id);
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
    
    // Validate the resulting state after applying updates
    const merged = { ...existing, ...data };
    this.validateBusinessRules(merged);

    return this.repo.update(id, data);
  }

  private validateBusinessRules(data: any) {
    if (data.budget !== undefined && data.spent !== undefined && data.spent > data.budget) {
      throw new BadRequestException('Spent amount cannot exceed total budget.');
    }
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start > end) {
        throw new BadRequestException('End date cannot be before start date.');
      }
    }
  }

  remove(id: string) {
    this.findOne(id);
    return this.repo.remove(id);
  }
}


