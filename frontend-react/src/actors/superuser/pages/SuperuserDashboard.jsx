import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  TrendingUp,
  Mail,
  Users,
  Folder,
  PlusCircle,
  Edit2,
  Power,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Phone
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  roleLabel,
  roleBadgeClass,
  statusBadgeClass,
  isValidDomain,
  isValidEmail,
  isValidPhone
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';

const BASE_QUOTAS = {
  Basic: { users: 10, projects: 3, price: 4999 },
  Pro: { users: 50, projects: 15, price: 9999 },
  Enterprise: { users: 500, projects: 100, price: 19999 }
};

export default function SuperuserDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'companies';

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  // Modals
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [isEditingComp, setIsEditingComp] = useState(false);
  const [onboardingInquiryId, setOnboardingInquiryId] = useState(null);
  const [compForm, setCompForm] = useState({
    id: '',
    name: '',
    code: '',
    domain: '',
    ownerEmail: '',
    phone: '',
    plan: 'Pro',
    billingCycle: 'monthly',
    extraUsers: 0,
    extraProjects: 0,
    overageEnabled: true
  });
  const [compFormErrors, setCompFormErrors] = useState({});

  const [inquiryModal, setInquiryModal] = useState(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    const [c, u, p, inq] = await Promise.all([
      api.getCompanies(),
      api.getUsers(),
      api.getProjects(),
      api.getInquiries()
    ]);
    setCompanies(c || []);
    setUsers(u || []);
    setProjects(p || []);
    setInquiries(inq || []);
  }

  function handleTabChange(tabKey) {
    setSearchParams({ tab: tabKey });
  }

  // --- Company Modal Handlers ---
  function openAddCompanyModal() {
    setIsEditingComp(false);
    setOnboardingInquiryId(null);
    setCompForm({
      id: '',
      name: '',
      code: '',
      domain: '',
      ownerEmail: '',
      phone: '',
      plan: 'Pro',
      billingCycle: 'monthly',
      extraUsers: 0,
      extraProjects: 0,
      overageEnabled: true
    });
    setCompFormErrors({});
    setCompModalOpen(true);
  }

  function handleOnboardInquiry(inq) {
    if (!inq) return;
    setInquiryModal(null);
    setOnboardingInquiryId(inq.id);
    const domainFromEmail = inq.email && inq.email.includes('@') ? inq.email.split('@')[1] : '';
    const cleanName = (inq.company && inq.company !== 'Prospective Enterprise Client' ? inq.company : inq.name || 'New Firm').trim();
    const suggestedCode = cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);

    let plan = 'Pro';
    if (inq.message && inq.message.toLowerCase().includes('enterprise')) plan = 'Enterprise';
    else if (inq.message && inq.message.toLowerCase().includes('basic')) plan = 'Basic';

    let extraUsers = 0;
    let extraProjects = 0;
    if (inq.message) {
      const uMatch = inq.message.match(/Extra:\s*\+?(\d+)\s*Users/i);
      if (uMatch) extraUsers = parseInt(uMatch[1], 10) || 0;
      const pMatch = inq.message.match(/Extra:.*?(\d+)\s*Projects/i);
      if (pMatch) extraProjects = parseInt(pMatch[1], 10) || 0;
    }

    setIsEditingComp(false);
    setCompForm({
      id: '',
      name: cleanName,
      code: suggestedCode || 'FIRM01',
      domain: domainFromEmail || 'company.com',
      ownerEmail: inq.email || '',
      phone: (inq.phone || '').replace(/[^0-9]/g, '').slice(-10),
      plan,
      billingCycle: 'monthly',
      extraUsers,
      extraProjects,
      overageEnabled: true
    });
    setCompFormErrors({});
    setCompModalOpen(true);
  }

  function openEditCompanyModal(c) {
    setIsEditingComp(true);
    setOnboardingInquiryId(null);
    const plan = c.plan && BASE_QUOTAS[c.plan] ? c.plan : 'Basic';
    const baseQuota = BASE_QUOTAS[plan] || BASE_QUOTAS.Basic;
    const extraUsers = c.extraUsers !== undefined
      ? Number(c.extraUsers)
      : Math.max(0, (c.customUserLimit || baseQuota.users) - baseQuota.users);
    const extraProjects = c.extraProjects !== undefined
      ? Number(c.extraProjects)
      : Math.max(0, (c.customProjectLimit || baseQuota.projects) - baseQuota.projects);

    setCompForm({
      id: c.id,
      name: c.name || '',
      code: c.code || '',
      domain: c.domain || '',
      ownerEmail: c.ownerEmail || '',
      phone: (c.phone || '').replace(/[^0-9]/g, '').slice(-10),
      plan,
      billingCycle: c.billingCycle || 'monthly',
      extraUsers,
      extraProjects,
      overageEnabled: !!c.overageEnabled
    });
    setCompFormErrors({});
    setCompModalOpen(true);
  }

  async function handleSaveCompany(e) {
    e.preventDefault();
    const errors = {};

    if (!compForm.name.trim()) errors.name = 'Company Name is required';
    if (!compForm.code.trim()) errors.code = 'Company Code is required';
    else if (!/^[a-zA-Z0-9_-]+$/.test(compForm.code.trim())) {
      errors.code = 'Code must contain only letters, numbers, hyphens or underscores';
    }

    if (!compForm.domain.trim()) errors.domain = 'Approved Domain is required';
    else if (!isValidDomain(compForm.domain.trim())) errors.domain = 'Invalid domain (e.g. apex.com)';

    if (!compForm.ownerEmail.trim()) errors.ownerEmail = 'Owner Email is required';
    else if (!isValidEmail(compForm.ownerEmail.trim())) errors.ownerEmail = 'Invalid email address';
    else if (compForm.domain.trim() && isValidDomain(compForm.domain.trim())) {
      const emailDomain = compForm.ownerEmail.trim().split('@')[1]?.toLowerCase();
      const expectedDomain = compForm.domain.trim().toLowerCase();
      if (emailDomain !== expectedDomain) {
        errors.ownerEmail = `Owner/Admin email domain (@${emailDomain || 'invalid'}) must match company domain (@${expectedDomain})`;
      }
    }

    if (compForm.phone && !isValidPhone(compForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (Object.keys(errors).length > 0) {
      setCompFormErrors(errors);
      return;
    }

    const baseQuota = BASE_QUOTAS[compForm.plan] || BASE_QUOTAS.Basic;
    const extraUsers = Math.max(0, parseInt(compForm.extraUsers, 10) || 0);
    const extraProjects = Math.max(0, parseInt(compForm.extraProjects, 10) || 0);
    const totalUserLimit = baseQuota.users + extraUsers;
    const totalProjectLimit = baseQuota.projects + extraProjects;

    if (isEditingComp) {
      const updateRes = await api.updateCompany(compForm.id, {
        name: compForm.name.trim(),
        code: compForm.code.trim().toLowerCase(),
        domain: compForm.domain.trim().toLowerCase(),
        ownerEmail: compForm.ownerEmail.trim().toLowerCase(),
        phone: compForm.phone ? `+91 ${compForm.phone}` : '',
        plan: compForm.plan,
        billingCycle: compForm.billingCycle,
        extraUsers,
        extraProjects,
        customUserLimit: totalUserLimit,
        customProjectLimit: totalProjectLimit,
        overageEnabled: compForm.overageEnabled
      });

      if (updateRes && updateRes.error) {
        const msg = Array.isArray(updateRes.message) ? updateRes.message.join(', ') : (updateRes.message || 'Failed to update company.');
        setCompFormErrors({ ownerEmail: msg });
        return;
      }
    } else {
      const regRes = await api.registerCompany({
        company: {
          name: compForm.name.trim(),
          code: compForm.code.trim().toLowerCase(),
          domain: compForm.domain.trim().toLowerCase(),
          ownerEmail: compForm.ownerEmail.trim().toLowerCase(),
          phone: compForm.phone ? `+91 ${compForm.phone}` : '',
          plan: compForm.plan,
          billingCycle: compForm.billingCycle,
          extraUsers,
          extraProjects,
          customUserLimit: totalUserLimit,
          customProjectLimit: totalProjectLimit,
          overageEnabled: compForm.overageEnabled
        },
        admin: {
          name: `${compForm.name} Admin`,
          email: compForm.ownerEmail.trim().toLowerCase(),
          password: 'password123',
          phone: compForm.phone ? `+91 ${compForm.phone}` : ''
        }
      });

      if (regRes && regRes.error) {
        const msg = Array.isArray(regRes.message) ? regRes.message.join(', ') : (regRes.message || 'Failed to register company.');
        if (msg.toLowerCase().includes('domain')) {
          setCompFormErrors({ domain: msg });
        } else if (msg.toLowerCase().includes('code')) {
          setCompFormErrors({ code: msg });
        } else {
          setCompFormErrors({ ownerEmail: msg });
        }
        return;
      }
    }

    // Auto-update onboarding inquiry status to Onboarded
    if (onboardingInquiryId) {
      await api.updateInquiry(onboardingInquiryId, { status: 'Onboarded' }).catch(() => {});
    }
    const matchingInquiry = inquiries.find(
      (inq) => (inq.email || '').toLowerCase() === compForm.ownerEmail.trim().toLowerCase()
    );
    if (matchingInquiry && matchingInquiry.status !== 'Onboarded') {
      await api.updateInquiry(matchingInquiry.id, { status: 'Onboarded' }).catch(() => {});
    }

    setOnboardingInquiryId(null);
    setCompModalOpen(false);
    loadAllData();
  }

  async function handleToggleCompanyStatus(c) {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    await api.updateCompany(c.id, { status: newStatus });
    loadAllData();
  }

  async function handleToggleInquiryStatus(inq) {
    const nextStatus = inq.status === 'Resolved' ? 'Pending' : 'Resolved';
    await api.updateInquiry(inq.id, { status: nextStatus });
    loadAllData();
  }

  // --- Calculations for Platform Revenue ---
  const activeComps = companies.filter((c) => c.status === 'active');
  const planRates = { Basic: 4999, Pro: 9999, Enterprise: 19999 };
  const totalBaseMRR = activeComps.reduce(
    (sum, c) => sum + (planRates[c.plan] || planRates.Basic),
    0
  );
  const totalOverageRevenue = activeComps.reduce((sum, c) => {
    if (!c.overageEnabled) return sum;
    const uOverage = (c.extraUsers || 0) * 499;
    const pOverage = (c.extraProjects || 0) * 1999;
    return sum + uOverage + pOverage;
  }, 0);
  const grandTotalMRR = totalBaseMRR + totalOverageRevenue;

  // Filtered Global Users
  const filteredUsers = users.filter((u) => {
    const matchQ =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.companyId || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    return matchQ && matchRole;
  });

  // Filtered Global Projects
  const filteredProjects = projects.filter((p) => {
    const matchQ =
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(projectSearch.toLowerCase());
    const matchStatus = !projectStatusFilter || p.status === projectStatusFilter;
    return matchQ && matchStatus;
  });

  return (
    <div>
      {/* Platform Banner */}
      <div className="pa-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="badge badge-orange" style={{ letterSpacing: '0.05em' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              APPLICATION LEVEL
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
            Platform Administration Panel
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.75 }}>
            Global multi-tenant oversight across all registered construction firms
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={openAddCompanyModal}
            className="btn btn-primary"
          >
            <PlusCircle size={16} /> Register New Firm
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-orange">
              <Building2 size={20} />
            </div>
          </div>
          <div className="stat-value">{companies.length}</div>
          <div className="stat-label">Registered Firms</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-blue">
              <Folder size={20} />
            </div>
          </div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Global Projects</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-green">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Global Users</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-purple">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {formatCurrency(grandTotalMRR)}
          </div>
          <div className="stat-label">Monthly SaaS MRR</div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="module-tabs">
        <button
          type="button"
          className={`module-tab ${currentTab === 'companies' ? 'active' : ''}`}
          onClick={() => handleTabChange('companies')}
        >
          <Building2 size={16} /> Companies ({companies.length})
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'revenue' ? 'active' : ''}`}
          onClick={() => handleTabChange('revenue')}
        >
          <TrendingUp size={16} /> Platform Revenue & SaaS
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'inquiries' ? 'active' : ''}`}
          onClick={() => handleTabChange('inquiries')}
        >
          <Mail size={16} /> Contact Inquiries ({inquiries.length})
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'all-users' ? 'active' : ''}`}
          onClick={() => handleTabChange('all-users')}
        >
          <Users size={16} /> All Global Users ({users.length})
        </button>
        <button
          type="button"
          className={`module-tab ${currentTab === 'all-projects' ? 'active' : ''}`}
          onClick={() => handleTabChange('all-projects')}
        >
          <Folder size={16} /> All Global Projects ({projects.length})
        </button>
      </div>

      {/* TAB 1: Companies */}
      {currentTab === 'companies' && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Registered Construction Firms</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {companies.length} Tenants Active
            </span>
          </div>

          <DataTable
            data={companies}
            columns={[
              {
                key: 'name',
                label: 'Company Name',
                render: (c) => (
                  <div>
                    <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {c.id}</div>
                  </div>
                )
              },
              {
                key: 'code',
                label: 'Code / Tag',
                render: (c) => (
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</span>
                )
              },
              {
                key: 'domain',
                label: 'Domain',
                render: (c) => (
                  <span className="badge badge-gray">@{c.domain}</span>
                )
              },
              {
                key: 'ownerEmail',
                label: 'Owner Contact',
                render: (c) => (
                  <div>
                    <div>{c.ownerEmail}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>
                  </div>
                )
              },
              {
                key: 'plan',
                label: 'SaaS Plan',
                render: (c) => (
                  <span className="badge badge-orange">{c.plan || 'Basic'}</span>
                )
              },
              {
                key: 'status',
                label: 'Status',
                render: (c) => (
                  <span className={`badge ${statusBadgeClass(c.status)}`}>
                    {c.status || 'active'}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (c) => (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditCompanyModal(c)}
                      title="Edit Company"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${c.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleCompanyStatus(c)}
                      title="Toggle Active/Inactive"
                    >
                      <Power size={13} /> {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {/* TAB 2: Platform Revenue */}
      {currentTab === 'revenue' && (
        <div>
          <div className="grid-3" style={{ marginBottom: '20px' }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Base Subscription MRR
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {formatCurrency(totalBaseMRR)}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                From {activeComps.length} active SaaS memberships
              </p>
            </div>

            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Usage-Based Overages
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
                {formatCurrency(totalOverageRevenue)}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Extra team members & project capacity
              </p>
            </div>

            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Platform MRR
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
                {formatCurrency(grandTotalMRR)}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Annualized Run Rate: {formatCurrency(grandTotalMRR * 12)}
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>
              Subscription Breakdown by Tenant
            </h3>
            <DataTable
              data={activeComps}
              columns={[
                { key: 'name', label: 'Company', render: (c) => <strong>{c.name}</strong> },
                { key: 'plan', label: 'Plan', render: (c) => <span className="badge badge-orange">{c.plan}</span> },
                {
                  key: 'base',
                  label: 'Base Rate',
                  render: (c) => formatCurrency(planRates[c.plan] || 4999)
                },
                {
                  key: 'overage',
                  label: 'Overage Enabled',
                  render: (c) => (
                    <span className={`badge ${c.overageEnabled ? 'badge-green' : 'badge-gray'}`}>
                      {c.overageEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )
                },
                {
                  key: 'limits',
                  label: 'Quotas (Users / Projs)',
                  render: (c) => (
                    <span>
                      {c.customUserLimit || 10} Users / {c.customProjectLimit || 3} Projects
                    </span>
                  )
                },
                {
                  key: 'total',
                  label: 'Monthly Fee',
                  render: (c) => {
                    const base = planRates[c.plan] || 4999;
                    const uO = c.overageEnabled ? (c.extraUsers || 0) * 499 : 0;
                    const pO = c.overageEnabled ? (c.extraProjects || 0) * 1999 : 0;
                    return <strong style={{ color: 'var(--green)' }}>{formatCurrency(base + uO + pO)}</strong>;
                  }
                }
              ]}
            />
          </div>
        </div>
      )}

      {/* TAB 3: Contact Inquiries */}
      {currentTab === 'inquiries' && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Prospective Client Inquiries</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {inquiries.length} Inquiries Logged
            </span>
          </div>

          <DataTable
            data={inquiries}
            emptyMessage="No contact inquiries recorded."
            columns={[
              {
                key: 'name',
                label: 'Name & Organization',
                render: (inq) => {
                  const isFirmReq = inq.type === 'firm_request' || inq.message?.includes('[Firm Onboarding') || (Boolean(inq.company) && inq.company !== 'Prospective Enterprise Client' && inq.type !== 'general_inquiry');
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>{inq.name}</strong>
                        {isFirmReq ? (
                          <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 6px' }}>Firm Request</span>
                        ) : (
                          <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>General Inquiry</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inq.company || (isFirmReq ? 'Enterprise Lead' : 'General Question')}</div>
                    </div>
                  );
                }
              },
              {
                key: 'contact',
                label: 'Contact Info',
                render: (inq) => (
                  <div>
                    <div>{inq.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inq.phone}</div>
                  </div>
                )
              },
              {
                key: 'message',
                label: 'Message / Request',
                render: (inq) => (
                  <div style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inq.message}>
                    {inq.message}
                  </div>
                )
              },
              {
                key: 'status',
                label: 'Status',
                render: (inq) => {
                  if (inq.status === 'Onboarded') {
                    return <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={11} /> Onboarded</span>;
                  }
                  if (inq.status === 'Resolved') {
                    return <span className="badge badge-green">Resolved</span>;
                  }
                  return <span className="badge badge-orange">{inq.status || 'Pending'}</span>;
                }
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (inq) => {
                  const isFirmReq = inq.type === 'firm_request' || inq.message?.includes('[Firm Onboarding') || (Boolean(inq.company) && inq.company !== 'Prospective Enterprise Client' && inq.type !== 'general_inquiry');
                  const isOnboarded = inq.status === 'Onboarded';

                  return (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setInquiryModal(inq)}
                      >
                        View
                      </button>
                      {isFirmReq && (
                        isOnboarded ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled
                            style={{ opacity: 0.8, cursor: 'not-allowed', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            title="Firm workspace has already been created and onboarded"
                          >
                            <CheckCircle2 size={13} /> Onboarded
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            title="Onboard company workspace from this request"
                            onClick={() => handleOnboardInquiry(inq)}
                          >
                            <Building2 size={13} style={{ marginRight: 3 }} /> Onboard
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        className={`btn btn-sm ${inq.status === 'Resolved' ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => handleToggleInquiryStatus(inq)}
                      >
                        {inq.status === 'Resolved' ? 'Mark Pending' : 'Mark Resolved'}
                      </button>
                    </div>
                  );
                }
              }
            ]}
          />
        </div>
      )}

      {/* TAB 4: All Global Users */}
      {currentTab === 'all-users' && (
        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Search user by name, email, company ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="company_admin">Company Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="site_engineer">Site Engineer</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="client">Client</option>
            </select>
          </div>

          <DataTable
            data={filteredUsers}
            columns={[
              {
                key: 'name',
                label: 'Full Name',
                render: (u) => (
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {u.id}</div>
                  </div>
                )
              },
              { key: 'email', label: 'Email' },
              {
                key: 'companyId',
                label: 'Company Tenant',
                render: (u) => {
                  const comp = companies.find((c) => c.id === u.companyId);
                  return comp ? comp.name : (u.companyId || 'Platform Admin');
                }
              },
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
              }
            ]}
          />
        </div>
      )}

      {/* TAB 5: All Global Projects */}
      {currentTab === 'all-projects' && (
        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Search project by name or location..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
            >
              <option value="">All Project Statuses</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Delayed">Delayed</option>
              <option value="Completed">Completed</option>
            </select>
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
                key: 'companyId',
                label: 'Company Tenant',
                render: (p) => {
                  const comp = companies.find((c) => c.id === p.companyId);
                  return comp ? comp.name : p.companyId;
                }
              },
              {
                key: 'budget',
                label: 'Budget',
                render: (p) => <strong>{formatCurrency(p.budget)}</strong>
              },
              {
                key: 'progress',
                label: 'Progress',
                render: (p) => (
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: 11, marginBottom: 2 }}>{p.progress}%</div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${p.progress}%`, background: 'var(--primary)' }}></div>
                    </div>
                  </div>
                )
              },
              {
                key: 'teamSize',
                label: 'Team Size',
                render: (p) => `${p.teamSize || 0} Members`
              },
              {
                key: 'status',
                label: 'Status',
                render: (p) => (
                  <span className={`badge ${statusBadgeClass(p.status)}`}>
                    {p.status}
                  </span>
                )
              }
            ]}
          />
        </div>
      )}

      {/* MODAL: Register / Edit Company */}
      <Modal
        isOpen={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        title={isEditingComp ? 'Edit Construction Firm' : 'Register Construction Firm'}
        subtitle="Manage company tenant credentials, domain, and SaaS limits"
      >
        <form onSubmit={handleSaveCompany}>
          <div className="form-group">
            <label className="form-label">
              Company Name <span className="req">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${compFormErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. Apex Builders"
              value={compForm.name}
              onChange={(e) => {
                const val = e.target.value;
                if (!isEditingComp) {
                  const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
                  const newDomain = slug ? `${slug}.com` : '';
                  setCompForm((prev) => {
                    const prevSlug = prev.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
                    const isCodeAuto = !prev.code || prev.code === prevSlug;
                    const isDomainAuto = !prev.domain || prev.domain === (prevSlug ? `${prevSlug}.com` : '');
                    const isEmailAuto = !prev.ownerEmail || prev.ownerEmail.startsWith('admin@');
                    const updatedCode = isCodeAuto ? slug : prev.code;
                    const updatedDomain = isDomainAuto ? newDomain : prev.domain;
                    return {
                      ...prev,
                      name: val,
                      code: updatedCode,
                      domain: updatedDomain,
                      ownerEmail: isEmailAuto ? (updatedDomain ? `admin@${updatedDomain}` : '') : prev.ownerEmail
                    };
                  });
                } else {
                  setCompForm({ ...compForm, name: val });
                }
              }}
            />
            {compFormErrors.name && <span className="field-error">{compFormErrors.name}</span>}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Company Code <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${compFormErrors.code ? 'input-error' : ''}`}
                placeholder="e.g. apex"
                value={compForm.code}
                onChange={(e) => setCompForm({ ...compForm, code: e.target.value.toLowerCase() })}
              />
              {compFormErrors.code && <span className="field-error">{compFormErrors.code}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Approved Domain <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${compFormErrors.domain ? 'input-error' : ''}`}
                placeholder="e.g. apex.com"
                value={compForm.domain}
                onChange={(e) => {
                  const newDomain = e.target.value.toLowerCase().trim();
                  setCompForm((prev) => ({
                    ...prev,
                    domain: newDomain,
                    ownerEmail: prev.ownerEmail === '' || prev.ownerEmail.startsWith('admin@') ? (newDomain ? `admin@${newDomain}` : '') : prev.ownerEmail
                  }));
                }}
              />
              {compFormErrors.domain && <span className="field-error">{compFormErrors.domain}</span>}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Owner Email <span className="req">*</span>
              </label>
              <input
                type="email"
                className={`form-input ${compFormErrors.ownerEmail ? 'input-error' : ''}`}
                placeholder={`admin@${compForm.domain || 'company.com'}`}
                value={compForm.ownerEmail}
                onChange={(e) => setCompForm({ ...compForm, ownerEmail: e.target.value })}
              />
              {compFormErrors.ownerEmail && <span className="field-error">{compFormErrors.ownerEmail}</span>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Must match company domain: @{compForm.domain || 'company.com'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input
                type="tel"
                className={`form-input ${compFormErrors.phone ? 'input-error' : ''}`}
                placeholder="10-digit number"
                value={compForm.phone}
                maxLength={10}
                onChange={(e) => setCompForm({ ...compForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
              />
              {compFormErrors.phone && <span className="field-error">{compFormErrors.phone}</span>}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Subscription Plan</label>
              <select
                className="form-select"
                value={compForm.plan}
                onChange={(e) => setCompForm({ ...compForm, plan: e.target.value })}
              >
                <option value="Basic">Basic (₹4,999/mo)</option>
                <option value="Pro">Pro (₹9,999/mo)</option>
                <option value="Enterprise">Enterprise (₹19,999/mo)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Billing Cycle</label>
              <select
                className="form-select"
                value={compForm.billingCycle}
                onChange={(e) => setCompForm({ ...compForm, billingCycle: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual (Save 15%)</option>
              </select>
            </div>
          </div>

          {/* Plan Base Quota & Extra Pre-Purchased Capacity */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                Plan Quota & Extra Pre-Purchased Capacity
              </div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>
                Base: {BASE_QUOTAS[compForm.plan]?.users || 50} Users · {BASE_QUOTAS[compForm.plan]?.projects || 15} Projects
              </span>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Extra Users Required</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>₹199/user/mo</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="0"
                  value={compForm.extraUsers}
                  onChange={(e) => setCompForm({ ...compForm, extraUsers: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Discounted pre-purchased capacity (saves 60% vs ₹499 standard overage)
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Extra Projects Required</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>₹799/project/mo</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="0"
                  value={compForm.extraProjects}
                  onChange={(e) => setCompForm({ ...compForm, extraProjects: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Discounted pre-purchased capacity (saves 60% vs ₹1,999 standard overage)
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <div>
                <strong>Effective Limits:</strong>{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {(BASE_QUOTAS[compForm.plan]?.users || 50) + (Number(compForm.extraUsers) || 0)} Users
                </span>{' '}
                ({BASE_QUOTAS[compForm.plan]?.users || 50} base + {Number(compForm.extraUsers) || 0} extra) ·{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {(BASE_QUOTAS[compForm.plan]?.projects || 15) + (Number(compForm.extraProjects) || 0)} Projects
                </span>{' '}
                ({BASE_QUOTAS[compForm.plan]?.projects || 15} base + {Number(compForm.extraProjects) || 0} extra)
              </div>
              <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 13 }}>
                ₹{((BASE_QUOTAS[compForm.plan]?.price || 9999) + (Number(compForm.extraUsers) || 0) * 199 + (Number(compForm.extraProjects) || 0) * 799).toLocaleString('en-IN')}/mo
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCompModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditingComp ? 'Save Changes' : 'Register Firm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Inquiry Details */}
      <Modal
        isOpen={!!inquiryModal}
        onClose={() => setInquiryModal(null)}
        title={
          inquiryModal?.type === 'general_inquiry' || (!inquiryModal?.type && !inquiryModal?.message?.includes('[Firm Onboarding') && (!inquiryModal?.company || inquiryModal?.company === 'Prospective Enterprise Client'))
            ? `${inquiryModal?.name || 'Inquiry'} — General Inquiry`
            : `${inquiryModal?.company || inquiryModal?.name} — Firm Onboarding Request`
        }
        subtitle={`Submitted on: ${inquiryModal?.createdAt || 'Recent'}`}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
            {inquiryModal?.email && (
              <a
                href={`mailto:${inquiryModal.email}?subject=ConstructHub%20Inquiry%20Follow-up&body=Hi%20${encodeURIComponent(inquiryModal.name)},%0D%0A%0D%0AThank%20you%20for%20contacting%20ConstructHub...`}
                className="btn btn-secondary"
                target="_blank"
                rel="noreferrer"
              >
                <Mail size={14} style={{ marginRight: 4 }} /> Email Lead
              </a>
            )}
            {inquiryModal?.phone && (
              <a
                href={`tel:${inquiryModal.phone}`}
                className="btn btn-secondary"
              >
                <Phone size={14} style={{ marginRight: 4 }} /> Call ({inquiryModal.phone})
              </a>
            )}
            {(inquiryModal?.type === 'firm_request' || inquiryModal?.message?.includes('[Firm Onboarding') || (Boolean(inquiryModal?.company) && inquiryModal?.company !== 'Prospective Enterprise Client' && inquiryModal?.type !== 'general_inquiry')) ? (
              inquiryModal?.status === 'Onboarded' ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  style={{ opacity: 0.8, cursor: 'not-allowed', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <CheckCircle2 size={14} /> Firm Workspace Onboarded
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleOnboardInquiry(inquiryModal)}
                >
                  <Building2 size={14} style={{ marginRight: 4 }} /> Create Firm Workspace
                </button>
              )
            ) : (
              <button
                type="button"
                className={`btn ${inquiryModal?.status === 'Resolved' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => {
                  handleToggleInquiryStatus(inquiryModal);
                  setInquiryModal(null);
                }}
              >
                {inquiryModal?.status === 'Resolved' ? 'Mark as Pending' : 'Resolve Inquiry'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setInquiryModal(null)}
            >
              Close
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Sender Information
            </div>
            <div className="grid-2" style={{ fontSize: 13 }}>
              <div><strong>Name:</strong> {inquiryModal?.name}</div>
              <div><strong>Email:</strong> {inquiryModal?.email}</div>
              <div><strong>Phone:</strong> {inquiryModal?.phone}</div>
              <div><strong>Type:</strong> {inquiryModal?.type === 'general_inquiry' || (!inquiryModal?.type && !inquiryModal?.message?.includes('[Firm Onboarding') && (!inquiryModal?.company || inquiryModal?.company === 'Prospective Enterprise Client')) ? 'General Inquiry' : 'Firm Onboarding Request'}</div>
              {inquiryModal?.company && <div><strong>Company:</strong> {inquiryModal?.company}</div>}
              <div><strong>Status:</strong> {inquiryModal?.status || 'Pending'}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Message
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {inquiryModal?.message}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
