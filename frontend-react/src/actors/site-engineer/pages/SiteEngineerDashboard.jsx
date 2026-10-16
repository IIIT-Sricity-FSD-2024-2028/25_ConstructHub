import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  FileText,
  Edit3,
  Send,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function SiteEngineerDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [myTasks, setMyTasks] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [myProjects, setMyProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allTasks, allReports, allProjects] = await Promise.all([
      api.getTasks(user.companyId),
      api.getReports(user.companyId),
      api.getProjects(user.companyId)
    ]);

    const tasks = (allTasks || []).filter((t) => t.assignedTo === user.id);
    setMyTasks(tasks);

    // Derive active projects from assigned tasks (Option 2 pool-based)
    const taskProjIds = new Set(tasks.map((t) => t.projectId));
    let projectsInvolved = (allProjects || []).filter((p) => taskProjIds.has(p.id));
    if (projectsInvolved.length === 0 && tasks.length === 0) {
      projectsInvolved = (allProjects || []).filter((p) => p.siteEngineerId === user.id);
    }
    setMyProjects(projectsInvolved);

    const reports = (allReports || []).filter((r) => r.submittedBy === user.id);
    reports.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setMyReports(reports);
  }

  const completedCount = myTasks.filter((t) => t.status === 'Completed').length;
  const pendingCount = myTasks.filter((t) => t.status !== 'Completed').length;

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
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="section-title" style={{ marginBottom: '12px', fontSize: 15, fontWeight: 700 }}>
            Active Project Deployments ({myProjects.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {myProjects.map((proj) => {
              const projTasks = myTasks.filter((t) => t.projectId === proj.id);
              const doneCount = projTasks.filter((t) => t.status === 'Completed').length;
              const totalTaskProgress = projTasks.reduce((sum, t) => {
                const p = t.status === 'Completed' ? 100 : Number(t.progress) || 0;
                return sum + p;
              }, 0);
              const avgTaskProgress = projTasks.length > 0 ? Math.round(totalTaskProgress / projTasks.length) : 0;

              return (
                <div
                  key={proj.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{proj.name}</strong>
                    <span className={`badge ${statusBadge(proj.status)}`}>{proj.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Location: {proj.location || 'Active Site'} · PM: {proj.managerName || 'Operations Manager'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Your Tasks: <strong>{doneCount}/{projTasks.length} done</strong></span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{avgTaskProgress}% avg completion</span>
                  </div>
                  <div className="progress-track" style={{ height: 6 }}>
                    <div className="progress-fill" style={{ width: `${avgTaskProgress}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
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
