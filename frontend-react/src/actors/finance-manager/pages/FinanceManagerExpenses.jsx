import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchExpenseClaims, fetchExpenseClaim, approveExpense, fmReturnExpense, fmRejectExpense, reimburseExpense,
  selectAllExpenses, selectExpenseById
} from '../../../features/expenses/expensesSlice';
import { CheckCircle2, CornerUpLeft, XCircle, Banknote } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { inr } from '../../../components/procurement/procurementUiData';
import { ExpenseStatusBadge, ReimbursementBadge, ExpenseDetail } from '../../../components/expenses/ExpenseUi';

const isWorkflow = (e) => !(e.history || []).some((h) => h.step === 'recorded'); // older demo expenses were company-paid

export default function FinanceManagerExpenses() {
  const toast = useToast();
  const [tab, setTab] = useState('approve');
  const dispatch = useAppDispatch();
  const claims = useAppSelector(selectAllExpenses);
  const error = useAppSelector((state) => state.expenses.error) || '';
  // The open claim is kept as an id; the store holds the full record (with its budget check) once fetched.
  const [detailId, setDetailId] = useState(null);
  const detail = useAppSelector((state) => (detailId ? selectExpenseById(state, detailId) : null)) || null;
  const setDetail = (e) => setDetailId(e ? e.id : null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  useLoad([fetchExpenseClaims]);

  async function open(e) {
    try {
      await dispatch(fetchExpenseClaim(e.id)).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    }
    setNote('');
    setReference('');
    setActionError('');
    setDetail(e);
  }

  /** Dispatches one decision; the store updates the claim, so the tabs re-sort themselves. */
  async function run(action, okMessage) {
    setActionError('');
    setBusy(true);
    try {
      await dispatch(action).unwrap();
    } catch (err) {
      return setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(okMessage);
    setDetail(null);
  }

  const toApprove = claims.filter((c) => c.status === 'pm_verified');
  const toReimburse = claims.filter((c) => c.status === 'approved' && !c.reimbursement && isWorkflow(c));
  const rows = tab === 'approve' ? toApprove : tab === 'reimburse' ? toReimburse : claims;

  const columns = [
    { key: 'id', label: 'Claim', render: (e) => <div><strong>{e.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.projectName}</div></div> },
    { key: 'by', label: 'Engineer', render: (e) => e.submittedByName },
    { key: 'what', label: 'What', render: (e) => <div>{e.description}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.category} · {formatDate(e.date)}</div></div> },
    { key: 'amount', label: 'Amount', align: 'right', render: (e) => <strong>{inr(e.amount)}</strong> },
    { key: 'dup', label: '', render: (e) => (e.duplicateOf && e.duplicateOf.length ? <span className="badge badge-red">Possible duplicate</span> : null) },
    { key: 'status', label: 'Status', render: (e) => <span><ExpenseStatusBadge status={e.status} /><ReimbursementBadge expense={e} /></span> }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Expenses</h1>
        <p>Approve verified claims. Only approved expenses count as project spend. Paying the engineer back is a separate step.</p>
      </div>
      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'approve' ? 'active' : ''}`} onClick={() => setTab('approve')}>To approve{toApprove.length ? ` (${toApprove.length})` : ''}</button>
        <button type="button" className={`module-tab ${tab === 'reimburse' ? 'active' : ''}`} onClick={() => setTab('reimburse')}>To reimburse{toReimburse.length ? ` (${toReimburse.length})` : ''}</button>
        <button type="button" className={`module-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All expenses</button>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card">
        <DataTable data={rows} columns={columns} emptyMessage={tab === 'approve' ? 'No expenses are waiting for your approval.' : tab === 'reimburse' ? 'Nothing to reimburse.' : 'No expenses yet.'} onRowClick={open} />
      </div>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Expense ${detail.id}` : ''}
        size="lg"
        footer={detail && detail.status === 'pm_verified' ? (
          <>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(fmReturnExpense({ id: detail.id, note: note.trim() }), `${detail.id} returned to the engineer.`)}><CornerUpLeft size={14} /> Return</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(fmRejectExpense({ id: detail.id, note: note.trim() }), `${detail.id} rejected.`)}><XCircle size={14} /> Reject</button>
            <button type="button" className="btn btn-success" disabled={busy} onClick={() => run(approveExpense({ id: detail.id, note: note.trim() || undefined }), `${detail.id} approved and added to project spend.`)}><CheckCircle2 size={14} /> Approve</button>
          </>
        ) : detail && detail.status === 'approved' && !detail.reimbursement && isWorkflow(detail) ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(reimburseExpense({ id: detail.id, reference: reference.trim() || undefined }), `${detail.id} marked as reimbursed.`)}><Banknote size={14} /> Mark as reimbursed</button>
        ) : undefined}
      >
        {detail && (
          <>
            <ExpenseDetail expense={detail} showBudget />
            {actionError && <div className="error-msg" style={{ display: 'block', marginTop: 12 }}>{actionError}</div>}
            {detail.status === 'pm_verified' && (
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Note (required to return or reject, or to approve beyond what the budget has left)</label>
                <textarea className="form-textarea" rows={2} maxLength={500} aria-label="Decision note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            {detail.status === 'approved' && !detail.reimbursement && isWorkflow(detail) && (
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Payment reference (UPI id, transfer no.)</label>
                <input className="form-input" aria-label="Payment reference" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
