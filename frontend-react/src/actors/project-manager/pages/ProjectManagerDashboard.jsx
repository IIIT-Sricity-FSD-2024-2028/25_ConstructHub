import LiveSummary from '../../../components/dashboard/LiveSummary';
import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import { fetchProjects, selectProjectsManagedBy, projectDisplayStatus } from '../../../features/projects/projectsSlice';
import { fetchUsers, selectUsersByRole } from '../../../features/users/usersSlice';
import { fetchMilestones, selectMilestoneList, selectMilestoneListStatus } from '../../../features/milestones/milestonesSlice';
import { fetchFeedback, selectAllFeedback } from '../../../features/finance/financeSlice';
import { createTask } from '../../../features/tasks/tasksSlice';
import { sendNotification } from '../../../features/notifications/notificationsSlice';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  Folder,
  Users,
  AlertCircle
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ProjectManagerDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => selectProjectsManagedBy(state, user?.id));
  // New tasks only go to projects that are running (not waiting for the advance, not finished).
  const taskProjects = projects.filter((p) => p.allowed?.canManageTasks);
  const milestones = useAppSelector(selectMilestoneList);
  const milestonesFailed = useAppSelector(selectMilestoneListStatus) === 'failed';
  // Client feedback records on this PM's projects (the server only returns those).
  const feedbacks = useAppSelector(selectAllFeedback);
  const engineers = useAppSelector((state) => selectUsersByRole(state, 'site_engineer')).filter((u) => u.status === 'active');
  useLoad([fetchProjects, fetchUsers, fetchMilestones, fetchFeedback]);

  // Modals
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Form states

  const [taskForm, setTaskForm] = useState({
    title: '',
    projectId: '',
    milestoneId: '',
    engineerId: '',
    startDate: '',
    deadline: '',
    priority: 'Medium',
    description: ''
  });
  const [taskErrors, setTaskErrors] = useState({});

  // Stats calculation
  const totalBudget = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (Number(p.spent) || 0), 0);

  const budgetUtilizedPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const dashUtil = Math.floor(budgetUtilizedPct);

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

      const newTask = await dispatch(createTask({
        milestoneId: taskForm.milestoneId || null,
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
      })).unwrap();

      // Notify engineer
      dispatch(sendNotification({
        userId: taskForm.engineerId,
        type: 'task',
        title: 'New Task Assigned',
        body: `You have been assigned to: ${newTask.title} for ${newTask.projectName}.`
      }));

      setIsAddTaskOpen(false);
      setTaskForm({
        title: '',
        projectId: '',
        milestoneId: '',
        engineerId: '',
        startDate: '',
        deadline: '',
        priority: 'Medium',
        description: ''
      });
    } catch (err) {
      setTaskErrors({ form: errorText(err, 'Failed to assign task') });
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

        </div>
      </div>

      <LiveSummary />

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
                    <td><span className={`badge ${statusBadge(projectDisplayStatus(p))}`}>{projectDisplayStatus(p)}</span></td>
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
                {(n.message || '').length > 80 ? n.message.substring(0, 80) + '...' : n.message}
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
              <div><strong>Client:</strong> {selectedFeedback.clientName || 'Client'}</div>
              <div><strong>Date:</strong> {selectedFeedback.time || formatDate(selectedFeedback.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Message
              </div>
              <p style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', margin: 0 }}>
                {selectedFeedback.message}
              </p>
            </div>
          </div>
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
                onChange={(e) => {
                  const nextPid = e.target.value;
                  const firstOpenMs = milestones.find((m) => m.projectId === nextPid && m.status !== 'Completed');
                  setTaskForm({ ...taskForm, projectId: nextPid, milestoneId: firstOpenMs ? firstOpenMs.id : '' });
                }}
              >
                <option value="">{taskProjects.length ? 'Select project' : 'No running project can take new tasks'}</option>
                {taskProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {taskErrors.projectId && <span className="field-error">{taskErrors.projectId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Milestone <span className="req">*</span></label>
              <select
                className="form-select"
                value={taskForm.milestoneId || ''}
                onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
              >
                <option value="">
                  {milestonesFailed
                    ? 'Could not load milestones - reload the page'
                    : taskForm.projectId && !milestones.some((m) => m.projectId === taskForm.projectId && m.status !== 'Completed')
                      ? 'No open milestones for this project'
                      : 'Select milestone'}
                </option>
                {milestones
                  .filter((m) => m.projectId === taskForm.projectId && m.status !== 'Completed')
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
              </select>
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
