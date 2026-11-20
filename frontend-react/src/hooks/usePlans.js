import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Used until the live plans arrive from the server (or if the server is unreachable).
const DEFAULT_PLANS = [
  { name: 'Basic', monthlyPrice: 4999, annualPrice: 49990, userLimit: 10, projectLimit: 3 },
  { name: 'Pro', monthlyPrice: 9999, annualPrice: 99990, userLimit: 50, projectLimit: 15 },
  { name: 'Enterprise', monthlyPrice: 19999, annualPrice: 199990, userLimit: 500, projectLimit: 100 }
];
const DEFAULT_OVERAGE = { extraUserMonthly: 499, extraProjectMonthly: 1999 };

export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Live subscription plans (editable by the platform admin).
 * Returns lookup objects keyed by plan name: plans, planPrices, planLimits (users), projLimits.
 */
export function usePlans() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getPlans().then((d) => {
      if (alive && d && Array.isArray(d.plans)) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  const list = data?.plans || DEFAULT_PLANS;
  const plans = Object.fromEntries(list.map((p) => [p.name, p]));
  return {
    plans,
    overageRates: data?.overageRates || DEFAULT_OVERAGE,
    planPrices: Object.fromEntries(list.map((p) => [p.name, p.monthlyPrice])),
    planLimits: Object.fromEntries(list.map((p) => [p.name, p.userLimit])),
    projLimits: Object.fromEntries(list.map((p) => [p.name, p.projectLimit]))
  };
}
