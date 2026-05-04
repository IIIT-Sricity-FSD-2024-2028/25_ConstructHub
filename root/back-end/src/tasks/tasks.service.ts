import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class TasksService {
  constructor(private readonly repo: TasksRepository) {}

  findAll() { return this.repo.findAll(); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Tasks record not found.');
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
    
    const merged = { ...existing, ...data };
    this.validateBusinessRules(merged);

    return this.repo.update(id, data);
  }

  private validateBusinessRules(data: any) {
    if (data.startDate && data.deadline) {
      const start = new Date(data.startDate);
      const deadline = new Date(data.deadline);
      if (start > deadline) {
        throw new BadRequestException('Deadline cannot be before start date.');
      }
    }
  }

  remove(id: string) {
    this.findOne(id);
    return this.repo.remove(id);
  }
}


