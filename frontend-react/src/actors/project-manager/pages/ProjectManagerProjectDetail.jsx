import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Wallet,
  Edit3,
  Plus,
  Users,
  Calendar,
  Camera,
  FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ProjectManagerProjectDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [client, setClient] = useState(null);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    status: 'On Track',
    startDate: '',
    endDate: '',
    budget: '',
    progress: 0,
    description: ''
  });

  useEffect(() => {
    loadProject();
  }, [id, user]);

  async function loadProject() {
    if (!id || !user) return;
    const [allProjects, allTasks, allReports, allUsers] = await Promise.all([
      api.getProjects(user.companyId),
      api.getTasks(user.companyId),
      api.getReports(user.companyId),
      api.getUsers(user.companyId)
    ]);

    const proj = (allProjects || []).find((p) => p.id === id);
    if (!proj) {
      setProject(null);
      return;
    }
    setProject(proj);

    const projTasks = (allTasks || []).filter((t) => t.projectId === proj.id);
    setTasks(projTasks);

    const projReports = (allReports || []).filter((r) => r.projectId === proj.id);
    setReports(projReports);

    const clientUser = (allUsers || []).find((u) => u.id === proj.clientId);
    setClient(clientUser || null);

    setEditForm({
      name: proj.name || '',
      location: proj.location || '',
      status: proj.status || 'On Track',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      budget: proj.budget || '',
      progress: proj.progress || 0,
      description: proj.description || ''
    });
  }

  async function handleUpdateProject(e) {
    e.preventDefault();
    if (!project) return;
    try {
      await api.updateProject(project.id, {
        name: editForm.name.trim(),
        location: editForm.location.trim(),
        status: editForm.status,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        budget: Number(editForm.budget),
        progress: Number(editForm.progress) || 0,
        description: editForm.description.trim()
      });
      setIsEditOpen(false);
      loadProject();
    } catch (err) {
      alert('Failed to update project: ' + err.message);
    }
  }

  if (!project) {
    return (
      <div className="page-container">
        <button onClick={() => navigate('/project-manager/projects')} className="back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <h3>Project not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The project you requested does not exist or was removed.</p>
        </div>
      </div>
    );
  }

  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;
  const clientName = project.clientName || client?.name || 'Vikram Patel';
  const clientEmail = client?.email || project.clientEmail || 'client@apex.com';
  const clientPhone = client?.phone || project.clientPhone || '+91 98765 43213';
  const fmName = project.financeManagerName || 'Amit Verma';
  const assignedEngineerNames = [...new Set((tasks || []).map((t) => t.assignedName).filter(Boolean))];
  const seDisplay = assignedEngineerNames.length > 0
    ? `${assignedEngineerNames.join(', ')} (Assigned via Tasks)`
    : (project.siteEngineerName || 'Assigned per task (Pool)');

  return (
    <div className="page-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/project-manager/projects')}
        className="back-btn"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{project.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Package size={16} /> {project.location || 'Mumbai, Maharashtra'}
            </span>
            <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            <Edit3 size={15} style={{ marginRight: '4px' }} /> Edit Project
          </Button>
          <Button variant="primary" onClick={() => navigate('/project-manager/tasks')}>
            <Plus size={15} style={{ marginRight: '4px' }} /> Add Task
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-orange"><TrendingUp size={20} /></div></div>
          <div className="stat-value">{project.progress || 0}%</div>
          <div className="stat-label">Overall Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-green"><CheckCircle2 size={20} /></div></div>
          <div className="stat-value">{completedTasksCount}/{tasks.length}</div>
          <div className="stat-label">Tasks Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-blue"><DollarSign size={20} /></div></div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(project.budget)}</div>
          <div className="stat-label">Total Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-purple"><Wallet size={20} /></div></div>
          <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(project.spent || 0)}</div>
          <div className="stat-label">Amount Spent</div>
        </div>
      </div>

      {/* Info & Details */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Project Information */}
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Project Information</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Project ID</label><span>{project.id}</span></div>
            <div className="detail-item"><label>Client Name</label><span>{clientName}</span></div>
            <div className="detail-item"><label>Client Email</label><span>{clientEmail}</span></div>
            <div className="detail-item"><label>Client Phone</label><span>{clientPhone}</span></div>
            <div className="detail-item"><label>Location</label><span>{project.location || 'Mumbai, Maharashtra'}</span></div>
            <div className="detail-item"><label>Project Manager</label><span>{project.managerName || user.name}</span></div>
            <div className="detail-item"><label>Finance Manager</label><span>{fmName}</span></div>
            <div className="detail-item"><label>Site Engineer(s)</label><span>{seDisplay}</span></div>
            <div className="detail-item"><label>Start Date</label><span>{formatDate(project.startDate || '2026-01-01')}</span></div>
            <div className="detail-item"><label>End Date</label><span>{formatDate(project.endDate) || '2026-06-30'}</span></div>
            <div className="detail-item"><label>Team Size</label><span>{project.teamSize || 24} members</span></div>
          </div>
          {project.description && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Description
              </label>
              <p style={{ marginTop: '4px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                {project.description}
              </p>
            </div>
          )}
        </div>

        {/* Financial & Status Summary */}
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Financial Breakdown</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Total Budget</label><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(project.budget)}</span></div>
            <div className="detail-item"><label>Utilized / Spent</label><span>{formatCurrency(project.spent || 0)}</span></div>
            <div className="detail-item"><label>Remaining Budget</label><span>{formatCurrency(Math.max(0, (project.budget || 0) - (project.spent || 0)))}</span></div>
            <div className="detail-item"><label>Status</label><span><span className={`badge ${statusBadge(project.status)}`}>{project.status}</span></span></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
              <span>Progress Bar</span>
              <strong>{project.progress || 0}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Tasks */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="section-title">Project Tasks ({tasks.length})</div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/project-manager/tasks')}>
            Manage Tasks
          </Button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned Engineer</th>
                <th>Deadline</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <p>No tasks assigned for this project yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/project-manager/tasks/${t.id}`)}
                  >
                    <td><strong>{t.title}</strong></td>
                    <td>{t.assignedName || project?.siteEngineerName || 'Site Engineer'}</td>
                    <td>{formatDate(t.deadline)}</td>
                    <td><span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span></td>
                    <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                    <td style={{ width: '120px' }}>
                      <div className="progress-bar-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${t.progress || 0}%` }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.progress || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Associated Reports */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '14px' }}>
          Site Reports ({reports.length})
        </div>
        {reports.length === 0 ? (
          <div className="empty-state">
            <p>No site reports filed for this project yet.</p>
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong>{r.title}</strong>
                  <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                  <span>By: {r.submittedName}</span>
                  <span>Date: {formatDate(r.date)}</span>
                  <span><Camera size={13} style={{ verticalAlign: 'middle' }} /> {r.photos || (r.photoUrls?.length || 0)} photos</span>
                </div>
              </div>
              <Link to={`/project-manager/reports/${r.id}`} className="btn btn-secondary btn-sm">
                View Report
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal
          isOpen={isEditOpen}
          title="Edit Project"
          subtitle="Update project details"
          onClose={() => setIsEditOpen(false)}
        >
          <form onSubmit={handleUpdateProject}>
            <div className="form-group">
              <label className="form-label">Project Name <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Delayed">Delayed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Budget (₹) <span className="req">*</span></label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Progress (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
