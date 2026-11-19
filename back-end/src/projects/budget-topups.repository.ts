import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export type TopupStatus = 'pending' | 'approved' | 'rejected';

export interface BudgetTopupRecord {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  amount: number;
  reason: string;
  status: TopupStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionNote?: string;
  budgetBefore?: number; // project site budget just before the approval
  budgetAfter?: number;
}

@Injectable()
export class BudgetTopupsRepository {
  constructor() {
    attachStore<BudgetTopupRecord[]>('budget-topups', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: BudgetTopupRecord[] = [];

  findAll() { return this.data; }
  findById(id: string) { return this.data.find((t) => t.id === id); }
  findByCompanyId(companyId: string) { return this.data.filter((t) => t.companyId === companyId); }
  create(r: Omit<BudgetTopupRecord, 'id'>): BudgetTopupRecord {
    const created = { ...r, id: nextSequentialId('TUP', this.data) } as BudgetTopupRecord;
    this.data.push(created);
    return created;
  }
  update(id: string, patch: Partial<BudgetTopupRecord>) {
    const i = this.data.findIndex((t) => t.id === id);
    if (i === -1) return undefined;
    this.data[i] = { ...this.data[i], ...patch };
    return this.data[i];
  }
}
