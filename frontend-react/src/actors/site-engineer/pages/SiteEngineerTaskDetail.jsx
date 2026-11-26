import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3
} from 'lucide-react';
import { useAppSelector, useLoad, isFirstLoad } from '../../../store/hooks';
import { fetchTasks, selectTaskById, selectTasksStatus } from '../../../features/tasks/tasksSlice';
import { fetchProjects, selectProjectById } from '../../../features/projects/projectsSlice';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
export default function SiteEngineerTaskDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const task = useAppSelector((state) => (id ? selectTaskById(state, id) : null)) || null;
  const project = useAppSelector((state) => (task ? selectProjectById(state, task.projectId) : null)) || null;
  const tasksStatus = useAppSelector(selectTasksStatus);
  useLoad([fetchTasks, fetchProjects], [id]);

  if (isFirstLoad(tasksStatus, Boolean(task))) {
    return <div className="page-container"><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div></div>;
  }

  if (!task) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/site-engineer/my-tasks')}
          className="back-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back to My Tasks
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <h3>Task not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The task you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const resolvedProjectName = task.projectName || project?.name || task.projectId;
  const resolvedSupervisor = project?.managerName || '-';
  const resolvedLocation = project?.location || '-';

  return (
    <div className="page-container">
      <button
        onClick={() => navigate('/site-engineer/my-tasks')}
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
        <ArrowLeft size={16} /> Back to My Tasks
      </button>

      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{task.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
            <span className={`badge ${statusBadge(task.status)}`}>{task.status}</span>
          </div>
        </div>
        <div>
          <Link to={`/site-engineer/update-task?id=${task.id}`} className="btn btn-primary">
            <Edit3 size={15} style={{ marginRight: '4px' }} /> Update Status
          </Link>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Task & Site Information</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Task ID</label><span>{task.id}</span></div>
            <div className="detail-item"><label>Associated Project</label><span>{resolvedProjectName}</span></div>
            <div className="detail-item"><label>Site Location</label><span>{resolvedLocation}</span></div>
            <div className="detail-item"><label>Supervising Manager</label><span>{resolvedSupervisor}</span></div>
            <div className="detail-item"><label>Assigned Engineer</label><span>{task.assignedName || '-'}</span></div>
            <div className="detail-item"><label>Start Date</label><span>{formatDate(task.startDate)}</span></div>
            <div className="detail-item"><label>Deadline</label><span>{formatDate(task.deadline)}</span></div>
            <div className="detail-item"><label>Priority Rating</label><span><span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span></span></div>
            <div className="detail-item"><label>Workflow Status</label><span><span className={`badge ${statusBadge(task.status)}`}>{task.status}</span></span></div>
          </div>
        </div>

        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Execution Progress</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Completion Stage</span>
              <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--primary)' }}>{task.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${task.progress || 0}%` }}></div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Latest Field Remarks
            </label>
            <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '6px' }}>
              {task.remarks || 'Site inspection completed according to engineering specifications and safety guidelines.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '10px' }}>Task Scope & Engineering Description</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
          {task.description || 'Executes site construction and quality compliance benchmarks as scoped in the project design charter.'}
        </p>
      </div>
    </div>
  );
}
