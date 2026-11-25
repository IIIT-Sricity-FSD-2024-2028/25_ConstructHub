import { useState, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Folder,
  Building2,
  User,
  Package,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api, unwrap } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  statusBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';


export default function ProjectManagerProjects() {
  const toast = useToast();
  const { user } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    clientId: '',
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
    status: 'On Track',
    progress: 0,
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allProjects, allUsers] = await Promise.all([
      api.getProjects(user.companyId),
      api.getUsers(user.companyId)
    ]);
    const myProjects = (allProjects || []).filter(
      (p) => p.managerId === user.id || !p.managerId || user.role === 'superuser'
    );
    setProjects(myProjects);
    setUsers(allUsers || []);
  }

  function openEditModal(proj) {
    setEditingProject(proj);
    const client = users.find((u) => u.id === proj.clientId);
    const fms = (users || []).filter((u) => u.role === 'finance_manager');
    setForm({
      name: proj.name || '',
      clientName: client ? client.name : (proj.clientName || ''),
      clientEmail: client ? client.email : (proj.clientEmail || ''),
      clientPhone: client ? client.phone : (proj.clientPhone || ''),
      clientPassword: '',
      selectedFinanceManagerId: proj.financeManagerId || fms[0]?.id || '',
      location: proj.location || '',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      budget: proj.budget || '',
      teamSize: proj.teamSize || '1',
      status: proj.status || 'On Track',
      progress: proj.progress || 0,
      description: proj.description || ''
    });
    setErrors({});
    setIsModalOpen(true);
  }

  async function handleSaveProject(e) {
    e.preventDefault();
    const errs = {};

    if (!form.name.trim()) errs.name = 'Project name is required';
    if (!form.location.trim()) errs.location = 'Location is required';

    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.endDate) {
      errs.endDate = 'End date is required';
    } else if (form.startDate && form.endDate <= form.startDate) {
      errs.endDate = 'End date must be after start date';
    }

    if (!form.budget || Number(form.budget) <= 0) {
      errs.budget = 'Valid budget is required';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const assignedFM =
        (users || []).find((u) => u.id === form.selectedFinanceManagerId && u.role === 'finance_manager') ||
        (users || []).find((u) => u.role === 'finance_manager');
      const financeManagerId = assignedFM?.id || '';
      const financeManagerName = assignedFM?.name || '';

      // Projects are created when a client awards a quotation (Marketplace); here the PM edits their own projects.
      if (!editingProject) return;
      unwrap(await api.updateProject(editingProject.id, {
        name: form.name.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        budget: Number(form.budget),
        teamSize: Number(form.teamSize) || 1,
        status: form.status,
        progress: Number(form.progress) || 0,
        description: form.description.trim(),
        ...(financeManagerId ? { financeManagerId, financeManagerName } : {})
      }));

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrors({ form: err.message || 'Error saving project' });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      unwrap(await api.deleteProject(deleteTarget.id));
      // Only remove the client's account when this was their last project (clients can own several now).
      const sharesClient = projects.some((p) => p.id !== deleteTarget.id && p.clientId === deleteTarget.clientId);
      if (deleteTarget.clientId && !sharesClient && (user?.role === 'company_admin' || user?.role === 'superuser')) {
        await api.deleteUser(deleteTarget.clientId).catch(() => {});
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error('Failed to delete project: ' + err.message);
    }
  }

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">All Projects</h1>
          <p className="page-subtitle">Manage and track all construction projects</p>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 280, textAlign: 'right' }}>
          New projects appear here when a client awards your company's quotation.
        </span>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="">All Status</option>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Delayed">Delayed</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid-2">
        {filteredProjects.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">
              <Folder size={32} />
            </div>
            <h3>No projects found</h3>
            <p>Create your first project to get started</p>
          </div>
        ) : (
          filteredProjects.map((p) => {
            const client = users.find((u) => u.id === p.clientId);
            const clientDisplayName = p.clientName || client?.name || 'Vikram Patel';
            return (
              <div key={p.id} className="project-card">
                <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      background: 'var(--primary-light)',
                      padding: '10px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}
                  >
                    <Building2 size={20} />
                  </div>
                  <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                </div>

                <div className="project-name" style={{ fontSize: '17px', fontWeight: 700, margin: '12px 0 4px' }}>
                  {p.name}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    margin: '4px 0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <User size={14} color="var(--primary)" /> Client:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>{clientDisplayName}</strong>
                </div>

                <div className="project-loc" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} /> {p.location}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                    <span>Progress</span>
                    <strong>{p.progress || 0}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${p.progress || 0}%` }}></div>
                  </div>
                </div>

                <div
                  className="project-meta-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12.5px'
                  }}
                >
                  <span>
                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> {p.teamSize || 1}
                    </strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Team</span>
                  </span>
                  <span>
                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} /> {formatDate(p.endDate)}
                    </strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Deadline</span>
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px'
                  }}
                >
                  <div className="project-budget" style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)' }}>
                    {formatCurrency(p.budget)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link to={`/project-manager/projects/${p.id}`} className="btn btn-outline btn-sm">
                      View
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          title="Edit Project"
          subtitle="Update project information"
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSaveProject}>
            {errors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {errors.form}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Project Name <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g., Skyline Tower"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>


            <div className="form-group">
              <label className="form-label">Assigned Finance Manager <span className="req">*</span></label>
              <select
                className="form-select"
                value={form.selectedFinanceManagerId}
                onChange={(e) => setForm({ ...form, selectedFinanceManagerId: e.target.value })}
              >
                {(users || []).filter((u) => u.role === 'finance_manager').length === 0 ? (
                  <option value="">No Finance Manager available</option>
                ) : (
                  (users || [])
                    .filter((u) => u.role === 'finance_manager')
                    .map((fm) => (
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
                className={`form-input ${errors.location ? 'input-error' : ''}`}
                placeholder="e.g., Mumbai, Maharashtra"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              {errors.location && <span className="field-error">{errors.location}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${errors.startDate ? 'input-error' : ''}`}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                {errors.startDate && <span className="field-error">{errors.startDate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Date <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${errors.endDate ? 'input-error' : ''}`}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                {errors.endDate && <span className="field-error">{errors.endDate}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Budget (₹) <span className="req">*</span></label>
                <input
                  type="number"
                  className={`form-input ${errors.budget ? 'input-error' : ''}`}
                  placeholder="e.g., 25000000"
                  min="1"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
                {errors.budget && <span className="field-error">{errors.budget}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Team Size</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g., 20"
                  min="1"
                  value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                />
              </div>
            </div>

            {editingProject && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="On Track">On Track</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Progress (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Project description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title="Delete Project"
          onClose={() => setDeleteTarget(null)}
        >
          <p style={{ marginBottom: '16px' }}>
            Are you sure you want to delete project <strong>"{deleteTarget.name}"</strong>? This will remove all associated tasks and records.
          </p>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Project
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
