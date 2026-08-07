import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagesRepository } from './messages.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class MessagesService {
  constructor(private readonly repo: MessagesRepository) {}

  findAll() { return this.repo.findAll(); }

  findOne(id: string) {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException('Messages record not found.');
    return record;
  }

  create(data: any) {
    if (!data || Object.keys(data).length === 0) throw new BadRequestException('Payload cannot be empty.');
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


