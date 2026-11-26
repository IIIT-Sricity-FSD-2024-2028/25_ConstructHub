import { useMemo } from 'react';
import { useAppSelector, useLoad } from '../../../store/hooks';
import { fetchTasks, selectTasksAssignedTo } from '../../../features/tasks/tasksSlice';
import { fetchProjects, selectAllProjects, projectDisplayStatus } from '../../../features/projects/projectsSlice';
import { fetchReports, selectAllReports } from '../../../features/reports/reportsSlice';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  CheckCircle2,
  FileText,
  Edit3,
  Calendar
} from 'lucide-react';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function SiteEngineerDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const myTasks = useAppSelector((state) => selectTasksAssignedTo(state, user?.id));
  const allProjects = useAppSelector(selectAllProjects);
  const allReports = useAppSelector(selectAllReports);
  useLoad([fetchTasks, fetchReports, fetchProjects]);

  // Active sites = all projects where this engineer has assigned tasks (including completed ones).
  const assignedProjectIds = useMemo(() => new Set(myTasks.map((t) => t.projectId).filter(Boolean)), [myTasks]);
  const myProjects = useMemo(() => allProjects.filter((p) => assignedProjectIds.has(p.id)), [allProjects, assignedProjectIds]);
  const myReports = useMemo(() => allReports
    .filter((r) => r.submittedBy === user?.id)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [allReports, user]);

  const completedCount = myTasks.filter((t) => t.status === 'Completed').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">Site Engineer Dashboard</h1>
          <p className="page-subtitle">Track your assignments, update task progress, and submit site reports</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => navigate('/site-engineer/update-task')}>
            <Edit3 size={15} style={{ marginRight: '4px' }} /> Update Task Status
          </Button>
          <Button variant="primary" onClick={() => navigate('/site-engineer/submit-report')}>
            <FileText size={15} style={{ marginRight: '4px' }} /> Submit Site Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-blue">
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="stat-value">{myTasks.length}</div>
          <div className="stat-label">Assigned Tasks</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-orange">
              <Calendar size={20} />
            </div>
          </div>
          <div className="stat-value">{myProjects.length}</div>
          <div className="stat-label">Active Work Sites</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-green">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Completed Tasks</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-purple">
              <FileText size={20} />
            </div>
          </div>
          <div className="stat-value">{myReports.length}</div>
          <div className="stat-label">Reports Submitted</div>
        </div>
      </div>

      {/* Active Work Sites (Engineering Pool Overview) */}
      {myProjects.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <div className="section-title" style={{ marginBottom: '12px', fontSize: 17, fontWeight: 700 }}>
            Active Project Deployments ({myProjects.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {myProjects.map((proj) => {
              const projTasks = myTasks.filter((t) => t.projectId === proj.id);
              const doneCount = projTasks.filter((t) => t.status === 'Completed').length;
              const openCount = projTasks.length - doneCount;
              const totalTaskProgress = projTasks.reduce((sum, t) => {
                const p = t.status === 'Completed' ? 100 : Number(t.progress) || 0;
                return sum + p;
              }, 0);
              const avgTaskProgress = projTasks.length > 0 ? Math.round(totalTaskProgress / projTasks.length) : 0;
              const r = 24;
              const circ = 2 * Math.PI * r;
              const offset = circ * (1 - avgTaskProgress / 100);

              return (
                <Link
                  key={proj.id}
                  to="/site-engineer/my-tasks"
                  className="portfolio-ring-card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 16.5, fontWeight: 700, lineHeight: 1.3 }}>{proj.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                          {proj.location || 'Active Site'} · PM: {proj.managerName || 'Operations Manager'}
                        </div>
                      </div>
                      <span className={`badge ${statusBadge(projectDisplayStatus(proj))}`}>{projectDisplayStatus(proj)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
                        <circle cx="30" cy="30" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ.toFixed(2)} strokeDashoffset={offset.toFixed(2)} />
                      </svg>
                      <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 15.5, fontWeight: 700 }}>{avgTaskProgress}% avg completion</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{doneCount} of {projTasks.length} assigned task(s) done</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your Tasks</div><div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700 }}>{projTasks.length}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Done</div><div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700, color: 'var(--green)' }}>{doneCount}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open</div><div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700 }}>{openCount}</div></div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Tasks Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="section-title">Active Assigned Tasks</div>
          <Link to="/site-engineer/my-tasks" className="btn btn-secondary btn-sm">
            View All Tasks
          </Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <p>You have no assigned tasks at the moment.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                myTasks.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.title}</strong></td>
                    <td>{t.projectName}</td>
                    <td><span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span></td>
                    <td style={{ width: '130px' }}>
                      <div className="progress-bar-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${t.progress || 0}%` }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.progress || 0}%</span>
                      </div>
                    </td>
                    <td>{formatDate(t.deadline)}</td>
                    <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                    <td>
                      <Link
                        to={`/site-engineer/update-task?id=${t.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Update
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Submitted Reports */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '14px' }}>
          Recent Site Reports
        </div>
        {myReports.length === 0 ? (
          <div className="empty-state">
            <p>You haven't submitted any site reports yet.</p>
            <Button
              variant="secondary"
              size="sm"
              style={{ marginTop: '10px' }}
              onClick={() => navigate('/site-engineer/submit-report')}
            >
              Submit Your First Report
            </Button>
          </div>
        ) : (
          myReports.slice(0, 4).map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
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
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Project: {r.projectName} · Date: {formatDate(r.date)} · Progress: {r.progress}%
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: 600 }}>
                {r.photoUrls?.length || r.photos || 0} photo(s)
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
