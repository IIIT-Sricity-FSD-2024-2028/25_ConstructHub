export interface SubscriptionPlanConfig {
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    userLimit: number;
    projectLimit: number;
    description: string;
}
export declare const OVERAGE_RATES: {
    extraUserMonthly: number;
    extraProjectMonthly: number;
};
export declare const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig>;
