import {
  LayoutDashboard,
  ShieldAlert,
  Building2,
  TrendingUp,
  Mail,
  Users,
  Folder,
  Settings,
  CheckSquare,
  FileText,
  MessageSquare,
  Edit3,
  PieChart,
  Wallet,
  Receipt,
  CheckCircle2,
  Activity,
  CreditCard,
  Send,
  Store,
  ClipboardList,
  Flag,
  Package,
  ShoppingCart,
  Truck,
  PackageCheck,
  Calculator,
} from 'lucide-react';

export const navigationConfig = {
  superuser: [
    { label: 'Platform Super Admin', path: '/superuser/dashboard', icon: ShieldAlert, isExact: true },
    { isDivider: true },
    { label: 'Manage Companies', path: '/superuser/dashboard?tab=companies', icon: Building2, matchQuery: 'tab=companies' },
    { label: 'Platform Revenue & SaaS', path: '/superuser/dashboard?tab=revenue', icon: TrendingUp, matchQuery: 'tab=revenue' },
    { label: 'Contact Inquiries', path: '/superuser/dashboard?tab=inquiries', icon: Mail, matchQuery: 'tab=inquiries' },
    { label: 'All Global Users', path: '/superuser/dashboard?tab=all-users', icon: Users, matchQuery: 'tab=all-users' },
    { label: 'All Global Projects', path: '/superuser/dashboard?tab=all-projects', icon: Folder, matchQuery: 'tab=all-projects' },
    { isDivider: true },
    { label: 'Settings', path: '/superuser/settings', icon: Settings },
  ],

  company_admin: [
    { label: 'Company Admin', path: '/company-admin/dashboard', icon: Building2, isExact: true },
    { isDivider: true },
    { label: 'Team Members', path: '/company-admin/dashboard?tab=users', icon: Users, matchQuery: 'tab=users' },
    { label: 'Projects', path: '/company-admin/dashboard?tab=projects', icon: Folder, matchQuery: 'tab=projects' },
    { label: 'Tasks', path: '/company-admin/dashboard?tab=tasks', icon: CheckSquare, matchQuery: 'tab=tasks' },
    { label: 'Bills & Invoices', path: '/company-admin/dashboard?tab=bills', icon: Receipt, matchQuery: 'tab=bills' },
    { label: 'Site Reports', path: '/company-admin/dashboard?tab=reports', icon: FileText, matchQuery: 'tab=reports' },
    { label: 'Expenses', path: '/company-admin/dashboard?tab=expenses', icon: Wallet, matchQuery: 'tab=expenses' },
    { label: 'Marketplace', path: '/company-admin/marketplace', icon: Store, matchPrefix: '/company-admin/marketplace' },
    { label: 'Budget Top-ups', path: '/company-admin/budget-topups', icon: Wallet },
    { label: 'Subscription & Billing', path: '/company-admin/subscription', icon: CreditCard },
    { isDivider: true },
    { label: 'Settings', path: '/company-admin/settings', icon: Settings },
  ],

  project_manager: [
    { label: 'Dashboard', path: '/project-manager/dashboard', icon: LayoutDashboard },
    { label: 'Bid Estimates', path: '/project-manager/bid-estimates', icon: Calculator },
    { label: 'Projects', path: '/project-manager/projects', icon: Folder, matchPrefix: '/project-manager/projects' },
    { label: 'Milestones', path: '/project-manager/milestones', icon: Flag },
    { label: 'Material Requests', path: '/project-manager/material-requests', icon: Package },
    { label: 'Expenses', path: '/project-manager/expenses', icon: Wallet },
    { label: 'Tasks', path: '/project-manager/tasks', icon: CheckSquare, matchPrefix: '/project-manager/tasks' },
    { label: 'View Site Reports', path: '/project-manager/reports', icon: FileText, matchPrefix: '/project-manager/reports' },
    { label: 'Messages', path: '/project-manager/messages', icon: MessageSquare },
    { isDivider: true },
    { label: 'Settings', path: '/project-manager/settings', icon: Settings },
  ],

  site_engineer: [
    { label: 'Dashboard', path: '/site-engineer/dashboard', icon: LayoutDashboard },
    { label: 'My Tasks', path: '/site-engineer/my-tasks', icon: CheckSquare },
    { label: 'Update Task Status', path: '/site-engineer/update-task', icon: Edit3 },
    { label: 'Material Requests', path: '/site-engineer/material-requests', icon: Package },
    { label: 'Expenses', path: '/site-engineer/expenses', icon: Wallet },
    { label: 'Submit Site Report', path: '/site-engineer/submit-report', icon: FileText },
    { label: 'Messages', path: '/site-engineer/messages', icon: MessageSquare },
    { isDivider: true },
    { label: 'Settings', path: '/site-engineer/settings', icon: Settings },
  ],

  finance_manager: [
    { label: 'Dashboard', path: '/finance-manager/dashboard', icon: LayoutDashboard },
    { label: 'Bid Estimates', path: '/finance-manager/bid-estimates', icon: Calculator },
    { label: 'Project Budget', path: '/finance-manager/budget', icon: PieChart },
    { label: 'Purchase Orders', path: '/finance-manager/purchase-orders', icon: ShoppingCart },
    { label: 'Expenses', path: '/finance-manager/expenses', icon: Wallet },
    { label: 'Generate Bills', path: '/finance-manager/generate-bills', icon: Receipt },
    { label: 'Bill Decisions', path: '/finance-manager/bill-decisions', icon: CheckCircle2 },
    { label: 'Messages', path: '/finance-manager/messages', icon: MessageSquare },
    { isDivider: true },
    { label: 'Settings', path: '/finance-manager/settings', icon: Settings },
  ],

  procurement_storekeeper: [
    { label: 'Dashboard', path: '/procurement-storekeeper/dashboard', icon: LayoutDashboard },
    { label: 'Approved Requests', path: '/procurement-storekeeper/requests', icon: ClipboardList },
    { label: 'Purchase Orders', path: '/procurement-storekeeper/orders', icon: ShoppingCart },
    { label: 'Site Stock', path: '/procurement-storekeeper/stock', icon: PackageCheck },
    { label: 'Suppliers', path: '/procurement-storekeeper/suppliers', icon: Truck },
    { label: 'Messages', path: '/procurement-storekeeper/messages', icon: MessageSquare },
    { isDivider: true },
    { label: 'Settings', path: '/procurement-storekeeper/settings', icon: Settings },
  ],

  client: [
    // requiresProject: hidden until the client has awarded at least one quotation (see filterClientNav)
    { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard, requiresProject: true },
    { label: 'My Requirements', path: '/client/requirements', icon: ClipboardList, matchPrefix: '/client/requirements' },
    { label: 'Received Quotations', path: '/client/quotations', icon: FileText, matchPrefix: '/client/quotations' },
    { label: 'My Active Projects', path: '/client/projects', icon: Folder, matchPrefix: '/client/projects', requiresProject: true },
    { label: 'Project Details', path: '/client/project-progress', icon: Activity, requiresProject: true },
    { label: 'Reports', path: '/client/reports', icon: FileText, requiresProject: true },
    { label: 'Pending Bills', path: '/client/pending-bills', icon: Receipt, requiresProject: true },
    { label: 'Payment Decisions', path: '/client/payment-decisions', icon: CreditCard, requiresProject: true },
    { label: 'Feedback', path: '/client/feedback', icon: MessageSquare, requiresProject: true },
    { label: 'Messages', path: '/client/messages', icon: Send, requiresProject: true },
    { isDivider: true },
    { label: 'Settings', path: '/client/settings', icon: Settings },
  ],
};

/**
 * Two-stage client portal: with no project yet the client sees only My Requirements, Received Quotations and Settings.
 * Dividers that end up next to each other are dropped.
 */
export function filterClientNav(items, projectCount) {
  if (projectCount > 0) return items;
  const kept = items.filter((i) => !i.requiresProject);
  return kept.filter((i, idx) => !(i.isDivider && (idx === 0 || kept[idx - 1].isDivider)));
}
