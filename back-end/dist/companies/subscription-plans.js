"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_PLANS = exports.OVERAGE_RATES = void 0;
exports.OVERAGE_RATES = {
    extraUserMonthly: 499,
    extraProjectMonthly: 1999,
};
exports.SUBSCRIPTION_PLANS = {
    Basic: {
        name: 'Basic',
        monthlyPrice: 4999,
        annualPrice: 49990,
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
//# sourceMappingURL=subscription-plans.js.map