import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { nextSequentialId } from '../utils/ids';

export interface PaymentRecord {
  id: string;
  companyId: string;
  billId: string;
  projectId: string;
  clientId: string;
  amount: number;
  method: string; // "Online payment (demo)" for client demo payments; bank transfer / cheque / cash / UPI when finance records it
  reference: string;
  paidAt: string; // YYYY-MM-DD
  channel: 'client_demo' | 'finance';
  recordedBy: string;
  recordedByName: string;
  note?: string;
  createdAt: string;
}

@Injectable()
export class PaymentsRepository {
  constructor() {
    attachStore<PaymentRecord[]>('payments', this.data, () => this.data, (v) => { this.data = v; });
  }
  private data: PaymentRecord[] = [
    { id: 'PAY001', companyId: 'COMP001', billId: 'B002', projectId: 'P002', clientId: 'U011', amount: 3000000, method: 'Online payment (demo)', reference: 'DEMO-SEED001', paidAt: '2026-03-10', channel: 'client_demo', recordedBy: 'U011', recordedByName: 'Suresh Shah', createdAt: '2026-03-10' },
    { id: 'PAY002', companyId: 'COMP002', billId: 'B003', projectId: 'P003', clientId: 'U010', amount: 12500000, method: 'Bank transfer', reference: 'NEFT-778812', paidAt: '2026-03-12', channel: 'finance', recordedBy: 'U009', recordedByName: 'Kavita Rao', note: 'Received in full', createdAt: '2026-03-12' },
    { id: 'PAY003', companyId: 'COMP001', billId: 'B005', projectId: 'P001', clientId: 'U005', amount: 3125000, method: 'Online payment (demo)', reference: 'DEMO-SEED003', paidAt: '2026-01-05', channel: 'client_demo', recordedBy: 'U005', recordedByName: 'Vikram Patel', createdAt: '2026-01-05' },
  ];
  findAll() { return this.data; }
  findByCompanyId(c: string) { return this.data.filter((p) => p.companyId === c); }
  findByBillId(billId: string) { return this.data.filter((p) => p.billId === billId); }
  create(r: Omit<PaymentRecord, 'id'>): PaymentRecord {
    const created = { ...r, id: nextSequentialId('PAY', this.data) } as PaymentRecord;
    this.data.push(created);
    return created;
  }
}
