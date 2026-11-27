import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlans, selectPlansData } from '../features/platform/platformSlice';

// Used until the live plans arrive from the server (or if the server is unreachable).
const DEFAULT_PLANS = [
  { name: 'Basic', monthlyPrice: 4999, annualPrice: 49990, userLimit: 10, projectLimit: 3 },
  { name: 'Pro', monthlyPrice: 9999, annualPrice: 99990, userLimit: 50, projectLimit: 15 },
  { name: 'Enterprise', monthlyPrice: 19999, annualPrice: 199990, userLimit: 500, projectLimit: 100 }
];
const DEFAULT_OVERAGE = { extraUserMonthly: 499, extraProjectMonthly: 1999 };

export const prepaidRates = (r) => ({
  extraUserMonthly: Math.floor(Number(r.extraUserMonthly) * 0.4),
  extraProjectMonthly: Math.floor(Number(r.extraProjectMonthly) * 0.4)
});

export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Live subscription plans (editable by the platform admin).
 * Returns lookup objects keyed by plan name: plans, planPrices, planLimits (users), projLimits.
 */
export function usePlans() {
  const dispatch = useAppDispatch();
  const stored = useAppSelector(selectPlansData);
  const data = stored && Array.isArray(stored.plans) ? stored : null;

  // Read once per session; after the platform admin edits a plan the store is refreshed (see PlanEditor).
  const loaded = Boolean(stored);
  useEffect(() => {
    if (!loaded) dispatch(fetchPlans());
  }, [dispatch, loaded]);

  const list = data?.plans || DEFAULT_PLANS;
  const rates = data?.overageRates || DEFAULT_OVERAGE;
  const plans = Object.fromEntries(list.map((p) => [p.name, p]));
  return {
    plans,
    overageRates: rates,
    // Pre-purchased extra capacity is sold at 40% of the standard overage rate ("saves 60%"), so it follows the live rate.
    prepaidRates: prepaidRates(rates),
    planPrices: Object.fromEntries(list.map((p) => [p.name, p.monthlyPrice])),
    planLimits: Object.fromEntries(list.map((p) => [p.name, p.userLimit])),
    projLimits: Object.fromEntries(list.map((p) => [p.name, p.projectLimit]))
  };
}
