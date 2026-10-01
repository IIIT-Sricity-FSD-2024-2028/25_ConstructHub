import { CompaniesRepository, CompanyRecord } from './companies.repository';
import { RegisterCompanyDto } from './register-company.dto';
import { UsersRepository } from '../users/users.repository';
export declare class CompaniesService {
    private readonly repo;
    private readonly usersRepo;
    constructor(repo: CompaniesRepository, usersRepo: UsersRepository);
    private validateOwnerEmailDomain;
    findAll(): CompanyRecord[];
    findOne(id: string): CompanyRecord;
    create(data: any): CompanyRecord;
    registerCompany(dto: RegisterCompanyDto): {
        message: string;
        company: {
            id: string | undefined;
            name: string;
            code: string;
            domain: string;
            plan: string | undefined;
            billingCycle: string | undefined;
            subscriptionStatus: string | undefined;
            overageEnabled: boolean | undefined;
            status: string | undefined;
        };
        admin: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    };
    getPlatformRevenue(): {
        totalCompanies: number;
        activeCompanies: number;
        baseMrr: number;
        overageMrr: number;
        mrr: number;
        arr: number;
        averageRevenuePerCompany: number;
        byPlan: Record<string, {
            companies: number;
            mrr: number;
        }>;
        subscriptions: {
            companyId: string | undefined;
            companyName: string;
            code: string;
            domain: string;
            plan: string;
            billingCycle: string;
            monthlyEquivalent: number;
            overageEnabled: boolean;
            extraUsers: number;
            extraProjects: number;
            overageRevenue: number;
            totalMonthlyRevenue: number;
            subscriptionStatus: string;
            companyStatus: string;
            nextBillingDate: string;
        }[];
    };
    getCompanySubscription(id: string): {
        companyId: string | undefined;
        companyName: string;
        code: string;
        domain: string;
        plan: string;
        planConfig: {
            userLimit: number;
            projectLimit: number;
            name: string;
            monthlyPrice: number;
            annualPrice: number;
            description: string;
        };
        billingCycle: string;
        subscriptionStatus: string;
        overageEnabled: boolean;
        extraUsers: number;
        extraProjects: number;
        userOverageFee: number;
        projectOverageFee: number;
        overageRates: {
            extraUserMonthly: number;
            extraProjectMonthly: number;
        };
        baseMonthlyPrice: number;
        overageRevenue: number;
        totalMonthlyFee: number;
        subscriptionStartedAt: string;
        nextBillingDate: string;
    };
    toggleOverage(id: string, overageEnabled: boolean, usagePatch?: any): CompanyRecord;
    update(id: string, data: any): CompanyRecord;
    remove(id: string): boolean;
}
