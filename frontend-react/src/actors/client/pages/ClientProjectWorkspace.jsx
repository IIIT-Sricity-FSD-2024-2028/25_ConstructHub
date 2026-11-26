import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAppSelector, useLoad, isFirstLoad } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchProjects, selectProjectById, selectProjectsStatus, projectDisplayStatus } from '../../../features/projects/projectsSlice';
import { fetchProjectProgress, selectProjectProgress } from '../../../features/milestones/milestonesSlice';
import { fetchReports, selectReportsByProject } from '../../../features/reports/reportsSlice';
import { fetchBills, selectBillsOfProject } from '../../../features/bills/billsSlice';
import { fetchProjectTeam, selectProjectTeamIds } from '../../../features/tasks/tasksSlice';
import { ArrowLeft } from 'lucide-react';
import { formatDate, statusBadgeClass } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import MessagesChat from '../../../components/common/MessagesChat';
import { ProgressSummary, MilestoneList } from '../../../components/milestones/MilestoneUi';
import ClientFeedback from './ClientFeedback';

const TABS = [
  ['overview', 'Overview'], ['milestones', 'Milestones'], ['reports', 'Site Reports'],
  ['bills', 'Bills & Payments'], ['feedback', 'Feedback'], ['messages', 'Messages'],
];

/** Everything about one awarded project, scoped to that project only. */
export default function ClientProjectWorkspace() {
  const { projectId } = useParams();
  const user = useAppSelector(selectCurrentUser);
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';

  const found = useAppSelector((state) => selectProjectById(state, projectId));
  const project = found && found.clientId === user?.id ? found : null;
  const projectsStatus = useAppSelector(selectProjectsStatus);
  const notFound = !project && !isFirstLoad(projectsStatus, false);
  const progress = useAppSelector((state) => selectProjectProgress(state, projectId));
  const reports = useAppSelector((state) => selectReportsByProject(state, projectId));
  const bills = useAppSelector((state) => selectBillsOfProject(state, projectId));
  const contactIds = useAppSelector((state) => selectProjectTeamIds(state, projectId)); // its PM, FM and engineers with tasks on it

  useLoad([fetchProjects, fetchReports, fetchBills, [fetchProjectProgress, projectId], [fetchProjectTeam, projectId]], [projectId]);

  if (notFound) {
    return (
      <div>
        <Link to="/client/projects" className="back-link"><ArrowLeft size={14} /> Back to projects</Link>
        <div className="error-msg" style={{ display: 'block', marginTop: 12 }}>Project not found.</div>
      </div>
    );
  }
  if (!project) return <div className="card">Loading...</div>;

  const advanceBill = bills.find((b) => b.billType === 'advance' && b.outstanding > 0);
  const paid = bills.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0);

  return (
    <div>
      <Link to="/client/projects" className="back-link" style={{ marginBottom: 8 }}><ArrowLeft size={14} /> Back to projects</Link>
      <div className="page-header" style={{ marginTop: 10 }}>
        <h1>{project.name} <span className={`badge ${statusBadgeClass(projectDisplayStatus(project))}`}>{projectDisplayStatus(project)}</span></h1>
        <p>{project.location} · {formatDate(project.startDate)} to {formatDate(project.endDate)}</p>
      </div>

      {advanceBill && project.status === 'Awaiting Advance' && (
        <div className="card" style={{ marginBottom: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <strong>Pay the mobilization advance to start work.</strong>
          <div style={{ fontSize: 13.5, margin: '4px 0 10px' }}>
            {advanceBill.billNumber}: {formatINR(advanceBill.outstanding)} outstanding. Tasks and material purchases stay locked until it is paid in full.
          </div>
          <Link to={`/client/bills/${advanceBill.id}/pay`} className="btn btn-primary btn-sm">
            Pay Now ({formatINR(advanceBill.outstanding)})
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams({ tab: key })}
            style={{
              background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
              fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 14 }}>
            <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Contract value</div><div style={{ fontSize: 18, fontWeight: 800 }}>{formatINR(project.contractValue ?? project.budget)}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paid so far</div><div style={{ fontSize: 18, fontWeight: 800 }}>{formatINR(paid)}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Physical progress</div><div style={{ fontSize: 18, fontWeight: 800 }}>{Number(project.progress) || 0}%</div></div>
          </div>
          {project.description && <p style={{ lineHeight: 1.6, color: 'var(--text-muted)' }}>{project.description}</p>}
          {progress && <div style={{ marginTop: 14 }}><ProgressSummary summary={progress} /></div>}
        </div>
      )}

      {tab === 'milestones' && <div className="card"><MilestoneList milestones={progress?.milestones || []} /></div>}

      {tab === 'reports' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {reports.length === 0 && <div className="card" style={{ color: 'var(--text-muted)' }}>No site reports have been shared yet.</div>}
          {reports.map((r) => (
            <Link key={r.id} to={`/client/reports/${r.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{r.title}</strong> <span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(r.date)} · Progress {r.progress}%</div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'bills' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          {bills.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No bills yet.</p> : (
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead><tr><th>Bill</th><th>For</th><th style={{ textAlign: 'right' }}>Amount</th><th>Decision</th><th>Payment</th><th style={{ textAlign: 'right' }}>Outstanding</th><th /></tr></thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td><Link to={`/client/bills/${b.id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{b.billNumber}</Link></td>
                    <td>{b.milestone}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(b.amount)}</td>
                    <td><span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span></td>
                    <td>{b.paymentStatus}</td>
                    <td style={{ textAlign: 'right' }}>{b.status === 'Accepted' ? formatINR(b.outstanding) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {b.status === 'Pending Decision' && (
                          <Link to={`/client/bills/${b.id}`} className="btn btn-secondary btn-sm">Review / Decide</Link>
                        )}
                        {b.status === 'Accepted' && Number(b.outstanding ?? 0) > 0 && b.paymentStatus !== 'Paid' && (
                          <Link to={`/client/bills/${b.id}/pay`} className="btn btn-primary btn-sm">Pay Now</Link>
                        )}
                        {b.paymentStatus === 'Paid' && (
                          <Link to={`/client/bills/${b.id}`} className="btn btn-secondary btn-sm">Receipt</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'feedback' && <ClientFeedback projectId={projectId} />}
      {tab === 'messages' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>You can message the people working on this project: its project manager, finance manager and site engineers.</p>
          {contactIds === null ? <div className="card">Loading...</div> : <MessagesChat user={user} contactIds={contactIds} />}
        </div>
      )}
    </div>
  );
}
