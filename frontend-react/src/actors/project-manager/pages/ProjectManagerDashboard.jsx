import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  Folder,
  CheckSquare,
  Clock,
  DollarSign,
  Users,
  Eye,
  Plus,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  isValidEmail,
  isValidPhone,
  isValidName,
  sanitizeName,
  sanitizePhone,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ProjectManagerDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [company, setCompany] = useState(null);

  // Modals
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [financeManagers, setFinanceManagers] = useState([]);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientPassword: '123456',
    selectedFinanceManagerId: '',
    location: '',
    startDate: '',
    endDate: '',
    budget: '',
    teamSize: '1',
    description: ''
  });
  const [projectErrors, setProjectErrors] = useState({});

  const [taskForm, setTaskForm] = useState({
    title: '',
    projectId: '',
    engineerId: '',
    startDate: '',
    deadline: '',
    priority: 'Medium',
    description: ''
  });
  const [taskErrors, setTaskErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allProjects, allTasks, allNotifs, allUsers, companies] = await Promise.all([
      api.getProjects(user.companyId),
      api.getTasks(user.companyId),
      api.getNotifications(user.id),
      api.getUsers(user.companyId),
      api.getCompanies()
    ]);

    const myProjects = (allProjects || []).filter(
      (p) => p.managerId === user.id || !p.managerId || user.role === 'superuser'
    );
    setProjects(myProjects);

    const myProjectIds = myProjects.map((p) => p.id);
    const myTasks = (allTasks || []).filter((t) => myProjectIds.includes(t.projectId));
    setTasks(myTasks);

    const myFeedbacks = (allNotifs || [])
      .filter((n) => n.userId === user.id && n.title === 'Client Feedback')
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setFeedbacks(myFeedbacks);

    const activeEngineers = (allUsers || []).filter(
      (u) => u.role === 'site_engineer' && u.status === 'active'
    );
    setEngineers(activeEngineers);

    const activeFMs = (allUsers || []).filter(
      (u) => u.role === 'finance_manager' && u.status === 'active'
    );
    setFinanceManagers(activeFMs);
    if (activeFMs.length > 0) {
      setProjectForm((prev) => ({
        ...prev,
        selectedFinanceManagerId: prev.selectedFinanceManagerId || activeFMs[0].id
      }));
    }

    const curCompany = (companies || []).find((c) => c.id === user.companyId);
    setCompany(curCompany || null);
  }

  // Stats calculation
  const totalBudget = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (Number(p.spent) || 0), 0);
  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;
  const completedTaskPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const onScheduleCount = projects.filter((p) => p.status === 'On Track').length;

  const budgetUtilizedPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const dashUtil = Math.floor(budgetUtilizedPct);

  // Add Project Submit
  async function handleSaveProject(e) {
    e.preventDefault();
    const errs = {};

    if (!projectForm.name.trim()) errs.name = 'Project name is required';
    if (!projectForm.clientName.trim()) {
      errs.clientName = 'Client name is required';
    } else if (!isValidName(projectForm.clientName.trim())) {
      errs.clientName = 'Client name should contain alphabets only';
    }

    if (!projectForm.clientEmail.trim()) {
      errs.clientEmail = 'Client email is required';
    } else if (!isValidEmail(projectForm.clientEmail.trim())) {
      errs.clientEmail = 'Invalid email address';
    } else {
      const companyDomain = (company?.domain || user.email.split('@')[1] || '').toLowerCase();
      const clientDomain = (projectForm.clientEmail.split('@')[1] || '').toLowerCase();
      if (companyDomain && clientDomain !== companyDomain) {
        errs.clientEmail = `Client email domain must match company domain (@${companyDomain})`;
      } else {
        const emailLower = projectForm.clientEmail.trim().toLowerCase();
        const existingProj = projects.find(
          (p) => (p.clientEmail || '').toLowerCase() === emailLower
        );
        if (existingProj) {
          errs.clientEmail = `This client is already assigned to project "${existingProj.name}". A client can only have one project.`;
        }
      }
    }

    if (!projectForm.clientPhone.trim()) {
      errs.clientPhone = 'Client phone is required';
    } else if (!isValidPhone(projectForm.clientPhone.trim())) {
      errs.clientPhone = 'Phone number must be 10 digits and cannot be 0000000000';
    }

    if (!projectForm.clientPassword.trim()) {
      errs.clientPassword = 'Password is required';
    } else if (projectForm.clientPassword.length < 6) {
      errs.clientPassword = 'Min 6 characters';
    }

    if (!projectForm.location.trim()) errs.location = 'Project location is required';

    if (!projectForm.startDate) {
      errs.startDate = 'Start date is required';
    }
    if (!projectForm.endDate) {
      errs.endDate = 'End date is required';
    } else if (projectForm.startDate && projectForm.endDate <= projectForm.startDate) {
      errs.endDate = 'End date must be after start date';
    }

    if (!projectForm.budget || Number(projectForm.budget) <= 0) {
      errs.budget = 'Valid budget is required';
    }

    setProjectErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const cleanPhone = (projectForm.clientPhone || '').replace(/\D/g, '').slice(-10);
      // 1. Create client user account
      const clientUser = await api.createUser({
        role: 'client',
        companyId: user.companyId,
        name: projectForm.clientName.trim(),
        email: projectForm.clientEmail.trim().toLowerCase(),
        phone: cleanPhone || '9876543210',
        password: projectForm.clientPassword || '123456',
        status: 'active'
      });

      if (clientUser && clientUser.error) {
        setProjectErrors({
          clientEmail: Array.isArray(clientUser.message) ? clientUser.message.join(', ') : (clientUser.message || 'Failed to create client user')
        });
        return;
      }

      const clientId = clientUser?.id;
      const b = Number(projectForm.budget);

      const assignedFM =
        financeManagers.find((u) => u.id === projectForm.selectedFinanceManagerId) ||
        financeManagers[0];
      const financeManagerId = assignedFM?.id || '';
      const financeManagerName = assignedFM?.name || '';

      // 2. Create project
      const newProj = await api.createProject({
        name: projectForm.name.trim(),
        companyId: user.companyId,
        clientId: clientId,
        clientName: projectForm.clientName.trim(),
        clientEmail: projectForm.clientEmail.trim(),
        clientPhone: cleanPhone || '',
        location: projectForm.location.trim(),
        startDate: projectForm.startDate,
        endDate: projectForm.endDate,
        budget: b,
        spent: 0,
        progress: 0,
        status: 'On Track',
        teamSize: Number(projectForm.teamSize) || 1,
        managerId: user.id,
        managerName: user.name,
        ...(financeManagerId ? { financeManagerId, financeManagerName } : {}),
        allocations: {
          Materials: 0,
          Labor: 0,
          Equipment: 0,
          Other: b
        },
        description: projectForm.description.trim() || `Project ${projectForm.name.trim()} workspace`
      });

      if (newProj && newProj.error) {
        setProjectErrors({
          form: Array.isArray(newProj.message) ? newProj.message.join(', ') : (newProj.message || 'Failed to create project')
        });
        return;
      }

      // 3. Notify client
      if (clientId) {
        await api.createNotification({
          userId: clientId,
          type: 'system',
          title: 'Project Created',
          body: `Your project "${newProj.name}" has been successfully set up.`
        });
      }

      setIsAddProjectOpen(false);
      setProjectForm({
        name: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientPassword: '123456',
        selectedFinanceManagerId: financeManagers[0]?.id || '',
        location: '',
        startDate: '',
        endDate: '',
        budget: '',
        teamSize: '1',
        description: ''
      });
      loadData();
    } catch (err) {
      setProjectErrors({ form: err.message || 'Failed to create project' });
    }
  }

  // Add Task Submit
  async function handleSaveTask(e) {
    e.preventDefault();
    const errs = {};

    if (!taskForm.title.trim()) errs.title = 'Task title is required';
    if (!taskForm.projectId) errs.projectId = 'Please select a project';
    if (!taskForm.engineerId) errs.engineerId = 'Please select an assigned engineer';
    if (!taskForm.startDate) errs.startDate = 'Start date is required';
    if (!taskForm.deadline) {
      errs.deadline = 'Deadline is required';
    } else if (taskForm.startDate && taskForm.deadline <= taskForm.startDate) {
      errs.deadline = 'Deadline must be after start date';
    }
    if (!taskForm.description.trim()) errs.description = 'Task description is required';

    setTaskErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const proj = projects.find((p) => p.id === taskForm.projectId);
      const eng = engineers.find((e) => e.id === taskForm.engineerId);

      const newTask = await api.createTask({
        title: taskForm.title.trim(),
        projectId: taskForm.projectId,
        projectName: proj ? proj.name : '',
        assignedTo: taskForm.engineerId,
        assignedName: eng ? eng.name : '',
        priority: taskForm.priority,
        status: 'Pending',
        progress: 0,
        startDate: taskForm.startDate,
        deadline: taskForm.deadline,
        description: taskForm.description.trim(),
        remarks: ''
      });

      // Notify engineer
      await api.createNotification({
        userId: taskForm.engineerId,
        type: 'task',
        title: 'New Task Assigned',
        body: `You have been assigned to: ${newTask.title} for ${newTask.projectName}.`
      });

      setIsAddTaskOpen(false);
      setTaskForm({
        title: '',
        projectId: '',
        engineerId: '',
        startDate: '',
        deadline: '',
        priority: 'Medium',
        description: ''
      });
      loadData();
    } catch (err) {
      setTaskErrors({ form: err.message || 'Failed to assign task' });
    }
  }

  return (
    <div className="page-container">
      {/* Top Header Row */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Project Manager Dashboard</h1>
          <p className="page-subtitle">Overview of all your construction projects</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setIsAddTaskOpen(true)}>
            + Add Task
          </Button>
          <Button variant="primary" onClick={() => setIsAddProjectOpen(true)}>
            + Add Project
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-orange">
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
          <div className="stat-value">{completedTaskPct}%</div>
          <div className="stat-label">Tasks Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-blue">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">
            {onScheduleCount}/{projects.length}
          </div>
          <div className="stat-label">On Schedule</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-purple">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '18px' }}>
            {formatCurrency(totalSpent)}
          </div>
          <div className="stat-label">Budget Utilization</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="card-title">Project Growth</div>
          <div
            style={{
              height: '180px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '16px',
              paddingTop: '12px'
            }}
          >
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '10px', width: '100%' }}>
                <p>No project data available</p>
              </div>
            ) : (
              projects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    flex: 1,
                    maxWidth: '80px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {p.progress}%
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '40px',
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max(8, ((p.progress || 0) / 100) * 140)}px`
                    }}
                  />
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      textAlign: 'center'
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Budget Overview</div>
          <div
            style={{
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ textAlign: 'center', width: '100%' }}>
              <svg width="140" height="140" viewBox="0 0 36 36" style={{ margin: '0 auto', display: 'block' }}>
                <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray={`${dashUtil} ${100 - dashUtil}`}
                  strokeDashoffset="25"
                />
              </svg>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  marginTop: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', background: '#e5e7eb', borderRadius: '2px' }}></div>
                  Total {formatCurrency(totalBudget)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }}></div>
                  Utilized {budgetUtilizedPct}% ({formatCurrency(totalSpent)})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Projects Table */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="section-title">Active Projects</div>
          <Link to="/project-manager/projects" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Deadline</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon"><Folder size={28} /></div>
                      <p>No projects yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                projects.slice(0, 4).map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/project-manager/projects/${p.id}`)}
                  >
                    <td><strong>{p.name}</strong></td>
                    <td style={{ width: '160px' }}>
                      <div className="progress-bar-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${p.progress || 0}%` }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td>{formatCurrency(p.budget)}</td>
                    <td>{formatDate(p.endDate)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} /> {p.teamSize || 1}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Feedback Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title" style={{ marginBottom: '14px' }}>Client Feedback</div>
        {feedbacks.length === 0 ? (
          <div className="empty-state">
            <p>No feedback received yet</p>
          </div>
        ) : (
          feedbacks.map((n) => (
            <div
              key={n.id}
              style={{
                background: 'var(--bg)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{n.subject || 'Feedback'}</span>
                {n.priority && (
                  <span className={`badge ${priorityBadge(n.priority)}`}>
                    {n.priority}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setSelectedFeedback(n)}
                >
                  View Details
                </Button>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {n.clientName || 'Client'} · {n.projectName || 'Project'}
                {n.category ? ` · ${n.category}` : ''}
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {(n.body || '').length > 80 ? (n.body || '').substring(0, 80) + '...' : n.body}
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{n.time || formatDate(n.createdAt)}</div>
            </div>
          ))
        )}
      </div>

      {/* Feedback Modal */}
      {selectedFeedback && (
        <Modal
          isOpen={!!selectedFeedback}
          title="Client Feedback"
          onClose={() => setSelectedFeedback(null)}
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <h3 style={{ marginBottom: '6px' }}>{selectedFeedback.subject || selectedFeedback.title}</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selectedFeedback.clientName || 'Client'} · {selectedFeedback.projectName || 'Project'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', fontSize: '12.5px' }}>
              <div><strong>Category:</strong> {selectedFeedback.category || 'General'}</div>
              <div><strong>Priority:</strong> {selectedFeedback.priority || 'Medium'}</div>
              <div><strong>Client:</strong> {selectedFeedback.clientName || 'Vikram Patel (Client)'}</div>
              <div><strong>Date:</strong> {selectedFeedback.time || formatDate(selectedFeedback.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Message
              </div>
              <p style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', margin: 0 }}>
                {selectedFeedback.body}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Project Modal */}
      {isAddProjectOpen && (
        <Modal
          isOpen={isAddProjectOpen}
          title="Add New Project"
          subtitle="Create a new construction project and client account."
          onClose={() => setIsAddProjectOpen(false)}
        >
          <form onSubmit={handleSaveProject}>
            {projectErrors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {projectErrors.form}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Project Name <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${projectErrors.name ? 'input-error' : ''}`}
                placeholder="e.g., Skyline Tower"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              />
              {projectErrors.name && <span className="field-error">{projectErrors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client Name <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${projectErrors.clientName ? 'input-error' : ''}`}
                  placeholder="e.g., Acme Corp"
                  value={projectForm.clientName}
                  onChange={(e) => setProjectForm({ ...projectForm, clientName: sanitizeName(e.target.value) })}
                />
                {projectErrors.clientName && <span className="field-error">{projectErrors.clientName}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Client Email <span className="req">*</span></label>
                <input
                  type="email"
                  className={`form-input ${projectErrors.clientEmail ? 'input-error' : ''}`}
                  placeholder="client@company.com"
                  value={projectForm.clientEmail}
                  onChange={(e) => setProjectForm({ ...projectForm, clientEmail: e.target.value })}
                />
                {projectErrors.clientEmail && <span className="field-error">{projectErrors.clientEmail}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client Phone <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${projectErrors.clientPhone ? 'input-error' : ''}`}
                  placeholder="e.g., 9876543210"
                  value={projectForm.clientPhone}
                  onChange={(e) => setProjectForm({ ...projectForm, clientPhone: sanitizePhone(e.target.value) })}
                />
                {projectErrors.clientPhone && <span className="field-error">{projectErrors.clientPhone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Client Password <span className="req">*</span></label>
                <input
                  type="password"
                  className={`form-input ${projectErrors.clientPassword ? 'input-error' : ''}`}
                  placeholder="Min 6 chars"
                  value={projectForm.clientPassword}
                  onChange={(e) => setProjectForm({ ...projectForm, clientPassword: e.target.value })}
                />
                {projectErrors.clientPassword && <span className="field-error">{projectErrors.clientPassword}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Finance Manager <span className="req">*</span></label>
              <select
                className="form-select"
                value={projectForm.selectedFinanceManagerId}
                onChange={(e) => setProjectForm({ ...projectForm, selectedFinanceManagerId: e.target.value })}
              >
                {financeManagers.length === 0 ? (
                  <option value="">No Finance Manager available</option>
                ) : (
                  financeManagers.map((fm) => (
                    <option key={fm.id} value={fm.id}>
                      {fm.name} ({fm.email})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Project Location <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${projectErrors.location ? 'input-error' : ''}`}
                placeholder="e.g., Mumbai, Maharashtra"
                value={projectForm.location}
                onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
              />
              {projectErrors.location && <span className="field-error">{projectErrors.location}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${projectErrors.startDate ? 'input-error' : ''}`}
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
                {projectErrors.startDate && <span className="field-error">{projectErrors.startDate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Date <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${projectErrors.endDate ? 'input-error' : ''}`}
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
                {projectErrors.endDate && <span className="field-error">{projectErrors.endDate}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Budget (₹) <span className="req">*</span></label>
                <input
                  type="number"
                  className={`form-input ${projectErrors.budget ? 'input-error' : ''}`}
                  placeholder="e.g., 25000000"
                  min="1"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                />
                {projectErrors.budget && <span className="field-error">{projectErrors.budget}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Team Size</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g., 20"
                  min="1"
                  value={projectForm.teamSize}
                  onChange={(e) => setProjectForm({ ...projectForm, teamSize: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Project description..."
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsAddProjectOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                + Save Project
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Task Modal */}
      {isAddTaskOpen && (
        <Modal
          isOpen={isAddTaskOpen}
          title="Add New Task"
          subtitle="Assign a new task to an active site engineer."
          onClose={() => setIsAddTaskOpen(false)}
        >
          <form onSubmit={handleSaveTask}>
            {taskErrors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {taskErrors.form}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Task Title <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${taskErrors.title ? 'input-error' : ''}`}
                placeholder="e.g., Foundation Inspection"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
              {taskErrors.title && <span className="field-error">{taskErrors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Project <span className="req">*</span></label>
              <select
                className={`form-select ${taskErrors.projectId ? 'input-error' : ''}`}
                value={taskForm.projectId}
                onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {taskErrors.projectId && <span className="field-error">{taskErrors.projectId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Site Engineer <span className="req">*</span></label>
              <select
                className={`form-select ${taskErrors.engineerId ? 'input-error' : ''}`}
                value={taskForm.engineerId}
                onChange={(e) => setTaskForm({ ...taskForm, engineerId: e.target.value })}
              >
                <option value="">Select engineer</option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {taskErrors.engineerId && <span className="field-error">{taskErrors.engineerId}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${taskErrors.startDate ? 'input-error' : ''}`}
                  value={taskForm.startDate}
                  onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                />
                {taskErrors.startDate && <span className="field-error">{taskErrors.startDate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Deadline <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${taskErrors.deadline ? 'input-error' : ''}`}
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                />
                {taskErrors.deadline && <span className="field-error">{taskErrors.deadline}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priority <span className="req">*</span></label>
              <select
                className="form-select"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Task Description <span className="req">*</span></label>
              <textarea
                className={`form-textarea ${taskErrors.description ? 'input-error' : ''}`}
                placeholder="Describe the task..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
              {taskErrors.description && <span className="field-error">{taskErrors.description}</span>}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsAddTaskOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                ✓ Assign Task
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
