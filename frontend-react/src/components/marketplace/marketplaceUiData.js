import { formatINR } from '../../hooks/usePlans';

export const PROJECT_TYPES = ['Residential', 'Commercial', 'Renovation', 'Interior', 'Other'];

export function budgetRange(r) {
  return `${formatINR(r.budgetMin)} – ${formatINR(r.budgetMax)}`;
}
