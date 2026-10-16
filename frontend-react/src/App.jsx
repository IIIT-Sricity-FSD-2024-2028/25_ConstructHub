import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Public / Auth
import LandingHome from './auth/LandingHome';
import Login from './auth/Login';
import RegisterCompany from './auth/RegisterCompany';
import Contact from './auth/Contact';

// Superuser
import SuperuserLayout from './actors/superuser/SuperuserLayout';
import SuperuserDashboard from './actors/superuser/pages/SuperuserDashboard';
import SuperuserSettings from './actors/superuser/pages/SuperuserSettings';

// Company Admin
import CompanyAdminLayout from './actors/company-admin/CompanyAdminLayout';
import CompanyAdminDashboard from './actors/company-admin/pages/CompanyAdminDashboard';
import CompanyAdminSubscription from './actors/company-admin/pages/CompanyAdminSubscription';
import CompanyAdminSettings from './actors/company-admin/pages/CompanyAdminSettings';

// Finance Manager
import FinanceManagerLayout from './actors/finance-manager/FinanceManagerLayout';
import FinanceManagerDashboard from './actors/finance-manager/pages/FinanceManagerDashboard';
import FinanceManagerBudget from './actors/finance-manager/pages/FinanceManagerBudget';
import FinanceManagerExpenses from './actors/finance-manager/pages/FinanceManagerExpenses';
import FinanceManagerGenerateBills from './actors/finance-manager/pages/FinanceManagerGenerateBills';
import FinanceManagerBillDecisions from './actors/finance-manager/pages/FinanceManagerBillDecisions';
import FinanceManagerBillDetail from './actors/finance-manager/pages/FinanceManagerBillDetail';
import FinanceManagerMessages from './actors/finance-manager/pages/FinanceManagerMessages';
import FinanceManagerSettings from './actors/finance-manager/pages/FinanceManagerSettings';

// Project Manager
import ProjectManagerLayout from './actors/project-manager/ProjectManagerLayout';
import ProjectManagerDashboard from './actors/project-manager/pages/ProjectManagerDashboard';
import ProjectManagerProjects from './actors/project-manager/pages/ProjectManagerProjects';
import ProjectManagerProjectDetail from './actors/project-manager/pages/ProjectManagerProjectDetail';
import ProjectManagerTasks from './actors/project-manager/pages/ProjectManagerTasks';
import ProjectManagerTaskDetail from './actors/project-manager/pages/ProjectManagerTaskDetail';
import ProjectManagerReports from './actors/project-manager/pages/ProjectManagerReports';
import ProjectManagerReportDetail from './actors/project-manager/pages/ProjectManagerReportDetail';
import ProjectManagerMessages from './actors/project-manager/pages/ProjectManagerMessages';
import ProjectManagerSettings from './actors/project-manager/pages/ProjectManagerSettings';

// Site Engineer
import SiteEngineerLayout from './actors/site-engineer/SiteEngineerLayout';
import SiteEngineerDashboard from './actors/site-engineer/pages/SiteEngineerDashboard';
import SiteEngineerMyTasks from './actors/site-engineer/pages/SiteEngineerMyTasks';
import SiteEngineerTaskDetail from './actors/site-engineer/pages/SiteEngineerTaskDetail';
import SiteEngineerUpdateTask from './actors/site-engineer/pages/SiteEngineerUpdateTask';
import SiteEngineerSubmitReport from './actors/site-engineer/pages/SiteEngineerSubmitReport';
import SiteEngineerMessages from './actors/site-engineer/pages/SiteEngineerMessages';
import SiteEngineerSettings from './actors/site-engineer/pages/SiteEngineerSettings';

// Client
import ClientLayout from './actors/client/ClientLayout';
import ClientDashboard from './actors/client/pages/ClientDashboard';
import ClientProjectProgress from './actors/client/pages/ClientProjectProgress';
import ClientReports from './actors/client/pages/ClientReports';
import ClientReportDetail from './actors/client/pages/ClientReportDetail';
import ClientPendingBills from './actors/client/pages/ClientPendingBills';
import ClientBillDetail from './actors/client/pages/ClientBillDetail';
import ClientPaymentDecisions from './actors/client/pages/ClientPaymentDecisions';
import ClientFeedback from './actors/client/pages/ClientFeedback';
import ClientMessages from './actors/client/pages/ClientMessages';
import ClientSettings from './actors/client/pages/ClientSettings';

// Helper component to preserve query strings on legacy redirect
function QueryPreservingRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingHome />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login.html" element={<Navigate to="/login" replace />} />
            <Route path="/register-company" element={<Navigate to="/contact?request=firm" replace />} />
            <Route path="/register-company.html" element={<Navigate to="/contact?request=firm" replace />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contact.html" element={<Navigate to="/contact" replace />} />

            {/* Superuser Routes */}
            <Route element={<ProtectedRoute allowedRoles={['superuser']} />}>
              <Route path="/superuser" element={<SuperuserLayout />}>
                <Route index element={<SuperuserDashboard />} />
                <Route path="dashboard" element={<SuperuserDashboard />} />
                <Route path="settings" element={<SuperuserSettings />} />
              </Route>
            </Route>

            {/* Company Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['company_admin']} />}>
              <Route path="/company-admin" element={<CompanyAdminLayout />}>
                <Route index element={<CompanyAdminDashboard />} />
                <Route path="dashboard" element={<CompanyAdminDashboard />} />
                <Route path="subscription" element={<CompanyAdminSubscription />} />
                <Route path="settings" element={<CompanyAdminSettings />} />
              </Route>
            </Route>

            {/* Finance Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['finance_manager']} />}>
              <Route path="/finance-manager" element={<FinanceManagerLayout />}>
                <Route index element={<FinanceManagerDashboard />} />
                <Route path="dashboard" element={<FinanceManagerDashboard />} />
                <Route path="budget" element={<FinanceManagerBudget />} />
                <Route path="project-budget" element={<FinanceManagerBudget />} />
                <Route path="expenses" element={<FinanceManagerExpenses />} />
                <Route path="generate-bills" element={<FinanceManagerGenerateBills />} />
                <Route path="bill-decisions" element={<FinanceManagerBillDecisions />} />
                <Route path="bill-detail" element={<FinanceManagerBillDetail />} />
                <Route path="bills/:id" element={<FinanceManagerBillDetail />} />
                <Route path="messages" element={<FinanceManagerMessages />} />
                <Route path="settings" element={<FinanceManagerSettings />} />
              </Route>
            </Route>

            {/* Project Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['project_manager']} />}>
              <Route path="/project-manager" element={<ProjectManagerLayout />}>
                <Route index element={<ProjectManagerDashboard />} />
                <Route path="dashboard" element={<ProjectManagerDashboard />} />
                <Route path="projects" element={<ProjectManagerProjects />} />
                <Route path="project-detail" element={<ProjectManagerProjectDetail />} />
                <Route path="projects/:id" element={<ProjectManagerProjectDetail />} />
                <Route path="tasks" element={<ProjectManagerTasks />} />
                <Route path="task-detail" element={<ProjectManagerTaskDetail />} />
                <Route path="tasks/:id" element={<ProjectManagerTaskDetail />} />
                <Route path="reports" element={<ProjectManagerReports />} />
                <Route path="report-detail" element={<ProjectManagerReportDetail />} />
                <Route path="reports/:id" element={<ProjectManagerReportDetail />} />
                <Route path="messages" element={<ProjectManagerMessages />} />
                <Route path="settings" element={<ProjectManagerSettings />} />
              </Route>
            </Route>

            {/* Site Engineer Routes */}
            <Route element={<ProtectedRoute allowedRoles={['site_engineer']} />}>
              <Route path="/site-engineer" element={<SiteEngineerLayout />}>
                <Route index element={<SiteEngineerDashboard />} />
                <Route path="dashboard" element={<SiteEngineerDashboard />} />
                <Route path="my-tasks" element={<SiteEngineerMyTasks />} />
                <Route path="tasks/:id" element={<SiteEngineerTaskDetail />} />
                <Route path="task-detail" element={<SiteEngineerTaskDetail />} />
                <Route path="task-detail-pm" element={<SiteEngineerTaskDetail />} />
                <Route path="update-task" element={<SiteEngineerUpdateTask />} />
                <Route path="submit-report" element={<SiteEngineerSubmitReport />} />
                <Route path="messages" element={<SiteEngineerMessages />} />
                <Route path="settings" element={<SiteEngineerSettings />} />
              </Route>
            </Route>

            {/* Client Routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientLayout />}>
                <Route index element={<ClientDashboard />} />
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="project-progress" element={<ClientProjectProgress />} />
                <Route path="reports" element={<ClientReports />} />
                <Route path="report-detail" element={<ClientReportDetail />} />
                <Route path="reports/:id" element={<ClientReportDetail />} />
                <Route path="pending-bills" element={<ClientPendingBills />} />
                <Route path="bill-detail" element={<ClientBillDetail />} />
                <Route path="bills/:id" element={<ClientBillDetail />} />
                <Route path="payment-decisions" element={<ClientPaymentDecisions />} />
                <Route path="feedback" element={<ClientFeedback />} />
                <Route path="messages" element={<ClientMessages />} />
                <Route path="profile" element={<ClientSettings />} />
                <Route path="settings" element={<ClientSettings />} />
              </Route>
            </Route>

            {/* Legacy /pages/* compatibility redirects */}
            <Route path="/pages/contact.html" element={<QueryPreservingRedirect to="/contact" />} />
            
            {/* Legacy Client pages */}
            <Route path="/pages/client/dashboard.html" element={<QueryPreservingRedirect to="/client/dashboard" />} />
            <Route path="/pages/client/project-progress.html" element={<QueryPreservingRedirect to="/client/project-progress" />} />
            <Route path="/pages/client/pending-bills.html" element={<QueryPreservingRedirect to="/client/pending-bills" />} />
            <Route path="/pages/client/bill-detail.html" element={<QueryPreservingRedirect to="/client/bill-detail" />} />
            <Route path="/pages/client/payment-decisions.html" element={<QueryPreservingRedirect to="/client/payment-decisions" />} />
            <Route path="/pages/client/reports.html" element={<QueryPreservingRedirect to="/client/reports" />} />
            <Route path="/pages/client/report-detail.html" element={<QueryPreservingRedirect to="/client/report-detail" />} />
            <Route path="/pages/client/feedback.html" element={<QueryPreservingRedirect to="/client/feedback" />} />
            <Route path="/pages/client/messages.html" element={<QueryPreservingRedirect to="/client/messages" />} />
            <Route path="/pages/client/profile.html" element={<QueryPreservingRedirect to="/client/settings" />} />
            <Route path="/pages/client/settings.html" element={<QueryPreservingRedirect to="/client/settings" />} />

            {/* Legacy Company Admin pages */}
            <Route path="/pages/company-admin/dashboard.html" element={<QueryPreservingRedirect to="/company-admin/dashboard" />} />
            <Route path="/pages/company-admin/subscription.html" element={<QueryPreservingRedirect to="/company-admin/subscription" />} />
            <Route path="/pages/company-admin/settings.html" element={<QueryPreservingRedirect to="/company-admin/settings" />} />

            {/* Legacy Finance Manager pages */}
            <Route path="/pages/finance-manager/dashboard.html" element={<QueryPreservingRedirect to="/finance-manager/dashboard" />} />
            <Route path="/pages/finance-manager/project-budget.html" element={<QueryPreservingRedirect to="/finance-manager/budget" />} />
            <Route path="/pages/finance-manager/expenses.html" element={<QueryPreservingRedirect to="/finance-manager/expenses" />} />
            <Route path="/pages/finance-manager/generate-bills.html" element={<QueryPreservingRedirect to="/finance-manager/generate-bills" />} />
            <Route path="/pages/finance-manager/bill-decisions.html" element={<QueryPreservingRedirect to="/finance-manager/bill-decisions" />} />
            <Route path="/pages/finance-manager/bill-detail.html" element={<QueryPreservingRedirect to="/finance-manager/bill-detail" />} />
            <Route path="/pages/finance-manager/messages.html" element={<QueryPreservingRedirect to="/finance-manager/messages" />} />
            <Route path="/pages/finance-manager/settings.html" element={<QueryPreservingRedirect to="/finance-manager/settings" />} />

            {/* Legacy Project Manager pages */}
            <Route path="/pages/project-manager/dashboard.html" element={<QueryPreservingRedirect to="/project-manager/dashboard" />} />
            <Route path="/pages/project-manager/projects.html" element={<QueryPreservingRedirect to="/project-manager/projects" />} />
            <Route path="/pages/project-manager/project-detail.html" element={<QueryPreservingRedirect to="/project-manager/project-detail" />} />
            <Route path="/pages/project-manager/tasks.html" element={<QueryPreservingRedirect to="/project-manager/tasks" />} />
            <Route path="/pages/project-manager/task-detail.html" element={<QueryPreservingRedirect to="/project-manager/task-detail" />} />
            <Route path="/pages/project-manager/reports.html" element={<QueryPreservingRedirect to="/project-manager/reports" />} />
            <Route path="/pages/project-manager/report-detail.html" element={<QueryPreservingRedirect to="/project-manager/report-detail" />} />
            <Route path="/pages/project-manager/messages.html" element={<QueryPreservingRedirect to="/project-manager/messages" />} />
            <Route path="/pages/project-manager/settings.html" element={<QueryPreservingRedirect to="/project-manager/settings" />} />

            {/* Legacy Site Engineer pages */}
            <Route path="/pages/site-engineer/dashboard.html" element={<QueryPreservingRedirect to="/site-engineer/dashboard" />} />
            <Route path="/pages/site-engineer/my-tasks.html" element={<QueryPreservingRedirect to="/site-engineer/my-tasks" />} />
            <Route path="/pages/site-engineer/task-detail.html" element={<QueryPreservingRedirect to="/site-engineer/task-detail" />} />
            <Route path="/pages/site-engineer/task-detail-pm.html" element={<QueryPreservingRedirect to="/site-engineer/task-detail-pm" />} />
            <Route path="/pages/site-engineer/update-task.html" element={<QueryPreservingRedirect to="/site-engineer/update-task" />} />
            <Route path="/pages/site-engineer/submit-report.html" element={<QueryPreservingRedirect to="/site-engineer/submit-report" />} />
            <Route path="/pages/site-engineer/messages.html" element={<QueryPreservingRedirect to="/site-engineer/messages" />} />
            <Route path="/pages/site-engineer/settings.html" element={<QueryPreservingRedirect to="/site-engineer/settings" />} />

            {/* Legacy Superuser pages */}
            <Route path="/pages/superuser/dashboard.html" element={<QueryPreservingRedirect to="/superuser/dashboard" />} />
            <Route path="/pages/superuser/settings.html" element={<QueryPreservingRedirect to="/superuser/settings" />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}