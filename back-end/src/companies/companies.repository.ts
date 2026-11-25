import { Injectable } from '@nestjs/common';
import { attachStore } from '../utils/json-store';
import { today } from '../utils/ids';

export interface CompanyRecord {
  id?: string;
  name: string;
  code: string;
  domain: string;
  ownerEmail: string;
  phone?: string;
  plan?: string;
  billingCycle?: 'monthly' | 'annual' | string;
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | string;
  subscriptionStartedAt?: string;
  nextBillingDate?: string;
  overageEnabled?: boolean;
  extraUsers?: number;
  extraProjects?: number;
  customUserLimit?: number;
  customProjectLimit?: number;
  status?: string;
  createdAt?: string;
  /** Platform onboarding review. Missing value on legacy records is treated as 'approved'. */
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

@Injectable()
export class CompaniesRepository {
  constructor() {
    attachStore<CompanyRecord[]>(
      'companies',
      Array.from(this.records.values()),
      () => Array.from(this.records.values()),
      (list) => {
        this.records = new Map(list.map((c) => [c.id as string, c]));
      },
    );
  }

  private records: Map<string, CompanyRecord> = new Map([
    [
      'COMP001',
      {
        id: 'COMP001',
        name: 'Apex Builders',
        code: 'apex',
        domain: 'apex.com',
        ownerEmail: 'admin@apex.com',
        phone: '+91 98000 11111',
        plan: 'Enterprise',
        billingCycle: 'monthly',
        subscriptionStatus: 'active',
        subscriptionStartedAt: '2026-01-01',
        nextBillingDate: '2026-04-01',
        overageEnabled: false,
        extraUsers: 0,
        extraProjects: 0,
        customUserLimit: 500,
        customProjectLimit: 100,
        status: 'active',
        approvalStatus: 'approved',
        createdAt: '2026-01-01',
      },
    ],
    [
      'COMP002',
      {
        id: 'COMP002',
        name: 'L&T Infrastructure',
        code: 'ltinfra',
        domain: 'ltinfra.com',
        ownerEmail: 'admin@ltinfra.com',
        phone: '+91 98000 22222',
        plan: 'Pro',
        billingCycle: 'annual',
        subscriptionStatus: 'active',
        subscriptionStartedAt: '2026-01-15',
        nextBillingDate: '2027-01-15',
        overageEnabled: true,
        extraUsers: 0,
        extraProjects: 0,
        customUserLimit: 50,
        customProjectLimit: 15,
        status: 'active',
        approvalStatus: 'approved',
        createdAt: '2026-01-15',
      },
    ],
  ]);

  findAll(): CompanyRecord[] {
    return Array.from(this.records.values());
  }

  findById(id: string): CompanyRecord | undefined {
    return this.records.get(id);
  }

  findByCode(code: string): CompanyRecord | undefined {
    return Array.from(this.records.values()).find(
      (c) => c.code.toLowerCase() === code.toLowerCase(),
    );
  }

  findByDomain(domain: string): CompanyRecord | undefined {
    return Array.from(this.records.values()).find(
      (c) => c.domain.toLowerCase() === domain.toLowerCase(),
    );
  }

  findByOwnerEmail(ownerEmail: string): CompanyRecord | undefined {
    return Array.from(this.records.values()).find(
      (c) => c.ownerEmail && c.ownerEmail.toLowerCase() === ownerEmail.toLowerCase(),
    );
  }

  create(record: CompanyRecord): CompanyRecord {
    const maxNum = Array.from(this.records.keys()).reduce((m, k) => {
      const n = parseInt(k.replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const id = record.id || `COMP${String(maxNum + 1).padStart(3, '0')}`;
    const newRecord = {
      ...record,
      id,
      plan: record.plan || 'Basic',
      billingCycle: record.billingCycle || 'monthly',
      subscriptionStatus: record.subscriptionStatus || 'active',
      subscriptionStartedAt: record.subscriptionStartedAt || today(),
      nextBillingDate: record.nextBillingDate || today(new Date(Date.now() + 30 * 86400000)),
      overageEnabled: record.overageEnabled !== undefined ? record.overageEnabled : false,
      extraUsers: record.extraUsers || 0,
      extraProjects: record.extraProjects || 0,
    };
    this.records.set(id, newRecord);
    return newRecord;
  }

  update(id: string, partial: Partial<CompanyRecord>): CompanyRecord | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial };
    this.records.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.records.delete(id);
  }
}
