import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Package,
  Camera
} from 'lucide-react';
import { api, API_ORIGIN } from '../../../services/api';
import { ProgressSummary, MilestoneList } from '../../../components/milestones/MilestoneUi';
import {
  formatCurrency,
  formatDate,
  statusBadge
} from '../../../services/utils';

export default function ClientProjectProgress() {
  const { user } = useOutletContext();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [progress, setProgress] = useState(null);
  const [billedToDate, setBilledToDate] = useState(0);



  async function loadData() {
    if (!user) return;
    const [allProjects, allTasks, allReports, allBills] = await Promise.all([
      api.getProjects(user.companyId),
      api.getTasks(user.companyId),
      api.getReports(user.companyId),
      api.getBills()
    ]);

    // A client can have several projects (one per awarded requirement).
    const mine = (allProjects || []).filter(
      (p) => p.clientId === user.id || p.clientEmail === user.email || p.clientName === user.name
    );
    setMyProjects(mine);
    const activeProject = mine.find((p) => p.id === selectedId) || mine[0] || (allProjects && allProjects[0]) || null;
    setProject(activeProject);

    // What the client has been invoiced so far (declined bills do not count). The contractor's internal spend is never shown here.
    setBilledToDate((allBills || [])
      .filter((b) => activeProject && b.projectId === activeProject.id && !['declined', 'rejected'].includes(String(b.status || '').toLowerCase()))
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0));

    if (activeProject) {
      const prog = await api.getProjectProgress(activeProject.id);
      setProgress(prog && !prog.error ? prog : null);
      const projTasks = (allTasks || []).filter((t) => t.projectId === activeProject.id);
      setTasks(projTasks);

      const projReports = (allReports || []).filter((r) => r.projectId === activeProject.id);
      setReports(projReports);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, [user, selectedId]);

  if (!project) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3>No project found</h3>
          <p style={{ color: 'var(--text-muted)' }}>You do not currently have any active project.</p>
        </div>
      </div>
    );
  }

  // Aggregate all photo URLs from reports
  const allPhotos = [];
  reports.forEach((r) => {
    if (Array.isArray(r.photoUrls)) {
      r.photoUrls.forEach((url) => allPhotos.push({ url, title: r.title, date: r.date }));
    }
  });

  return (
    <div className="page-container">
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{project.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Package size={14} /> {project.location}
            </span>
            <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {myProjects.length > 1 && (
            <select className="form-select" value={project.id} onChange={(e) => setSelectedId(e.target.value)} aria-label="Project">
              {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <Link to="/client/feedback" className="btn btn-secondary">
            Give Feedback
          </Link>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Overall Construction Progress</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{project.progress || 0}%</span>
        </div>
        <div className="progress-bar" style={{ height: '10px' }}>
          <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%` }}></div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)'
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Contract Value</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{formatCurrency(project.contractValue ?? project.budget)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Billed to Date</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{formatCurrency(billedToDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Still to be Billed</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
              {formatCurrency(Math.max(0, (project.contractValue ?? project.budget ?? 0) - billedToDate))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Completion</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{formatDate(project.endDate)}</div>
          </div>
        </div>
      </div>

      {/* Milestone plan: weighted physical progress vs. milestones approved */}
      {progress && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="section-title" style={{ marginBottom: '14px' }}>Progress & Milestones</div>
          <ProgressSummary summary={progress} />
          <div style={{ marginTop: 18 }}>
            <MilestoneList milestones={progress.milestones} />
          </div>
        </div>
      )}

      {/* Milestones / Tasks Table */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title" style={{ marginBottom: '14px' }}>Project Tasks & Milestones</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task / Phase</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state"><p>No specific tasks logged yet.</p></div>
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.title}</strong></td>
                    <td>{formatDate(t.deadline)}</td>
                    <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                    <td style={{ width: '160px' }}>
                      <div className="progress-bar-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Photo Gallery */}
      <div className="card">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Camera size={18} /> Site Photos Gallery ({allPhotos.length})
        </div>
        {allPhotos.length === 0 ? (
          <div className="empty-state">
            <p>No site inspection photos have been uploaded for your project yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            {allPhotos.map((p, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)'
                }}
              >
                <img
                  src={p.url.startsWith('http') || p.url.startsWith('blob:') ? p.url : `${API_ORIGIN}${p.url}`}
                  alt={`Site photo ${idx + 1}`}
                  style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div style="height:150px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;">Photo ${idx + 1}</div>`;
                  }}
                />
                <div style={{ padding: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <div>{p.title}</div>
                  <div>{formatDate(p.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
