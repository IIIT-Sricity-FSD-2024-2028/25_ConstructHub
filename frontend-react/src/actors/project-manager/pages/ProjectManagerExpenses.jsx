import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CornerUpLeft, XCircle } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { inr } from '../../../components/procurement/procurementUiData';
import { ExpenseStatusBadge, ExpenseDetail, DuplicateWarning, ReceiptList } from '../../../components/expenses/ExpenseUi';

export default function ProjectManagerExpenses() {
  const toast = useToast();
  const [tab, setTab] = useState('review');
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null); // { expense, action: 'return' | 'reject' }
  const [note, setNote] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    const res = await api.getExpenseClaims();
    if (res && res.error) return setError(res.message);
    setError('');
    setClaims(res || []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function verify(e) {
    setBusy(true);
    const res = await api.verifyExpense(e.id);
    setBusy(false);
    if (res && res.error) return toast.error(res.message);
    toast.success(`${e.id} verified and sent to finance.`);
    load();
  }

  async function confirmDecision() {
    if (note.trim().length < 3) return toast.error('Please give a reason.');
    setBusy(true);
    const res = decision.action === 'return' ? await api.pmReturnExpense(decision.expense.id, note.trim()) : await api.pmRejectExpense(decision.expense.id, note.trim());
    setBusy(false);
    if (res && res.error) return toast.error(res.message);
    toast.success(`${decision.expense.id} ${decision.action === 'return' ? 'returned to the engineer' : 'rejected'}.`);
    setDecision(null);
    setNote('');
    load();
  }

  async function open(e) {
    const full = await api.getExpenseClaim(e.id);
    setDetail(full && !full.error ? full : e);
  }

  const pending = claims.filter((c) => c.status === 'submitted');
  const columns = [
    { key: 'id', label: 'Claim', render: (e) => <div><strong>{e.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.projectName}</div></div> },
    { key: 'by', label: 'Engineer', render: (e) => e.submittedByName },
    { key: 'what', label: 'What', render: (e) => <div>{e.description}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.category} · {formatDate(e.date)}</div></div> },
    { key: 'amount', label: 'Amount', align: 'right', render: (e) => <strong>{inr(e.amount)}</strong> },
    { key: 'status', label: 'Status', render: (e) => <ExpenseStatusBadge status={e.status} /> }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Expenses</h1>
        <p>Check that each claim belongs to your project and has its receipt. Verified claims go to finance for approval.</p>
      </div>
      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>To verify{pending.length ? ` (${pending.length})` : ''}</button>
        <button type="button" className={`module-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All expenses</button>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {tab === 'review' ? (
        pending.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}><h3>Nothing to verify</h3><p style={{ color: 'var(--text-muted)' }}>New claims from your site engineers appear here.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {pending.map((e) => (
              <div className="card" key={e.id} data-testid={`expense-${e.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{e.id}</strong> <span className="badge badge-gray">{e.category}</span>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{e.projectName} · {e.submittedByName} · spent on {formatDate(e.date)}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{inr(e.amount)}</div>
                </div>
                <p style={{ margin: '10px 0', fontSize: 14 }}>{e.description}</p>
                <DuplicateWarning expense={e} />
                <div style={{ margin: '10px 0' }}><ReceiptList expenseId={e.id} receipts={e.receipts} /></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => verify(e)}><CheckCircle2 size={13} /> Verify</button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => { setDecision({ expense: e, action: 'return' }); setNote(''); }}><CornerUpLeft size={13} /> Return</button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setDecision({ expense: e, action: 'reject' }); setNote(''); }}><XCircle size={13} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card"><DataTable data={claims} columns={columns} emptyMessage="No expenses yet." onRowClick={open} /></div>
      )}

      <Modal
        isOpen={!!decision}
        onClose={() => setDecision(null)}
        title={decision ? (decision.action === 'return' ? 'Return to engineer' : 'Reject expense') : ''}
        subtitle={decision ? decision.expense.id : ''}
        size="sm"
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setDecision(null)}>Cancel</button><button type="button" className={`btn ${decision?.action === 'return' ? 'btn-primary' : 'btn-danger'}`} disabled={busy} onClick={confirmDecision}>{decision?.action === 'return' ? 'Return expense' : 'Reject expense'}</button></>}
      >
        <div className="form-group">
          <label className="form-label">Reason <span className="req">*</span></label>
          <textarea className="form-textarea" rows={3} maxLength={500} aria-label="Reason" value={note} onChange={(e) => setNote(e.target.value)} placeholder="The engineer will see this." />
        </div>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Expense ${detail.id}` : ''} size="md">
        {detail && <ExpenseDetail expense={detail} />}
      </Modal>
    </div>
  );
}
