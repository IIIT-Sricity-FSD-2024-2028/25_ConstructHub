import { Injectable } from '@nestjs/common';

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
}

@Injectable()
export class CompaniesRepository {
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
        status: 'active',
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
        status: 'active',
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
    const id = record.id || `COMP${String(this.records.size + 1).padStart(3, '0')}`;
    const newRecord = {
      ...record,
      id,
      plan: record.plan || 'Basic',
      billingCycle: record.billingCycle || 'monthly',
      subscriptionStatus: record.subscriptionStatus || 'active',
      subscriptionStartedAt: record.subscriptionStartedAt || new Date().toISOString().split('T')[0],
      nextBillingDate: record.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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
