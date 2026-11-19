import { useState } from 'react';
import { FileText, Download, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../services/utils';
import { useToast } from '../../hooks/useToast';
import { inr } from '../procurement/procurementUiData';

const BADGE = { submitted: 'badge-orange', pm_verified: 'badge-blue', approved: 'badge-green', rejected: 'badge-red', returned: 'badge-orange', cancelled: 'badge-gray' };
const LABEL = { submitted: 'Awaiting PM verification', pm_verified: 'Awaiting finance approval', approved: 'Approved', rejected: 'Rejected', returned: 'Returned for correction', cancelled: 'Withdrawn' };
const STEP = { submitted: 'Submitted', resubmitted: 'Resubmitted', pm_verified: 'Verified by project manager', approved: 'Approved by finance', rejected: 'Rejected', returned: 'Returned', cancelled: 'Withdrawn', reimbursed: 'Reimbursed', recorded: 'Recorded (before approvals existed)' };

export function ExpenseStatusBadge({ status }) {
  return <span className={`badge ${BADGE[status] || 'badge-gray'}`}>{LABEL[status] || status}</span>;
}

export function ReimbursementBadge({ expense }) {
  if (expense.status !== 'approved') return null;
  if (expense.reimbursement) return <span className="badge badge-green" style={{ marginLeft: 6 }}>Reimbursed</span>;
  if ((expense.history || []).some((h) => h.step === 'recorded')) return null;
  return <span className="badge badge-orange" style={{ marginLeft: 6 }}>Not reimbursed yet</span>;
}

export function DuplicateWarning({ expense }) {
  if (!expense.duplicateOf || expense.duplicateOf.length === 0) return null;
  return (
    <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertTriangle size={15} /> Possible duplicate: same project, category, amount and date as {expense.duplicateOf.join(', ')}.
    </div>
  );
}

/** Who did what, in order. */
export function ExpenseTimeline({ history }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {history.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
          <div>
            <strong>{STEP[h.step] || h.step}</strong> <span style={{ color: 'var(--text-muted)' }}>by {h.byName} · {formatDate(h.at)}</span>
            {h.note && <div style={{ color: 'var(--text-muted)' }}>{h.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Receipts are private files: downloaded with the login token. */
export function ReceiptList({ expenseId, receipts }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  async function download(r) {
    setBusy(r.id);
    const res = await api.downloadExpenseReceipt(expenseId, r);
    setBusy('');
    if (res && res.error) toast.error(res.message);
  }
  if (!receipts || receipts.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No receipts attached.</p>;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {receipts.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}><FileText size={15} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.originalName}</span></span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy === r.id} onClick={() => download(r)}><Download size={13} /> {busy === r.id ? '...' : 'Download'}</button>
        </div>
      ))}
    </div>
  );
}

/** Facts + receipts + history of one expense (shared by the engineer, PM and finance screens). */
export function ExpenseDetail({ expense: e, showBudget = false }) {
  const bc = e.budgetCheck;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <ExpenseStatusBadge status={e.status} /><ReimbursementBadge expense={e} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{e.id} · {e.projectName} · {e.category} · {formatDate(e.date)} · by {e.submittedByName}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{inr(e.amount)}</div>
      <p style={{ fontSize: 14 }}>{e.description}</p>
      <DuplicateWarning expense={e} />
      <div><strong style={{ fontSize: 13 }}>Receipts</strong><div style={{ marginTop: 6 }}><ReceiptList expenseId={e.id} receipts={e.receipts} /></div></div>
      {showBudget && bc && (
        <div data-testid="budget-check" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <strong style={{ fontSize: 13 }}>Project budget position</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 8, fontSize: 13 }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Budget</div>{inr(bc.budget)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Spent (approved)</div>{inr(bc.spent)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Committed (POs)</div>{inr(bc.committed)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Available</div><strong style={{ color: bc.exceedsBudget ? 'var(--red)' : 'var(--green)' }}>{inr(bc.available)}</strong></div>
          </div>
          {bc.exceedsBudget && e.status !== 'approved' && <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>This expense is more than what is left. Approving needs a written note, and it cannot take spending above the total budget.</p>}
        </div>
      )}
      <div><strong style={{ fontSize: 13 }}>History</strong><div style={{ marginTop: 6 }}><ExpenseTimeline history={e.history || []} /></div></div>
      {e.reimbursement && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reimbursed by {e.reimbursement.paidByName} on {formatDate(e.reimbursement.paidAt)}{e.reimbursement.reference ? ` (ref ${e.reimbursement.reference})` : ''}.</p>}
    </div>
  );
}
