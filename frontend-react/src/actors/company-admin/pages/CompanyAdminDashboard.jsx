import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  Folder,
  CheckSquare,
  Receipt,
  FileText,
  Wallet,
  UserPlus,
  FolderPlus,
  Edit2,
  Trash2,
  Power,
  Search,
  Plus,
  Eye,
  Camera,
  Calendar,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  roleLabel,
  roleBadgeClass,
  statusBadgeClass,
  normalizeBillStatus,
  isValidEmail,
  isValidPhone,
  avatarColor
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';

export default function CompanyAdminDashboard() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';

  const [company, setCompany] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bills, setBills] = useState([]);
  const [reports, setReports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [setupWarning, setSetupWarning] = useState('');

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'project_manager',
    phone: '',
    password: '123456',
    status: 'active'
  });
  const [userFormErrors, setUserFormErrors] = useState({});

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    id: '',
    name: '',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    description: '',
    status: 'On Track',
    // Linked client fields (each new project creates a new unique client)
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientPassword: 'password123'
  });
  const [projectFormErrors, setProjectFormErrors] = useState({});

  // Expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Materials',
    amount: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Report detail modal
  const [selectedReport, setSelectedReport] = useState(null);

  // View Details Modals
  const [viewUserModal, setViewUserModal] = useState(null);
  const [viewProjectModal, setViewProjectModal] = useState(null);
  const [viewTaskModal, setViewTaskModal] = useState(null);
  const [viewBillModal, setViewBillModal] = useState(null);
  const [viewExpenseModal, setViewExpenseModal] = useState(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    loadCompanyData();
  }, [user]);

  async function loadCompanyData() {
    if (!user) return;
    const compId = user.companyId;

    const [comp, uList, pList, tList, bList, rList, eList] = await Promise.all([
      api.getCompanyById(compId),
      api.getUsers(compId),
      api.getProjects(compId),
      api.getTasks(compId),
      api.getBills(compId),
      api.getReports(compId),
      api.getExpenses(compId)
    ]);

    setCompany(comp);
    setTeamUsers(uList || []);
    setProjects(pList || []);
    setTasks(tList || []);
    setBills(bList || []);
    setReports(rList || []);
    setExpenses(eList || []);
  }

  // Core team onboarding check
  const hasPM = teamUsers.some((u) => u.role === 'project_manager');
  const hasFM = teamUsers.some((u) => u.role === 'finance_manager');
  const hasSE = teamUsers.some((u) => u.role === 'site_engineer');
  const isCoreTeamComplete = hasPM && hasFM && hasSE;

  const coreRolesStatus = [
    {
      role: 'project_manager',
      title: 'Project Manager',
      description: 'Oversees site execution, project planning, and task management',
      isComplete: hasPM
    },
    {
      role: 'finance_manager',
      title: 'Finance Manager',
      description: 'Manages bill verification, payments, budget, and project expenses',
      isComplete: hasFM
    },
    {
      role: 'site_engineer',
      title: 'Site Engineer',
      description: 'Submits daily logs, tracks on-ground progress, and reports issues',
      isComplete: hasSE
    }
  ];

  // Enforce redirection to users tab if initial core team setup is incomplete
  useEffect(() => {
    if (teamUsers.length > 0 && !isCoreTeamComplete && currentTab !== 'users') {
      setSearchParams({ tab: 'users' });
    }
  }, [isCoreTeamComplete, currentTab, teamUsers.length]);

  function handleTabChange(tabKey) {
    if (!isCoreTeamComplete && tabKey !== 'users') {
      const missingTitles = coreRolesStatus.filter((r) => !r.isComplete).map((r) => r.title).join(', ');
      setSetupWarning(
        `Action locked: You must create at least one Project Manager, one Finance Manager, and one Site Engineer before accessing ${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}. Missing: ${missingTitles}.`
      );
      return;
    }
    setSetupWarning('');
    setSearchParams({ tab: tabKey });
  }

  // --- User Handlers ---
  function openAddUserModal(preferredRole) {
    setIsEditingUser(false);
    let defaultRole = 'project_manager';
    if (typeof preferredRole === 'string' && preferredRole) {
      defaultRole = preferredRole;
    } else if (!hasPM) {
      defaultRole = 'project_manager';
    } else if (!hasFM) {
      defaultRole = 'finance_manager';
    } else if (!hasSE) {
      defaultRole = 'site_engineer';
    }

    setUserForm({
      id: '',
      name: '',
      email: '',
      role: defaultRole,
      phone: '',
      password: '123456',
      status: 'active'
    });
    setUserFormErrors({});
    setUserModalOpen(true);
  }

  function openEditUserModal(u) {
    setIsEditingUser(true);
    setUserForm({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: (u.phone || '').replace(/[^0-9]/g, '').slice(-10),
      password: u.password || '123456',
      status: u.status || 'active'
    });
    setUserFormErrors({});
    setUserModalOpen(true);
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    const errors = {};

    if (!userForm.name.trim()) errors.name = 'Full Name is required';
    if (!userForm.email.trim()) errors.email = 'Email Address is required';
    else if (!isValidEmail(userForm.email.trim())) errors.email = 'Enter a valid email address';
    else if (company?.domain) {
      const emailDomain = userForm.email.split('@')[1] || '';
      if (emailDomain.toLowerCase() !== company.domain.toLowerCase()) {
        errors.email = `Email domain (@${emailDomain}) must match company domain (@${company.domain})`;
      }
    }

    if (!userForm.role) errors.role = 'Please select a role';
    if (userForm.phone && !isValidPhone(userForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    if (!isEditingUser && (!userForm.password || userForm.password.trim().length < 6)) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Quota check
    if (!isEditingUser && company) {
      const defaultUserLimits = { Basic: 10, Pro: 50, Enterprise: 500 };
      const userLimit = company.customUserLimit || defaultUserLimits[company.plan] || 10;
      if (teamUsers.length >= userLimit && !company.overageEnabled) {
        errors.email = `User quota reached (${teamUsers.length}/${userLimit}) for your plan. Upgrade or enable overage.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setUserFormErrors(errors);
      return;
    }

    const cleanPhone = (userForm.phone || '').replace(/\D/g, '').slice(-10);

    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim().toLowerCase(),
      companyId: user.companyId,
      avatar: userForm.name.substring(0, 2).toUpperCase(),
      status: userForm.status || 'active',
      password: userForm.password || '123456'
    };

    if (!isEditingUser) {
      payload.role = userForm.role;
    }

    if (cleanPhone && cleanPhone.length === 10) {
      payload.phone = cleanPhone;
    }

    const res = isEditingUser
      ? await api.updateUser(userForm.id, payload)
      : await api.createUser(payload);

    if (res && res.error) {
      setUserFormErrors({ email: res.message || 'Failed to save team member' });
      return;
    }

    setUserModalOpen(false);
    loadCompanyData();
  }

  async function handleToggleUserStatus(u) {
    if (u.id === user.id) {
      alert('You cannot lock your own account.');
      return;
    }
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    await api.updateUser(u.id, { status: nextStatus });
    loadCompanyData();
  }

  async function handleDeleteUser(id) {
    if (id === user.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this team member?')) {
      await api.deleteUser(id);
      loadCompanyData();
    }
  }

  function openAddProjectModal() {
    if (!isCoreTeamComplete) {
      const missingTitles = coreRolesStatus.filter((r) => !r.isComplete).map((r) => r.title).join(', ');
      setSetupWarning(
        `Company setup incomplete: You must create at least one Project Manager, one Finance Manager, and one Site Engineer before creating projects. Missing: ${missingTitles}.`
      );
      return;
    }
    setIsEditingProject(false);
    const existingPMs = teamUsers.filter((u) => u.role === 'project_manager');
    const existingFMs = teamUsers.filter((u) => u.role === 'finance_manager');
    setProjectForm({
      id: '',
      name: '',
      location: '',
      budget: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      description: '',
      status: 'On Track',
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientPassword: '123456',
      selectedManagerId: existingPMs[0]?.id || '',
      selectedFinanceManagerId: existingFMs[0]?.id || ''
    });
    setProjectFormErrors({});
    setProjectModalOpen(true);
  }

  function openEditProjectModal(p) {
    setIsEditingProject(true);
    const existingPMs = teamUsers.filter((u) => u.role === 'project_manager');
    const existingFMs = teamUsers.filter((u) => u.role === 'finance_manager');
    setProjectForm({
      id: p.id,
      name: p.name,
      location: p.location || '',
      budget: p.budget || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      description: p.description || '',
      status: p.status || 'On Track',
      clientId: p.clientId || '',
      clientName: p.clientName || '',
      clientEmail: p.clientEmail || '',
      clientPhone: p.clientPhone || '',
      clientPassword: '123456',
      selectedManagerId: p.managerId || existingPMs[0]?.id || '',
      selectedFinanceManagerId: p.financeManagerId || existingFMs[0]?.id || ''
    });
    setProjectFormErrors({});
    setProjectModalOpen(true);
  }

  async function handleSaveProject(e) {
    e.preventDefault();
    const errors = {};

    if (!projectForm.name.trim()) errors.name = 'Project Name is required';
    if (!projectForm.location.trim()) errors.location = 'Project Location is required';
    if (!projectForm.budget || Number(projectForm.budget) <= 0) errors.budget = 'Valid budget amount is required';
    if (!projectForm.startDate) errors.startDate = 'Start date is required';
    if (!projectForm.endDate) errors.endDate = 'End date is required';
    else if (new Date(projectForm.endDate) < new Date(projectForm.startDate)) {
      errors.endDate = 'End date cannot be earlier than start date';
    }

    // Quota check
    if (!isEditingProject && company) {
      const defaultProjLimits = { Basic: 3, Pro: 15, Enterprise: 100 };
      const projLimit = company.customProjectLimit || defaultProjLimits[company.plan] || 3;
      if (projects.length >= projLimit && !company.overageEnabled) {
        errors.name = `Project quota reached (${projects.length}/${projLimit}). Upgrade plan or enable overage.`;
      }
    }

    let clientId = '';
    let clientName = '';
    let clientEmail = '';
    let clientPhone = '';

    if (!isEditingProject) {
      // New client required for each project (1 client = 1 project)
      if (!projectForm.clientName.trim()) {
        errors.clientName = 'Client Name is required';
      }
      if (!projectForm.clientEmail.trim()) {
        errors.clientEmail = 'Client Email is required';
      } else if (!isValidEmail(projectForm.clientEmail.trim())) {
        errors.clientEmail = 'Enter a valid email address';
      } else {
        const emailLower = projectForm.clientEmail.trim().toLowerCase();
        const existingProjWithClient = projects.find(
          (p) => (p.clientEmail || '').toLowerCase() === emailLower
        );
        if (existingProjWithClient) {
          errors.clientEmail = `This client is already assigned to project "${existingProjWithClient.name}". A client can only have one project.`;
        } else {
          const existingUserWithEmail = teamUsers.find(
            (u) => (u.email || '').toLowerCase() === emailLower
          );
          if (existingUserWithEmail) {
            errors.clientEmail = 'A user with this email already exists. Each project requires a dedicated new client.';
          }
        }
      }

      if (projectForm.clientPhone && !isValidPhone(projectForm.clientPhone)) {
        errors.clientPhone = 'Phone number must be exactly 10 digits';
      }
      if (!projectForm.clientPassword || projectForm.clientPassword.length < 6) {
        errors.clientPassword = 'Password must be at least 6 characters';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProjectFormErrors(errors);
      return;
    }

    if (!isEditingProject) {
      const cleanPhone = (projectForm.clientPhone || '').replace(/\D/g, '').slice(-10);
      const clientPayload = {
        name: projectForm.clientName.trim(),
        email: projectForm.clientEmail.trim().toLowerCase(),
        role: 'client',
        companyId: user.companyId,
        avatar: projectForm.clientName.substring(0, 2).toUpperCase(),
        status: 'active',
        password: projectForm.clientPassword || '123456'
      };
      if (cleanPhone && cleanPhone.length === 10) {
        clientPayload.phone = cleanPhone;
      }

      const clientRes = await api.createUser(clientPayload);
      if (clientRes && clientRes.error) {
        setProjectFormErrors({
          clientEmail: Array.isArray(clientRes.message)
            ? clientRes.message.join(', ')
            : (clientRes.message || 'Failed to create client user')
        });
        return;
      }

      clientId = clientRes.id;
      clientName = clientRes.name;
      clientEmail = clientRes.email;
      clientPhone = clientRes.phone || '';
    } else {
      clientId = projectForm.clientId;
      clientName = projectForm.clientName;
      clientEmail = projectForm.clientEmail;
      clientPhone = projectForm.clientPhone;
    }

    const assignedPM =
      teamUsers.find((u) => u.id === projectForm.selectedManagerId && u.role === 'project_manager') ||
      teamUsers.find((u) => u.role === 'project_manager');
    const managerId = assignedPM?.id || 'U002';
    const managerName = assignedPM?.name || 'Rajesh Kumar';

    const assignedFM =
      teamUsers.find((u) => u.id === projectForm.selectedFinanceManagerId && u.role === 'finance_manager') ||
      teamUsers.find((u) => u.role === 'finance_manager');
    const financeManagerId = assignedFM?.id || '';
    const financeManagerName = assignedFM?.name || '';

    const b = Number(projectForm.budget);
    const payload = {
      name: projectForm.name.trim(),
      companyId: user.companyId,
      location: projectForm.location.trim(),
      budget: b,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      description: projectForm.description.trim() || `Project ${projectForm.name.trim()} workspace`,
      status: projectForm.status || 'On Track',
      managerId,
      managerName,
      ...(financeManagerId ? { financeManagerId, financeManagerName } : {}),
      progress: isEditingProject ? undefined : 0,
      spent: isEditingProject ? undefined : 0,
      teamSize: 1,
      allocations: isEditingProject
        ? (projects.find(p => p.id === projectForm.id)?.allocations || { Materials: 0, Labor: 0, Equipment: 0, Other: b })
        : {
            Materials: 0,
            Labor: 0,
            Equipment: 0,
            Other: b
          },
      ...(clientId ? { clientId, clientName, clientEmail, clientPhone } : {})
    };

    if (isEditingProject) {
      const updateRes = await api.updateProject(projectForm.id, payload);
      if (updateRes && updateRes.error) {
        setProjectFormErrors({
          name: Array.isArray(updateRes.message) ? updateRes.message.join(', ') : (updateRes.message || 'Failed to update project')
        });
        return;
      }
    } else {
      const createdProj = await api.createProject(payload);
      if (createdProj && createdProj.error) {
        setProjectFormErrors({
          name: Array.isArray(createdProj.message) ? createdProj.message.join(', ') : (createdProj.message || 'Failed to create project')
        });
        return;
      }
      if (clientId) {
        await api.createNotification({
          userId: clientId,
          type: 'system',
          title: 'Project Created',
          body: `Your project "${createdProj.name}" has been successfully set up.`
        });
      }
    }

    setProjectModalOpen(false);
    loadCompanyData();
  }

  async function handleDeleteProject(id) {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const proj = projects.find((p) => p.id === id);
      await api.deleteProject(id);
      if (proj && proj.clientId) {
        await api.deleteUser(proj.clientId).catch(() => {});
      }
      loadCompanyData();
    }
  }

  // --- Bill status update ---
  async function handleUpdateBillStatus(billId, status) {
    await api.updateBill(billId, {
      status,
      decisionDate: new Date().toISOString().split('T')[0]
    });
    loadCompanyData();
  }

  // --- Expense submit ---
  async function handleSaveExpense(e) {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.projectId) return;

    await api.createExpense({
      companyId: user.companyId,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      projectId: expenseForm.projectId,
      date: expenseForm.date,
      description: expenseForm.description
    });

    setExpenseModalOpen(false);
    setExpenseForm({
      category: 'Materials',
      amount: '',
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    loadCompanyData();
  }

  const filteredTeamUsers = teamUsers.filter((u) => {
    const matchQ =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    return matchQ && matchRole;
  });

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div>
      {/* Banner */}
      <div className="ca-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="badge badge-orange" style={{ letterSpacing: '0.05em' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              COMPANY ADMIN
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, margin: '4px 0' }}>
            {company?.name || 'Company'} Workspace Admin Panel
          </h2>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Full workspace control for your construction firm
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}
          >
            APPROVED DOMAIN: @{company?.domain || 'company.com'}
          </span>
          <button
            type="button"
            onClick={openAddProjectModal}
            className="btn btn-secondary"
            style={{
              background: !isCoreTeamComplete ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              opacity: !isCoreTeamComplete ? 0.75 : 1,
              cursor: !isCoreTeamComplete ? 'not-allowed' : 'pointer'
            }}
            title={!isCoreTeamComplete ? 'Setup required: Add at least 1 PM, 1 FM, and 1 SE first' : 'Add Project'}
          >
            {!isCoreTeamComplete ? <Lock size={15} /> : <FolderPlus size={16} />} Add Project
          </button>
          <button
            type="button"
            onClick={() => openAddUserModal()}
            className="btn btn-primary"
          >
            <UserPlus size={16} /> Add Team Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-orange">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{teamUsers.length}</div>
          <div className="stat-label">Team Members</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-blue">
              <Folder size={20} />
            </div>
          </div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Active Projects</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-green">
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Assigned Tasks</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-purple">
              <Receipt size={20} />
            </div>
          </div>
          <div className="stat-value">{bills.length}</div>
          <div className="stat-label">Bills & Invoices</div>
        </div>
      </div>

      {/* Onboarding Checklist Banner (Enforce PM, FM, SE before anything) */}
      {!isCoreTeamComplete && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            border: '1px solid #f59e0b',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                  <AlertTriangle size={14} /> ACTION REQUIRED: INITIAL COMPANY SETUP
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>
                  ({[hasPM, hasFM, hasSE].filter(Boolean).length}/3 Roles Created)
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 6px 0', color: 'var(--text-primary)' }}>
                Required Core Team Setup
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
                Before your company can initiate projects, delegate site tasks, or process bills and expenses, the company admin must create at least one <strong>Project Manager</strong>, one <strong>Finance Manager</strong>, and one <strong>Site Engineer</strong>.
              </p>
            </div>
          </div>

          {setupWarning && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{setupWarning}</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginTop: '16px'
            }}
          >
            {coreRolesStatus.map((item) => (
              <div
                key={item.role}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: item.isComplete ? '1px solid #10b981' : '1px solid rgba(245, 158, 11, 0.4)',
                  background: item.isComplete ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card, #fff)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
                      {item.isComplete ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <Clock size={18} color="#f59e0b" />
                      )}
                      <span>{item.title}</span>
                    </div>
                    {item.isComplete ? (
                      <span className="badge badge-green" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Ready
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Required
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                </div>

                {!item.isComplete ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '6px', fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => openAddUserModal(item.role)}
                  >
                    <UserPlus size={14} /> Create {item.title}
                  </button>
                ) : (
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✓ Role fulfilled
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module Tabs */}
      <div className="module-tabs">
        <button
          type="button"
          className={`module-tab ${currentTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          <Users size={16} /> Team Users ({teamUsers.length})
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'projects' ? 'active' : ''}`}
          onClick={() => handleTabChange('projects')}
          style={!isCoreTeamComplete ? { opacity: 0.6 } : {}}
          title={!isCoreTeamComplete ? 'Locked: Complete core team setup first' : ''}
        >
          <Folder size={16} /> Projects ({projects.length}) {!isCoreTeamComplete && <Lock size={12} style={{ marginLeft: 4 }} />}
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'tasks' ? 'active' : ''}`}
          onClick={() => handleTabChange('tasks')}
          style={!isCoreTeamComplete ? { opacity: 0.6 } : {}}
          title={!isCoreTeamComplete ? 'Locked: Complete core team setup first' : ''}
        >
          <CheckSquare size={16} /> Tasks ({tasks.length}) {!isCoreTeamComplete && <Lock size={12} style={{ marginLeft: 4 }} />}
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'bills' ? 'active' : ''}`}
          onClick={() => handleTabChange('bills')}
          style={!isCoreTeamComplete ? { opacity: 0.6 } : {}}
          title={!isCoreTeamComplete ? 'Locked: Complete core team setup first' : ''}
        >
          <Receipt size={16} /> Bills ({bills.length}) {!isCoreTeamComplete && <Lock size={12} style={{ marginLeft: 4 }} />}
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'reports' ? 'active' : ''}`}
          onClick={() => handleTabChange('reports')}
          style={!isCoreTeamComplete ? { opacity: 0.6 } : {}}
          title={!isCoreTeamComplete ? 'Locked: Complete core team setup first' : ''}
        >
          <FileText size={16} /> Reports ({reports.length}) {!isCoreTeamComplete && <Lock size={12} style={{ marginLeft: 4 }} />}
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'expenses' ? 'active' : ''}`}
          onClick={() => handleTabChange('expenses')}
          style={!isCoreTeamComplete ? { opacity: 0.6 } : {}}
          title={!isCoreTeamComplete ? 'Locked: Complete core team setup first' : ''}
        >
          <Wallet size={16} /> Expenses ({expenses.length}) {!isCoreTeamComplete && <Lock size={12} style={{ marginLeft: 4 }} />}
        </button>
      </div>

      {/* TAB 1: Team Users */}
      {currentTab === 'users' && (
        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Search team member by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="project_manager">Project Manager</option>
              <option value="site_engineer">Site Engineer</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="client">Client</option>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openAddUserModal}
            >
              + Add Member
            </button>
          </div>

          <DataTable
            data={filteredTeamUsers}
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (u) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="avatar"
                      style={{
                        width: 32,
                        height: 32,
                        background: avatarColor(u.name),
                        fontSize: 12
                      }}
                    >
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{u.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.id}</div>
                    </div>
                  </div>
                )
              },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone', render: (u) => u.phone || '+91 98765 43210' },
              {
                key: 'role',
                label: 'Role',
                render: (u) => (
                  <span className={`badge ${roleBadgeClass(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                )
              },
              {
                key: 'status',
                label: 'Status',
                render: (u) => (
                  <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                    {u.status || 'active'}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (u) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewUserModal(u)}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditUserModal(u)}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    {u.id !== user.id && (
                      <>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleUserStatus(u)}
                          title={u.status === 'active' ? 'Lock Account' : 'Unlock Account'}
                        >
                          <Power size={13} /> {u.status === 'active' ? 'Lock' : 'Unlock'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 2: Projects */}
      {currentTab === 'projects' && (
        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Search projects by name or location..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openAddProjectModal}
            >
              + New Project
            </button>
          </div>

          <DataTable
            data={filteredProjects}
            columns={[
              {
                key: 'name',
                label: 'Project Name',
                render: (p) => (
                  <div>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.location}</div>
                  </div>
                )
              },
              {
                key: 'budget',
                label: 'Budget',
                render: (p) => formatCurrency(p.budget)
              },
              {
                key: 'spent',
                label: 'Spent',
                render: (p) => formatCurrency(p.spent || 0)
              },
              {
                key: 'progress',
                label: 'Progress',
                render: (p) => (
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: 11, marginBottom: 2 }}>{p.progress || 0}%</div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${p.progress || 0}%`, background: 'var(--primary)' }}
                      ></div>
                    </div>
                  </div>
                )
              },
              {
                key: 'status',
                label: 'Status',
                render: (p) => (
                  <span className={`badge ${statusBadgeClass(p.status)}`}>
                    {p.status}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (p) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewProjectModal(p)}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditProjectModal(p)}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteProject(p.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 3: Tasks */}
      {currentTab === 'tasks' && (
        <div className="card">
          <DataTable
            data={tasks}
            emptyMessage="No tasks found for your company."
            columns={[
              {
                key: 'title',
                label: 'Task Title',
                render: (t) => (
                  <div>
                    <strong>{t.title}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.projectName}</div>
                  </div>
                )
              },
              { key: 'assignedName', label: 'Site Engineer', render: (t) => t.assignedName || 'Unassigned' },
              {
                key: 'priority',
                label: 'Priority',
                render: (t) => (
                  <span className={`badge ${t.priority === 'High' ? 'badge-red' : t.priority === 'Medium' ? 'badge-orange' : 'badge-green'}`}>
                    {t.priority}
                  </span>
                )
              },
              {
                key: 'deadline',
                label: 'Deadline',
                render: (t) => formatDate(t.deadline)
              },
              {
                key: 'status',
                label: 'Status',
                render: (t) => (
                  <span className={`badge ${statusBadgeClass(t.status)}`}>
                    {t.status}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (t) => (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setViewTaskModal(t)}
                  >
                    <Eye size={13} /> View
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 4: Bills */}
      {currentTab === 'bills' && (
        <div className="card">
          <DataTable
            data={bills}
            emptyMessage="No invoices found."
            columns={[
              {
                key: 'id',
                label: 'Invoice #',
                render: (b) => (
                  <div>
                    <strong>{b.billNumber || b.id}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.projectName}</div>
                  </div>
                )
              },
              { key: 'clientName', label: 'Client' },
              {
                key: 'amount',
                label: 'Amount',
                render: (b) => <strong>{formatCurrency(b.amount)}</strong>
              },
              {
                key: 'dueDate',
                label: 'Due Date',
                render: (b) => formatDate(b.dueDate)
              },
              {
                key: 'status',
                label: 'Status',
                render: (b) => {
                  const norm = normalizeBillStatus(b.status);
                  return (
                    <span className={`badge ${statusBadgeClass(norm)}`}>
                      {norm}
                    </span>
                  );
                }
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (b) => (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setViewBillModal(b)}
                  >
                    <Eye size={13} /> View
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 5: Reports */}
      {currentTab === 'reports' && (
        <div className="card">
          <DataTable
            data={reports}
            emptyMessage="No site reports filed."
            columns={[
              {
                key: 'title',
                label: 'Report Title',
                render: (r) => (
                  <div>
                    <strong>{r.title}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div>
                  </div>
                )
              },
              { key: 'reporterName', label: 'Reporter' },
              { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <span className={`badge ${statusBadgeClass(r.status || 'Completed')}`}>
                    {r.status || 'Completed'}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedReport(r)}
                  >
                    <Eye size={13} /> View
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 6: Expenses */}
      {currentTab === 'expenses' && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Recorded Project Expenses</h3>
          </div>

          <DataTable
            data={expenses}
            emptyMessage="No expenses recorded."
            columns={[
              {
                key: 'category',
                label: 'Category',
                render: (e) => <span className="badge badge-orange">{e.category}</span>
              },
              {
                key: 'amount',
                label: 'Amount',
                render: (e) => <strong>{formatCurrency(e.amount)}</strong>
              },
              {
                key: 'projectName',
                label: 'Project',
                render: (e) => {
                  const p = projects.find((x) => x.id === e.projectId);
                  return p ? p.name : (e.projectName || e.projectId || 'General');
                }
              },
              { key: 'description', label: 'Description' },
              { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
              {
                key: 'actions',
                label: 'Actions',
                render: (e) => (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setViewExpenseModal(e)}
                  >
                    <Eye size={13} /> View
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      {/* MODAL: Add / Edit User */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={isEditingUser ? 'Edit Team Member' : 'Add Company Team Member'}
        subtitle="Manage credentials and role assignment within company domain"
      >
        <form onSubmit={handleSaveUser}>
          <div className="form-group">
            <label className="form-label">
              Full Name <span className="req">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${userFormErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Ramesh Patel"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            />
            {userFormErrors.name && <span className="field-error">{userFormErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address <span className="req">*</span>
            </label>
            <input
              type="email"
              className={`form-input ${userFormErrors.email ? 'input-error' : ''}`}
              placeholder={`name@${company?.domain || 'apex.com'}`}
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
            {userFormErrors.email && <span className="field-error">{userFormErrors.email}</span>}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Must match company domain: @{company?.domain || 'company.com'}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Role {isEditingUser ? <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)' }}>(Cannot be changed)</span> : <span className="req">*</span>}
              </label>
              {isEditingUser ? (
                <input
                  type="text"
                  className="form-input"
                  value={
                    userForm.role === 'project_manager'
                      ? 'Project Manager'
                      : userForm.role === 'finance_manager'
                      ? 'Finance Manager'
                      : userForm.role === 'site_engineer'
                      ? 'Site Engineer'
                      : userForm.role === 'company_admin'
                      ? 'Company Admin'
                      : userForm.role === 'client'
                      ? 'Client'
                      : userForm.role || ''
                  }
                  disabled
                  readOnly
                  style={{
                    backgroundColor: 'var(--bg-card-hover, rgba(0, 0, 0, 0.04))',
                    cursor: 'not-allowed',
                    opacity: 0.85,
                    color: 'var(--text-muted)'
                  }}
                  title="User role cannot be changed after creation."
                />
              ) : (
                <select
                  className="form-select"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="project_manager">Project Manager</option>
                  <option value="site_engineer">Site Engineer</option>
                  <option value="finance_manager">Finance Manager</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className={`form-input ${userFormErrors.phone ? 'input-error' : ''}`}
                placeholder="10-digit phone"
                value={userForm.phone}
                maxLength={10}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
              />
              {userFormErrors.phone && <span className="field-error">{userFormErrors.phone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Password {!isEditingUser && <span className="req">*</span>}
            </label>
            <input
              type="password"
              className={`form-input ${userFormErrors.password ? 'input-error' : ''}`}
              placeholder="e.g. 123456 (default)"
              value={userForm.password || ''}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            />
            {userFormErrors.password && <span className="field-error">{userFormErrors.password}</span>}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Default password: 123456
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUserModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditingUser ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add / Edit Project */}
      <Modal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={isEditingProject ? 'Edit Project' : 'Create New Project'}
        subtitle="Manage construction project parameters and allocation"
      >
        <form onSubmit={handleSaveProject}>
          <div className="form-group">
            <label className="form-label">
              Project Name <span className="req">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${projectFormErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Apex Tower"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            />
            {projectFormErrors.name && <span className="field-error">{projectFormErrors.name}</span>}
          </div>

          {!isEditingProject ? (
            <div
              style={{
                marginBottom: 16,
                padding: 14,
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)', marginBottom: 4 }}>
                Client Information (New Client) <span className="req">*</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                A client can only have one project. Enter the new client account details below.
              </p>

              <div style={{ display: 'grid', gap: 10 }}>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Name <span className="req">*</span></label>
                    <input
                      type="text"
                      className={`form-input ${projectFormErrors.clientName ? 'input-error' : ''}`}
                      placeholder="e.g. John Doe"
                      value={projectForm.clientName}
                      onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                    />
                    {projectFormErrors.clientName && (
                      <span className="field-error">{projectFormErrors.clientName}</span>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Email <span className="req">*</span></label>
                    <input
                      type="email"
                      className={`form-input ${projectFormErrors.clientEmail ? 'input-error' : ''}`}
                      placeholder={`client@${company?.domain || 'apex.com'}`}
                      value={projectForm.clientEmail}
                      onChange={(e) => setProjectForm({ ...projectForm, clientEmail: e.target.value })}
                    />
                    {projectFormErrors.clientEmail && (
                      <span className="field-error">{projectFormErrors.clientEmail}</span>
                    )}
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Phone</label>
                    <input
                      type="tel"
                      className={`form-input ${projectFormErrors.clientPhone ? 'input-error' : ''}`}
                      placeholder="10-digit phone"
                      value={projectForm.clientPhone}
                      maxLength={10}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          clientPhone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                        })
                      }
                    />
                    {projectFormErrors.clientPhone && (
                      <span className="field-error">{projectFormErrors.clientPhone}</span>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Password <span className="req">*</span></label>
                    <input
                      type="password"
                      className={`form-input ${projectFormErrors.clientPassword ? 'input-error' : ''}`}
                      placeholder="Min 6 characters"
                      value={projectForm.clientPassword}
                      onChange={(e) => setProjectForm({ ...projectForm, clientPassword: e.target.value })}
                    />
                    {projectFormErrors.clientPassword && (
                      <span className="field-error">{projectFormErrors.clientPassword}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            projectForm.clientName && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  marginBottom: 16
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned Client</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                  {projectForm.clientName} {projectForm.clientEmail ? `(${projectForm.clientEmail})` : ''}
                </div>
              </div>
            )
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Assigned Project Manager <span className="req">*</span>
              </label>
              <select
                className="form-select"
                value={projectForm.selectedManagerId}
                onChange={(e) => setProjectForm({ ...projectForm, selectedManagerId: e.target.value })}
              >
                {teamUsers.filter((u) => u.role === 'project_manager').length === 0 ? (
                  <option value="U002">Default Project Manager (Rajesh Kumar)</option>
                ) : (
                  teamUsers
                    .filter((u) => u.role === 'project_manager')
                    .map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} ({pm.email})
                      </option>
                    ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Assigned Finance Manager <span className="req">*</span>
              </label>
              <select
                className="form-select"
                value={projectForm.selectedFinanceManagerId}
                onChange={(e) => setProjectForm({ ...projectForm, selectedFinanceManagerId: e.target.value })}
              >
                {teamUsers.filter((u) => u.role === 'finance_manager').length === 0 ? (
                  <option value="">No Finance Manager available</option>
                ) : (
                  teamUsers
                    .filter((u) => u.role === 'finance_manager')
                    .map((fm) => (
                      <option key={fm.id} value={fm.id}>
                        {fm.name} ({fm.email})
                      </option>
                    ))
                )}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Location <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${projectFormErrors.location ? 'input-error' : ''}`}
                placeholder="e.g. Mumbai, Maharashtra"
                value={projectForm.location}
                onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
              />
              {projectFormErrors.location && <span className="field-error">{projectFormErrors.location}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Total Budget (₹) <span className="req">*</span>
              </label>
              <input
                type="number"
                className={`form-input ${projectFormErrors.budget ? 'input-error' : ''}`}
                placeholder="25000000"
                value={projectForm.budget}
                onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
              />
              {projectFormErrors.budget && <span className="field-error">{projectFormErrors.budget}</span>}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Start Date <span className="req">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={projectForm.startDate}
                onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                End Date <span className="req">*</span>
              </label>
              <input
                type="date"
                className={`form-input ${projectFormErrors.endDate ? 'input-error' : ''}`}
                value={projectForm.endDate}
                onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
              />
              {projectFormErrors.endDate && <span className="field-error">{projectFormErrors.endDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Project scope and details..."
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            ></textarea>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setProjectModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>


      {/* MODAL: View User Details */}
      <Modal
        isOpen={!!viewUserModal}
        onClose={() => setViewUserModal(null)}
        title="Team Member Details"
        subtitle={viewUserModal ? `${viewUserModal.name} (${roleLabel(viewUserModal.role)})` : ''}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewUserModal(null)}
          >
            Close
          </button>
        }
      >
        {viewUserModal && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)' }}>
              <div
                className="avatar"
                style={{
                  width: 48,
                  height: 48,
                  background: avatarColor(viewUserModal.name),
                  fontSize: 18,
                  fontWeight: 700
                }}
              >
                {viewUserModal.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16 }}>{viewUserModal.name}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewUserModal.id} · Member since {formatDate(viewUserModal.createdAt || '2026-01-01')}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Role</span>
                <span className={`badge ${roleBadgeClass(viewUserModal.role)}`} style={{ marginTop: 2 }}>
                  {roleLabel(viewUserModal.role)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Account Status</span>
                <span className={`badge ${viewUserModal.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 2 }}>
                  {viewUserModal.status || 'active'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Email Address</span>
                <strong>{viewUserModal.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Phone Number</span>
                <strong>{viewUserModal.phone || user.phone || '+91 98000 11111'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Company Workspace</span>
                <strong>{company?.name || 'Apex Builders'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Company ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewUserModal.companyId || company?.id || 'COMP001'}</span>
              </div>
            </div>

            {/* Assigned Responsibilities */}
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 6 }}>
                Assigned Responsibilities / Projects
              </span>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', fontSize: 13 }}>
                {(() => {
                  if (viewUserModal.role === 'company_admin') {
                    return <div>All Company Projects & Operations (Administrative Access)</div>;
                  }
                  if (viewUserModal.role === 'site_engineer') {
                    const engTasks = tasks.filter((t) => t.assignedTo === viewUserModal.id);
                    const engProjectIds = new Set(engTasks.map((t) => t.projectId));
                    const engProjects = projects.filter((p) => engProjectIds.has(p.id));
                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Engineering Pool Member</span>
                          <span className="badge badge-blue">{engProjects.length} Active {engProjects.length === 1 ? 'Site' : 'Sites'} · {engTasks.length} {engTasks.length === 1 ? 'Task' : 'Tasks'}</span>
                        </div>
                        {engProjects.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)' }}>
                            Available in company engineering pool. No active project tasks assigned yet.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: 6 }}>
                            {engProjects.map((p) => {
                              const projTasks = engTasks.filter((t) => t.projectId === p.id);
                              const totalP = projTasks.reduce((sum, t) => sum + (t.status === 'Completed' ? 100 : Number(t.progress) || 0), 0);
                              const avgP = projTasks.length > 0 ? Math.round(totalP / projTasks.length) : 0;
                              return (
                                <div key={p.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>({p.location || 'Active Site'})</span></div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{avgP}% avg task completion</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Assigned Tasks: {projTasks.map((t) => `${t.title} (${t.status === 'Completed' ? 100 : (t.progress || 0)}%)`).join(', ')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const userProjects = projects.filter(
                    (p) =>
                      p.managerId === viewUserModal.id ||
                      p.financeManagerId === viewUserModal.id ||
                      p.siteEngineerId === viewUserModal.id ||
                      p.clientId === viewUserModal.id ||
                      p.managerName === viewUserModal.name ||
                      p.clientName === viewUserModal.name
                  );
                  if (userProjects.length === 0) {
                    return <div>Assigned across company operations ({projects[0]?.name || 'Apex Skyline Tower'})</div>;
                  }
                  return (
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                      {userProjects.map((p) => (
                        <li key={p.id}>
                          <strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({p.location || 'Active Site'})</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: View Project Details */}
      <Modal
        isOpen={!!viewProjectModal}
        onClose={() => setViewProjectModal(null)}
        title={viewProjectModal?.name || 'Project Details'}
        subtitle={viewProjectModal?.location || 'Active Site'}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewProjectModal(null)}
          >
            Close
          </button>
        }
      >
        {viewProjectModal && (() => {
          const clientUser = teamUsers.find(
            (u) =>
              (viewProjectModal.clientId && u.id === viewProjectModal.clientId) ||
              (viewProjectModal.clientEmail && (u.email || '').toLowerCase() === viewProjectModal.clientEmail.toLowerCase())
          );
          const pmUser = teamUsers.find(
            (u) =>
              (viewProjectModal.managerId && u.id === viewProjectModal.managerId) ||
              (viewProjectModal.pmId && u.id === viewProjectModal.pmId) ||
              (viewProjectModal.managerName && u.name === viewProjectModal.managerName)
          );

          const clientName = viewProjectModal.clientName || clientUser?.name || 'Vikram Patel';
          const clientEmail = viewProjectModal.clientEmail || clientUser?.email || 'client@apex.com';
          const clientPhone = viewProjectModal.clientPhone || clientUser?.phone || '+91 98765 43213';

          const pmName = viewProjectModal.managerName || viewProjectModal.pmName || pmUser?.name || 'Rajesh Kumar';
          const pmEmail = pmUser?.email || 'pm@apex.com';

          const fmUser = teamUsers.find(
            (u) =>
              (viewProjectModal.financeManagerId && u.id === viewProjectModal.financeManagerId) ||
              (viewProjectModal.financeManagerName && u.name === viewProjectModal.financeManagerName)
          );
          const fmName = viewProjectModal.financeManagerName || fmUser?.name || 'Amit Verma';
          const fmEmail = fmUser?.email || 'finance@apex.com';

          // Option 2: Pool-based site engineers dynamically derived from tasks in this project
          const projectTasks = tasks.filter((t) => t.projectId === viewProjectModal.id);
          const assignedEngineerIds = [...new Set(projectTasks.map((t) => t.assignedTo).filter(Boolean))];
          const projectEngineers = teamUsers.filter((u) => assignedEngineerIds.includes(u.id));
          const seNames = projectEngineers.length > 0
            ? projectEngineers.map((u) => u.name).join(', ')
            : (viewProjectModal.siteEngineerName || 'Engineering Pool');
          const seRoleNote = projectEngineers.length > 0
            ? `${projectEngineers.length} Engineer${projectEngineers.length > 1 ? 's' : ''} on site tasks`
            : 'Assigned via tasks';
          const seContact = projectEngineers.length > 0
            ? (projectEngineers[0].phone ? `+91 ${projectEngineers[0].phone.slice(-10)}` : projectEngineers[0].email)
            : 'Available from pool';

          const alloc = viewProjectModal.allocations || {};
          const laborAlloc = alloc.Labor ?? alloc.labor ?? 8000000;
          const materialsAlloc = alloc.Materials ?? alloc.materials ?? 12000000;
          const equipmentAlloc = alloc.Equipment ?? alloc.equipment ?? 3000000;
          const otherAlloc = alloc.Other ?? alloc.other ?? 2000000;

          const remainingBudget = Math.max(0, (viewProjectModal.budget || 0) - (viewProjectModal.spent || 0));

          return (
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Financial Banner */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Budget</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>{formatCurrency(viewProjectModal.budget)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Amount Spent</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{formatCurrency(viewProjectModal.spent || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Remaining</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green, #16a34a)', marginTop: 2 }}>{formatCurrency(remainingBudget)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Project ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewProjectModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Status</span>
                  <span className={`badge ${statusBadgeClass(viewProjectModal.status)}`} style={{ marginTop: 2 }}>
                    {viewProjectModal.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Location</span>
                  <strong>{viewProjectModal.location || 'Mumbai, Maharashtra'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Team Size</span>
                  <strong>{viewProjectModal.teamSize || 24} members</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Start Date</span>
                  <strong>{formatDate(viewProjectModal.startDate || '2026-01-01')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>End Date / Deadline</span>
                  <strong>{formatDate(viewProjectModal.endDate) || '2026-06-30'}</strong>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Overall Progress</span>
                  <strong>{viewProjectModal.progress || 0}%</strong>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${viewProjectModal.progress || 0}%`, background: 'var(--primary)' }}
                  ></div>
                </div>
              </div>

              {/* Linked Key Stakeholders: Client, PM, FM, SE */}
              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Client</span>
                  <strong>{clientName}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{clientEmail}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{clientPhone}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Project Manager</span>
                  <strong>{pmName}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pmEmail}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Finance Manager</span>
                  <strong>{fmName}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmEmail}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Site Engineer(s)</span>
                  <strong>{seNames}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{seRoleNote}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seContact}</div>
                </div>
              </div>

              {/* Project Records Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, fontSize: 12 }}>
                <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Active Tasks</span>
                  <strong style={{ fontSize: 14 }}>{tasks.filter(t => t.projectId === viewProjectModal.id).length || 2} Tasks</strong>
                </div>
                <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Milestone Bills</span>
                  <strong style={{ fontSize: 14 }}>{bills.filter(b => b.projectId === viewProjectModal.id).length || 1} Invoices</strong>
                </div>
                <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Logged Expenses</span>
                  <strong style={{ fontSize: 14 }}>{expenses.filter(e => e.projectId === viewProjectModal.id).length || 1} Records</strong>
                </div>
              </div>

              {/* Budget Allocations */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 6 }}>Budget Allocations</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, fontSize: '12px' }}>
                  <div style={{ background: 'var(--bg)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Labor</div>
                    <strong>{formatCurrency(laborAlloc)}</strong>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Materials</div>
                    <strong>{formatCurrency(materialsAlloc)}</strong>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Equipment</div>
                    <strong>{formatCurrency(equipmentAlloc)}</strong>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Other</div>
                    <strong>{formatCurrency(otherAlloc)}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Description</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
                  {viewProjectModal.description || 'High-standard construction and infrastructure development under active execution.'}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: View Task Details */}
      <Modal
        isOpen={!!viewTaskModal}
        onClose={() => setViewTaskModal(null)}
        title={viewTaskModal?.title || 'Task Details'}
        subtitle={viewTaskModal ? `Project: ${viewTaskModal.projectName || projects.find(p => p.id === viewTaskModal.projectId)?.name || 'Apex Skyline Tower'}` : ''}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewTaskModal(null)}
          >
            Close
          </button>
        }
      >
        {viewTaskModal && (() => {
          const se = teamUsers.find((u) => u.id === viewTaskModal.assignedTo) || teamUsers.find((u) => u.name === viewTaskModal.assignedName) || teamUsers.find((u) => u.role === 'site_engineer');
          const projectName = viewTaskModal.projectName || projects.find((p) => p.id === viewTaskModal.projectId)?.name || 'Apex Skyline Tower';
          return (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Task ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewTaskModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Status</span>
                  <span className={`badge ${statusBadgeClass(viewTaskModal.status)}`} style={{ marginTop: 2 }}>
                    {viewTaskModal.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Priority</span>
                  <span className={`badge ${viewTaskModal.priority === 'High' ? 'badge-red' : viewTaskModal.priority === 'Medium' ? 'badge-orange' : 'badge-green'}`} style={{ marginTop: 2 }}>
                    {viewTaskModal.priority || 'Normal'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Assigned Site Engineer</span>
                  <strong>{viewTaskModal.assignedName || se?.name || 'Priya Sharma'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Start Date</span>
                  <strong>{formatDate(viewTaskModal.startDate || '2026-03-01')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Deadline</span>
                  <strong>{formatDate(viewTaskModal.deadline)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Associated Project</span>
                  <strong>{projectName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Engineer Contact</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{se?.phone || se?.email || '+91 98765 43211'}</span>
                </div>
              </div>

              {/* Task Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Task Execution Progress</span>
                  <strong>{viewTaskModal.progress || 0}%</strong>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${viewTaskModal.progress || 0}%`, background: 'var(--primary)' }}
                  ></div>
                </div>
              </div>

              {/* Description */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Scope of Work</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
                  {viewTaskModal.description || 'Complete scheduled engineering activity according to specifications.'}
                </p>
              </div>

              {/* Remarks */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Field Engineer Remarks</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
                  {viewTaskModal.remarks || 'Site execution proceeding as scheduled with quality checks verified.'}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: View Bill Details */}
      <Modal
        isOpen={!!viewBillModal}
        onClose={() => setViewBillModal(null)}
        title={`Bill: ${viewBillModal?.billNumber || viewBillModal?.id || 'Details'}`}
        subtitle={viewBillModal ? `Project: ${viewBillModal.projectName || projects.find(p => p.id === viewBillModal.projectId)?.name || 'Apex Skyline Tower'}` : ''}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewBillModal(null)}
          >
            Close
          </button>
        }
      >
        {viewBillModal && (() => {
          const norm = normalizeBillStatus(viewBillModal.status);
          const p = projects.find((x) => x.id === viewBillModal.projectId);
          const projectName = viewBillModal.projectName || p?.name || 'Apex Skyline Tower';
          const clientName = viewBillModal.clientName || p?.clientName || 'Vikram Patel';
          const milestone = viewBillModal.milestone || (viewBillModal.description ? viewBillModal.description.replace(/\.?$/, '') : 'Milestone 1 - Foundation & Framing');
          const fm = teamUsers.find((u) => u.id === viewBillModal.generatedBy || u.role === 'finance_manager');
          return (
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Amount Banner */}
              <div
                style={{
                  background: 'var(--primary-light, #ffedd5)',
                  border: '1px solid #fdba74',
                  borderRadius: 'var(--radius)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '2px' }}>
                    Invoice Total
                  </div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatCurrency(viewBillModal.amount)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Payment Decision</div>
                  <span className={`badge ${statusBadgeClass(norm)}`}>{norm}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Bill ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewBillModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Invoice / Reference #</span>
                  <strong>{viewBillModal.billNumber || viewBillModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Project</span>
                  <strong>{projectName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Billed Client</span>
                  <strong>{clientName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Construction Milestone</span>
                  <strong>{milestone}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Prepared By</span>
                  <strong>{fm?.name || 'Amit Verma (Finance Manager)'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Issue Date</span>
                  <strong>{formatDate(viewBillModal.date || '2026-03-01')}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Due Date</span>
                  <strong>{formatDate(viewBillModal.dueDate)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Decision Date</span>
                  <strong>{viewBillModal.decisionDate ? formatDate(viewBillModal.decisionDate) : 'Pending Client Decision'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Priority Level</span>
                  <span className="badge badge-orange">{viewBillModal.priority || 'Normal'}</span>
                </div>
              </div>

              {/* Decline Reason if rejected/declined */}
              {viewBillModal.rejectionReason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 'var(--radius)' }}>
                  <strong style={{ color: 'var(--red)', fontSize: '13px' }}>Client Remarks / Decline Reason:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-main)' }}>{viewBillModal.rejectionReason}</p>
                </div>
              )}

              {/* Description */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Milestone Scope / Description</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
                  {viewBillModal.description || 'Milestone verification and billing invoice for scheduled construction activities.'}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: View Expense Details */}
      <Modal
        isOpen={!!viewExpenseModal}
        onClose={() => setViewExpenseModal(null)}
        title="Expense Details"
        subtitle={viewExpenseModal ? `Category: ${viewExpenseModal.category}` : ''}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewExpenseModal(null)}
          >
            Close
          </button>
        }
      >
        {viewExpenseModal && (() => {
          const p = projects.find((x) => x.id === viewExpenseModal.projectId);
          const projectName = p ? p.name : (viewExpenseModal.projectName || 'Apex Skyline Tower');
          const recorder = teamUsers.find((u) => u.id === viewExpenseModal.recordedBy || u.role === 'finance_manager');
          return (
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  background: 'var(--bg)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '2px' }}>
                    Expenditure Total
                  </div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatCurrency(viewExpenseModal.amount)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-orange">{viewExpenseModal.category}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Expense ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewExpenseModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Associated Project</span>
                  <strong>{projectName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Cost Category</span>
                  <strong>{viewExpenseModal.category}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Recorded By</span>
                  <strong>{recorder?.name || 'Amit Verma (Finance Manager)'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Transaction Date</span>
                  <strong>{formatDate(viewExpenseModal.date)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Audit Status</span>
                  <span className="badge badge-green">Reconciled & Approved</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 }}>Description / Justification</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
                  {viewExpenseModal.description || 'Project procurement and operational expenditure item.'}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: Report Details */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || 'Report Details'}
        subtitle={`Submitted by: ${selectedReport?.reporterName || selectedReport?.submittedName || 'Priya Sharma (Site Engineer)'} on ${formatDate(selectedReport?.date)}`}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedReport(null)}
          >
            Close
          </button>
        }
      >
        {selectedReport && (() => {
          const photoUrls = Array.isArray(selectedReport.photoUrls) ? selectedReport.photoUrls : [];
          const projectName = selectedReport.projectName || projects.find(p => p.id === selectedReport.projectId)?.name || 'Apex Skyline Tower';
          const reporter = selectedReport.reporterName || selectedReport.submittedName || teamUsers.find(u => u.id === selectedReport.submittedBy)?.name || 'Priya Sharma (Site Engineer)';
          return (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, fontSize: '13.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Report ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{selectedReport.id}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Project</span>
                  <strong>{projectName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Submitted By</span>
                  <strong>{reporter}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Submission Date</span>
                  <strong>{formatDate(selectedReport.date)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Verification Status</span>
                  <span className={`badge ${statusBadgeClass(selectedReport.status || 'Completed')}`}>
                    {selectedReport.status || 'Completed'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Reported Progress</span>
                  <strong>{selectedReport.progress || 75}%</strong>
                </div>
              </div>

              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)' }}>
                <strong>Work Done / Site Progress:</strong>
                <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>{selectedReport.workDone || 'Daily site activity and physical construction completed as per schedule.'}</p>
              </div>

              {selectedReport.issues && (
                <div style={{ background: '#fef2f2', padding: 14, borderRadius: 'var(--radius)' }}>
                  <strong style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={15} /> Issues / Challenges:
                  </strong>
                  <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>{selectedReport.issues}</p>
                </div>
              )}

              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)' }}>
                <strong>Remarks / Quality Observations:</strong>
                <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>{selectedReport.remarks || 'Site safety regulations and structural compliance met.'}</p>
              </div>

              {/* Materials Table */}
              {Array.isArray(selectedReport.materials) && selectedReport.materials.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Materials Used:</strong>
                  <div className="table-wrap">
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.materials.map((m, idx) => (
                          <tr key={idx}>
                            <td><strong>{m.name}</strong></td>
                            <td>{m.qty}</td>
                            <td>{m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Photos */}
              {photoUrls.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Camera size={15} /> Site Photos ({photoUrls.length}):
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                    {photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          background: 'var(--bg)'
                        }}
                      >
                        <img
                          src={url.startsWith('http') ? url : `http://localhost:3000${url}`}
                          alt={`Site photo ${idx + 1}`}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<div style="height:100px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">Photo ${idx + 1}</div>`;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
