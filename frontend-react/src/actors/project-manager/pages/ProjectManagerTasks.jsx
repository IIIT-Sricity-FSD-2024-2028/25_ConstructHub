import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  CheckSquare,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ProjectManagerTasks() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [engineers, setEngineers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    projectId: '',
    engineerId: '',
    startDate: '',
    deadline: '',
    priority: 'Medium',
    status: 'Pending',
    progress: 0,
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allProjects, allTasks, allUsers] = await Promise.all([
      api.getProjects(user.companyId),
      api.getTasks(user.companyId),
      api.getUsers(user.companyId)
    ]);

    const myProjects = (allProjects || []).filter(
      (p) => p.managerId === user.id || !p.managerId || user.role === 'superuser'
    );
    setProjects(myProjects);

    const myProjectIds = myProjects.map((p) => p.id);
    const myTasks = (allTasks || []).filter((t) => myProjectIds.includes(t.projectId));
    setTasks(myTasks);

    const activeEngineers = (allUsers || []).filter(
      (u) => u.role === 'site_engineer' && u.status === 'active'
    );
    setEngineers(activeEngineers);
  }

  function openAddModal() {
    setEditingTask(null);
    setForm({
      title: '',
      projectId: projects[0]?.id || '',
      engineerId: engineers[0]?.id || '',
      startDate: '',
      deadline: '',
      priority: 'Medium',
      status: 'Pending',
      progress: 0,
      description: ''
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(t) {
    setEditingTask(t);
    setForm({
      title: t.title || '',
      projectId: t.projectId || '',
      engineerId: t.assignedTo || '',
      startDate: t.startDate || '',
      deadline: t.deadline || '',
      priority: t.priority || 'Medium',
      status: t.status || 'Pending',
      progress: t.progress || 0,
      description: t.description || ''
    });
    setErrors({});
    setIsModalOpen(true);
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    const errs = {};

    if (!form.title.trim()) errs.title = 'Task title is required';
    if (!form.projectId) errs.projectId = 'Please select a project';
    if (!form.engineerId) errs.engineerId = 'Please select an engineer';
    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.deadline) {
      errs.deadline = 'Deadline is required';
    } else if (form.startDate && form.deadline <= form.startDate) {
      errs.deadline = 'Deadline must be after start date';
    }
    if (!form.description.trim()) errs.description = 'Task description is required';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const proj = projects.find((p) => p.id === form.projectId);
      const eng = engineers.find((e) => e.id === form.engineerId);

      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title: form.title.trim(),
          projectId: form.projectId,
          projectName: proj ? proj.name : editingTask.projectName,
          assignedTo: form.engineerId,
          assignedName: eng ? eng.name : editingTask.assignedName,
          priority: form.priority,
          status: form.status,
          progress: Number(form.progress) || 0,
          startDate: form.startDate,
          deadline: form.deadline,
          description: form.description.trim()
        });
      } else {
        const newTask = await api.createTask({
          title: form.title.trim(),
          projectId: form.projectId,
          projectName: proj ? proj.name : '',
          assignedTo: form.engineerId,
          assignedName: eng ? eng.name : '',
          priority: form.priority,
          status: 'Pending',
          progress: 0,
          startDate: form.startDate,
          deadline: form.deadline,
          description: form.description.trim(),
          remarks: ''
        });

        await api.createNotification({
          userId: form.engineerId,
          type: 'task',
          title: 'New Task Assigned',
          body: `You have been assigned to: ${newTask.title} for ${newTask.projectName}.`
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrors({ form: err.message || 'Error saving task' });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await api.deleteTask(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.projectName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesPriority = !filterPriority || t.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">Manage and track all project tasks</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          + New Task
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: '180px' }}
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select
          className="form-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ maxWidth: '180px' }}
        >
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Tasks List */}
      <div id="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CheckSquare size={32} /></div>
            <h3>No tasks found</h3>
            <p>Try adjusting your search filters or assign a new task</p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isOverdue =
              t.status !== 'Completed' &&
              t.deadline &&
              new Date(t.deadline) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={t.id}
                className="task-card"
                style={{ cursor: 'pointer', marginBottom: '14px' }}
                onClick={() => navigate(`/project-manager/tasks/${t.id}`)}
              >
                <div className="task-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong className="task-card-title" style={{ fontSize: '15px' }}>{t.title}</strong>
                    <span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span>
                  </div>
                  <div>
                    <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
                    {isOverdue && (
                      <span className="badge badge-red" style={{ marginLeft: '6px' }}>
                        Overdue
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-card-meta" style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '6px 0 10px' }}>
                  {t.projectName}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${t.progress || 0}%` }}></div>
                  </div>
                  <span className="task-pct" style={{ fontSize: '12px', fontWeight: 600 }}>{t.progress || 0}%</span>
                </div>

                <div
                  className="task-card-footer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={14} /> {t.assignedName || 'Unassigned'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formatDate(t.deadline)}
                  </span>
                  <div
                    className="actions"
                    style={{ display: 'flex', gap: '6px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(t)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(t)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          title={editingTask ? 'Edit Task' : 'Add New Task'}
          subtitle={editingTask ? 'Update task details' : 'Assign a task to an active site engineer.'}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSaveTask}>
            {errors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {errors.form}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Task Title <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="e.g., Foundation Inspection"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Project <span className="req">*</span></label>
              <select
                className={`form-select ${errors.projectId ? 'input-error' : ''}`}
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && <span className="field-error">{errors.projectId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Site Engineer <span className="req">*</span></label>
              <select
                className={`form-select ${errors.engineerId ? 'input-error' : ''}`}
                value={form.engineerId}
                onChange={(e) => setForm({ ...form, engineerId: e.target.value })}
              >
                <option value="">Select engineer</option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {errors.engineerId && <span className="field-error">{errors.engineerId}</span>}
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
                <label className="form-label">Deadline <span className="req">*</span></label>
                <input
                  type="date"
                  className={`form-input ${errors.deadline ? 'input-error' : ''}`}
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
                {errors.deadline && <span className="field-error">{errors.deadline}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {editingTask && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}
            </div>

            {editingTask && (
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
            )}

            <div className="form-group">
              <label className="form-label">Task Description <span className="req">*</span></label>
              <textarea
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe the task..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingTask ? 'Save Changes' : '✓ Assign Task'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          title="Delete Task"
          onClose={() => setDeleteTarget(null)}
        >
          <p style={{ marginBottom: '16px' }}>
            Are you sure you want to delete task <strong>"{deleteTarget.title}"</strong>?
          </p>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Task
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
