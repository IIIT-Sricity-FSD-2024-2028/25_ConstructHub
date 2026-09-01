export interface SubscriptionPlanConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  userLimit: number;
  projectLimit: number;
  description: string;
}

export const OVERAGE_RATES = {
  extraUserMonthly: 499,
  extraProjectMonthly: 1999,
};

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  Basic: {
    name: 'Basic',
    monthlyPrice: 4999,
    annualPrice: 49990, // ~2 months discount
    userLimit: 10,
    projectLimit: 3,
    description: 'Essential construction management for small firms',
  },
  Pro: {
    name: 'Pro',
    monthlyPrice: 9999,
    annualPrice: 99990,
    userLimit: 50,
    projectLimit: 15,
    description: 'Advanced site coordination & bill tracking for growing firms',
  },
  Enterprise: {
    name: 'Enterprise',
    monthlyPrice: 19999,
    annualPrice: 199990,
    userLimit: 500,
    projectLimit: 100,
    description: 'Unlimited multi-site oversight & custom security controls',
  },
};

