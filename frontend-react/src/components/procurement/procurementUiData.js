export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const qtyText = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-gray' };
