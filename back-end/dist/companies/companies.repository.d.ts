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
export declare class CompaniesRepository {
    private records;
    findAll(): CompanyRecord[];
    findById(id: string): CompanyRecord | undefined;
    findByCode(code: string): CompanyRecord | undefined;
    findByDomain(domain: string): CompanyRecord | undefined;
    findByOwnerEmail(ownerEmail: string): CompanyRecord | undefined;
    create(record: CompanyRecord): CompanyRecord;
    update(id: string, partial: Partial<CompanyRecord>): CompanyRecord | undefined;
    remove(id: string): boolean;
}
