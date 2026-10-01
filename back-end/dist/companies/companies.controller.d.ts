import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './create-company.dto';
import { RegisterCompanyDto } from './register-company.dto';
import { UserContext } from '../auth/current-user.decorator';
export declare class CompaniesController {
    private readonly companiesService;
    constructor(companiesService: CompaniesService);
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
    getCompanySubscription(id: string, user?: UserContext): {
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
    findAll(user?: UserContext): import("./companies.repository").CompanyRecord[];
    findOne(id: string, user?: UserContext): import("./companies.repository").CompanyRecord;
    create(dto: CreateCompanyDto): import("./companies.repository").CompanyRecord;
    toggleOverage(id: string, body: any, user?: UserContext): import("./companies.repository").CompanyRecord;
    update(id: string, body: any, user?: UserContext): import("./companies.repository").CompanyRecord;
    remove(id: string): void;
}
