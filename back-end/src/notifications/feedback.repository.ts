import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export const FEEDBACK_CATEGORIES = ['Quality of Work', 'Timeline', 'Communication', 'Budget', 'Safety', 'General'];

export interface FeedbackRecord {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  category: string;
  subject: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

/** Feedback is kept in its own store: clearing notifications can never delete a client's submitted feedback. */
@Injectable()
export class FeedbackRepository {
  constructor() {
    attachStore<FeedbackRecord[]>('feedback', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: FeedbackRecord[] = [];

  findAll() { return this.data; }
  create(r: Omit<FeedbackRecord, 'id'>): FeedbackRecord {
    const created = { ...r, id: nextSequentialId('FB', this.data) } as FeedbackRecord;
    this.data.push(created);
    return created;
  }
}
