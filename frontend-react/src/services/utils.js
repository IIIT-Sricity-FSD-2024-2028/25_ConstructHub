// ConstructHub - Frontend Utilities

export function formatCurrency(n) {
  if (n === undefined || n === null || isNaN(n)) return '₹0';
  const num = Number(n);
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + 'L';
  return '₹' + num.toLocaleString('en-IN');
}

export function formatDate(dateStr) {
  if (!dateStr) return 'Not Specified';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
}

export function statusBadgeClass(status) {
  const map = {
    'On Track': 'badge-green',
    'At Risk': 'badge-orange',
    'Delayed': 'badge-red',
    'Completed': 'badge-green',
    'In Progress': 'badge-blue',
    'Pending': 'badge-gray',
    'Accepted': 'badge-green',
    'Declined': 'badge-red',
    'Pending Decision': 'badge-orange',
    'Approved': 'badge-green',
    'Rejected': 'badge-red',
    'Pending': 'badge-gray',
    'Pending Approval': 'badge-orange',
    'Scheduled': 'badge-gray',
    'Under Review': 'badge-orange',
    'active': 'badge-green',
    'inactive': 'badge-red'
  };
  return map[status] || 'badge-gray';
}

export function normalizeBillStatus(status) {
  if (!status) return 'Pending Decision';
  const s = String(status).trim().toLowerCase();
  if (s === 'approved' || s === 'accepted' || s === 'paid') return 'Accepted';
  if (s === 'rejected' || s === 'declined') return 'Declined';
  return 'Pending Decision';
}

export function priorityBadgeClass(priority) {
  const map = {
    High: 'badge-red',
    Medium: 'badge-orange',
    Low: 'badge-green'
  };
  return map[priority] || 'badge-gray';
}

export function roleLabel(role) {
  const map = {
    superuser: 'Platform Super Admin',
    company_admin: 'Company Admin',
    project_manager: 'Project Manager',
    site_engineer: 'Site Engineer',
    finance_manager: 'Finance Manager',
    client: 'Client'
  };
  return map[role] || role;
}

export function roleBadgeClass(role) {
  const map = {
    superuser: 'badge-orange',
    company_admin: 'badge-orange',
    project_manager: 'badge-blue',
    site_engineer: 'badge-green',
    finance_manager: 'badge-orange',
    client: 'badge-gray'
  };
  return map[role] || 'badge-gray';
}

export function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim());
}

export function isValidDomain(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(value.trim());
}

export function isValidPhone(value) {
  if (!value || typeof value !== 'string') return false;
  const digits = value.trim().replace(/[^0-9]/g, '');
  if (digits.length !== 10) return false;
  if (/^0{10}$/.test(digits)) return false;
  return true;
}

export function avatarColor(initials = 'CH') {
  const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
  const code = (initials || 'CH').charCodeAt(0) || 0;
  return colors[code % colors.length];
}

export function generateId(prefix = 'ID') {
  return prefix + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

export function sanitizeName(value) {
  if (!value) return '';
  return value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ');
}

export function sanitizePhone(value) {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidName(value) {
  if (!value) return false;
  return /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(value.trim());
}

export const statusBadge = statusBadgeClass;
export const priorityBadge = priorityBadgeClass;

