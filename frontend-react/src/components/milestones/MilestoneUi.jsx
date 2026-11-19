import { AlertTriangle } from 'lucide-react';
import { formatDate } from '../../services/utils';

const STATUS_BADGE = {
  Pending: 'badge-gray',
  'In Progress': 'badge-blue',
  'Ready for Review': 'badge-orange',
  Completed: 'badge-green'
};

export function MilestoneStatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`}>{status === 'Completed' ? 'Approved' : status}</span>;
}

export function DelayBadge({ milestone }) {
  if (!milestone.delayed) return null;
  return (
    <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <AlertTriangle size={11} /> {milestone.daysLate} day{milestone.daysLate === 1 ? '' : 's'} late
    </span>
  );
}

export function Bar({ value, height = 8, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-bar-fill" style={{ width: `${v}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

/**
 * The two project numbers side by side:
 *  - physical progress: weighted by milestone size (how much of the building is done)
 *  - milestone completion: how many milestones the project manager has verified and approved
 */
export function ProgressSummary({ summary }) {
  const manual = summary.mode !== 'milestones';
  const stat = (label, value, sub, bar) => (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>{value}%</div>
      <Bar value={value} height={8} color={bar} />
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {stat('Physical progress (weighted)', summary.physicalProgress, manual ? 'Entered manually - no milestones planned yet' : `Weighted by milestone size · ${summary.weightAllocated}% of the project planned`)}
        {!manual && stat('Milestones approved', summary.milestoneCompletion, `${summary.milestonesApproved} of ${summary.milestonesTotal} verified by the project manager`, 'var(--green)')}
      </div>
      {!manual && summary.weightAllocated < 100 && (
        <p style={{ fontSize: 12, color: 'var(--orange, #c2410c)', marginTop: 10 }}>
          Only {summary.weightAllocated}% of the project is covered by milestones, so progress cannot reach 100% until the rest is planned.
        </p>
      )}
      {!manual && summary.delayedMilestones > 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} /> {summary.delayedMilestones} milestone{summary.delayedMilestones === 1 ? ' is' : 's are'} behind schedule.
        </p>
      )}
    </div>
  );
}

/** Read-only milestone list (client view). */
export function MilestoneList({ milestones }) {
  if (!milestones.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>The contractor has not published a milestone plan yet.</p>;
  }
  return (
    <div className="hairline-list">
      {milestones.map((m) => (
        <div key={m.id} className="hairline-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <div>
              <strong>{m.name}</strong>{' '}
              <MilestoneStatusBadge status={m.status} /> <DelayBadge milestone={m} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Due {formatDate(m.deadline)} · {m.weight}% of project{m.approvedAt ? ` · approved ${formatDate(m.approvedAt)}` : ''}
              </div>
            </div>
            <strong style={{ fontSize: 16 }}>{m.progress}%</strong>
          </div>
          <Bar value={m.progress} color={m.status === 'Completed' ? 'var(--green)' : undefined} />
          {m.description && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>{m.description}</p>}
        </div>
      ))}
    </div>
  );
}
