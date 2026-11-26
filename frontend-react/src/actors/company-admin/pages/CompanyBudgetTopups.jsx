import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, isFirstLoad, errorText } from '../../../store/hooks';
import {
  fetchBudgetTopups, approveBudgetTopup, rejectBudgetTopup, selectAllBudgetTopups, selectBudgetTopupsStatus
} from '../../../features/finance/financeSlice';
import { fetchProjects } from '../../../features/projects/projectsSlice';
import { Check, X } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import { EmptyState } from '../../../components/marketplace/marketplaceUi';

const BADGE = { pending: 'badge-orange', approved: 'badge-green', rejected: 'badge-red' };

/** Contingency top-ups: the Finance Manager asks, the Company Admin releases money from the project's profit margin. */
export default function CompanyBudgetTopups() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectAllBudgetTopups);
  const status = useAppSelector(selectBudgetTopupsStatus);
  const rows = isFirstLoad(status, list.length > 0) ? null : list;
  const error = useAppSelector((state) => state.finance.topups.error) || '';
  const [target, setTarget] = useState(null); // { topup, action: 'approve' | 'reject' }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useLoad([fetchBudgetTopups]);

  async function decide() {
    const reject = target.action === 'reject';
    if (reject && note.trim().length < 3) return toast.error('Give a short reason for rejecting.');
    setBusy(true);
    try {
      await dispatch(reject
        ? rejectBudgetTopup({ id: target.topup.id, note: note.trim() })
        : approveBudgetTopup({ id: target.topup.id, note: note.trim() || undefined })).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
    if (!reject) dispatch(fetchProjects()); // the project's site budget went up
    toast.success(reject ? 'Request rejected.' : `${formatINR(target.topup.amount)} moved from profit to the site budget.`);
    setTarget(null);
    setNote('');
  }

  const pending = (rows || []).filter((r) => r.status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <h1>Budget Top-ups {pending > 0 && <span className="badge badge-orange">{pending} waiting</span>}</h1>
        <p>Approving a request raises the project's site budget and lowers your profit margin by the same amount. The client's contract value does not change.</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      {rows === null ? (
        <div className="card">Loading...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No top-up requests" text="When a Finance Manager needs more site budget they will ask here." />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 820 }}>
            <thead>
              <tr><th>Request</th><th>Project</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Site budget</th><th style={{ textAlign: 'right' }}>Profit margin left</th><th>Reason</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.requestedByName} · {formatDate(t.requestedAt)}</div></td>
                  <td>{t.projectName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(t.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(t.currentBudget)}</td>
                  <td style={{ textAlign: 'right' }}>{t.profitMargin !== undefined ? formatINR(t.profitMargin) : '-'}</td>
                  <td style={{ maxWidth: 260, fontSize: 13 }}>{t.reason}{t.decisionNote ? <div style={{ color: 'var(--text-muted)' }}>Decision: {t.decisionNote}</div> : null}</td>
                  <td><span className={`badge ${BADGE[t.status]}`}>{t.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {t.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-success btn-sm" onClick={() => { setNote(''); setTarget({ topup: t, action: 'approve' }); }}><Check size={13} /> Approve</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { setNote(''); setTarget({ topup: t, action: 'reject' }); }}><X size={13} /> Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        title={target?.action === 'reject' ? 'Reject top-up request' : 'Approve top-up request'}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTarget(null)}>Cancel</button>
            <button type="button" className={`btn ${target?.action === 'reject' ? 'btn-danger' : 'btn-success'}`} disabled={busy} onClick={decide}>
              {target?.action === 'reject' ? 'Reject' : 'Approve and release funds'}
            </button>
          </>
        }
      >
        {target && (
          <div>
            <p style={{ marginBottom: 10, lineHeight: 1.6 }}>
              {target.action === 'approve'
                ? `${formatINR(target.topup.amount)} will move from the profit margin of "${target.topup.projectName}" to its site budget.`
                : `The Finance Manager will be told why ${formatINR(target.topup.amount)} was not released.`}
            </p>
            <div className="form-group">
              <label className="form-label">{target.action === 'reject' ? 'Reason' : 'Note (optional)'}{target.action === 'reject' && <span className="req"> *</span>}</label>
              <textarea className="form-textarea" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
