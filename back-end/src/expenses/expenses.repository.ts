import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';
import { Injectable } from '@nestjs/common';

export type ExpenseStatus = 'submitted' | 'pm_verified' | 'approved' | 'rejected' | 'returned' | 'cancelled';

export interface ExpenseHistoryEntry {
  step: 'submitted' | 'resubmitted' | 'pm_verified' | 'approved' | 'rejected' | 'returned' | 'cancelled' | 'reimbursed' | 'recorded';
  by: string;
  byName: string;
  at: string; // ISO date-time
  note?: string;
}

export interface ExpenseRecord {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  milestoneId?: string;
  milestoneName?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  submittedBy: string;
  submittedByName: string;
  status: ExpenseStatus;
  receipts: Array<{ id: string; originalName: string; storedName: string; mimetype: string; size: number; uploadedAt: string }>;
  history: ExpenseHistoryEntry[];
  duplicateOf: string[]; // other expense ids that look like the same cost (same project, category, amount, date)
  reimbursement?: { paidAt: string; paidBy: string; paidByName: string; reference?: string };
  recordedBy?: string; // legacy field of expenses recorded before the approval workflow existed
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ExpensesRepository {
  constructor() {
    attachStore('expenses', this.memoryData, () => this.memoryData, (v) => { this.memoryData = v; });
  }

  /** Demo expenses that were recorded before the approval workflow: they are treated as approved. */
  private memoryData: any[] = [
    { id: 'E001', companyId: 'COMP001', projectId: 'P001', projectName: 'Apex Skyline Tower', category: 'Materials', amount: 450000, date: '2026-03-02', recordedBy: 'U004', description: '500 bags OPC Grade 53 cement.' },
    { id: 'E002', companyId: 'COMP001', projectId: 'P002', projectName: 'Apex Commercial Complex', category: 'Equipment', amount: 280000, date: '2026-03-01', recordedBy: 'U004', description: 'Tower crane monthly rental.' },
    { id: 'E003', companyId: 'COMP002', projectId: 'P003', projectName: 'L&T Infrastructure Project', category: 'Materials', amount: 1850000, date: '2026-03-01', recordedBy: 'U009', description: 'TMT steel rebar shipment for metro girders.' },
    { id: 'E004', companyId: 'COMP002', projectId: 'P004', projectName: 'L&T Metro Development', category: 'Labor', amount: 350000, date: '2026-03-02', recordedBy: 'U009', description: 'Site labor payout for excavation.' },
  ];

  findAll(): ExpenseRecord[] { return this.memoryData; }
  findByCompanyId(companyId: string): ExpenseRecord[] { return this.memoryData.filter((e) => e.companyId === companyId); }
  findById(id: string): ExpenseRecord | undefined { return this.memoryData.find((e) => e.id === id); }
  findByProjectId(projectId: string): ExpenseRecord[] { return this.memoryData.filter((e) => e.projectId === projectId); }

  create(record: Omit<ExpenseRecord, 'id'>): ExpenseRecord {
    const created = { ...record, id: nextSequentialId('E', this.memoryData) } as ExpenseRecord;
    this.memoryData.push(created);
    return created;
  }
  update(id: string, patch: Partial<ExpenseRecord>): ExpenseRecord | undefined {
    const i = this.memoryData.findIndex((e) => e.id === id);
    if (i === -1) return undefined;
    this.memoryData[i] = { ...this.memoryData[i], ...patch };
    return this.memoryData[i];
  }
}
