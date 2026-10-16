import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  CheckSquare,
  Calendar,
  Clock,
  Eye,
  Edit3
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function SiteEngineerMyTasks() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    loadTasks();
  }, [user]);

  async function loadTasks() {
    if (!user) return;
    const [allTasks, allProjects] = await Promise.all([
      api.getTasks(user.companyId),
      api.getProjects(user.companyId)
    ]);
    const myTasks = (allTasks || []).filter((t) => t.assignedTo === user.id);
    const enrichedTasks = myTasks.map((t) => ({
      ...t,
      projectName: t.projectName || (allProjects || []).find((p) => p.id === t.projectId)?.name || 'Commercial Construction Project'
    }));
    setTasks(enrichedTasks);

    const myProjectIds = new Set(myTasks.map((t) => t.projectId));
    setProjects((allProjects || []).filter((p) => myProjectIds.has(p.id)));
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.projectName || '').toLowerCase().includes(search.toLowerCase());
    const matchesProject = !filterProject || t.projectId === filterProject;
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesPriority = !filterPriority || t.priority === filterPriority;
    return matchesSearch && matchesProject && matchesStatus && matchesPriority;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">My Assigned Tasks</h1>
        <p className="page-subtitle">View and update progress on all tasks assigned to you across company projects</p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search my tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '260px' }}
        />
        {projects.length > 1 && (
          <select
            className="form-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: '160px' }}
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
          style={{ maxWidth: '160px' }}
        >
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Task Cards */}
      <div id="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CheckSquare size={32} /></div>
            <h3>No tasks found</h3>
            <p>You have no tasks matching the selected filters.</p>
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
                onClick={() => navigate(`/site-engineer/tasks/${t.id}`)}
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
                  Project: {t.projectName}
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
                    <Calendar size={14} /> Due: {formatDate(t.deadline)}
                  </span>
                  <div
                    className="actions"
                    style={{ display: 'flex', gap: '6px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      to={`/site-engineer/update-task?id=${t.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      <Edit3 size={13} style={{ marginRight: '4px' }} /> Update Status
                    </Link>
                    <Link
                      to={`/site-engineer/tasks/${t.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
