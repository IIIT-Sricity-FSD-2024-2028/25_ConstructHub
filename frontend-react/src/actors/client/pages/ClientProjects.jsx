import { Link } from 'react-router-dom';
import { useAppSelector, useLoad, isFirstLoad } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchProjects, selectProjectsOfClient, selectProjectsStatus, projectDisplayStatus } from '../../../features/projects/projectsSlice';
import { formatDate, statusBadgeClass } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { EmptyState } from '../../../components/marketplace/marketplaceUi';
import { Bar } from '../../../components/milestones/MilestoneUi';

/** Card list of the client's awarded / active projects. A card opens the single-project workspace. */
export default function ClientProjects() {
  const user = useAppSelector(selectCurrentUser);
  const mine = useAppSelector((state) => selectProjectsOfClient(state, user?.id));
  const status = useAppSelector(selectProjectsStatus);
  useLoad([fetchProjects]);
  const projects = isFirstLoad(status, mine.length > 0) ? null : mine;

  return (
    <div>
      <div className="page-header">
        <h1>My Active Projects</h1>
        <p>One workspace per awarded project: progress, milestones, reports, bills, feedback and messages.</p>
      </div>
      {projects === null ? (
        <div className="card">Loading...</div>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" text="Award a quotation on one of your requirements to start a project." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map((p) => (
            <Link key={p.id} to={`/client/projects/${p.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <strong style={{ fontSize: 16 }}>{p.name}</strong>
                <span className={`badge ${statusBadgeClass(projectDisplayStatus(p))}`}>{projectDisplayStatus(p)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{p.location}</div>
              {p.status === 'Awaiting Advance' && (
                <div style={{ fontSize: 12.5, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
                  Work starts after you pay the mobilization advance.
                </div>
              )}
              <Bar value={Number(p.progress) || 0} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 8 }}>
                <span>{Number(p.progress) || 0}% complete</span>
                <span>Contract {formatINR(p.contractValue ?? p.budget)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(p.startDate)} to {formatDate(p.endDate)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
