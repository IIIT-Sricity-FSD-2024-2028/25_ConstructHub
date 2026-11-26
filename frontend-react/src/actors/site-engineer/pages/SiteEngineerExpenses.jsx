import { useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchExpenseClaims, fetchExpenseClaim, submitExpense, resubmitExpense, withdrawExpense, uploadExpenseReceipts,
  selectAllExpenses, selectExpenseById
} from '../../../features/expenses/expensesSlice';
import { fetchProjects, selectSiteWorkProjects } from '../../../features/projects/projectsSlice';
import { fetchProjectProgress, selectProjectProgress } from '../../../features/milestones/milestonesSlice';
import { Plus, Paperclip } from 'lucide-react';
import { formatDate, localDateISO } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { inr } from '../../../components/procurement/procurementUiData';
import { ExpenseStatusBadge, ReimbursementBadge, ExpenseDetail } from '../../../components/expenses/ExpenseUi';
import { EXPENSE_CATEGORIES } from '../../../components/expenses/expenseUiData';

const today = () => localDateISO();
const PETTY_CAP = 10000; // bulk purchases go through Procurement POs
const blank = (projectId = '') => ({ projectId, milestoneId: '', category: 'Materials', amount: '', date: today(), description: '' });

export default function SiteEngineerExpenses() {
  const toast = useToast();
  const fileInput = useRef(null);
  const dispatch = useAppDispatch();
  const claims = useAppSelector(selectAllExpenses);
  const error = useAppSelector((state) => state.expenses.error) || '';
  // Only projects where this engineer still has unfinished work on a running project (the server enforces the same rule).
  const projects = useAppSelector(selectSiteWorkProjects);
  const [form, setForm] = useState(null); // null | { ...fields, editingId? }
  const [files, setFiles] = useState([]);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const detail = useAppSelector((state) => (detailId ? selectExpenseById(state, detailId) : null)) || null;
  const setDetail = (e) => setDetailId(e ? e.id : null);
  const formProjectId = form?.projectId || '';
  // Open milestones of the project chosen in the form (an expense is booked against one of them).
  const formProgress = useAppSelector((state) => selectProjectProgress(state, formProjectId));
  const milestones = useMemo(() => (formProjectId && formProgress?.milestones ? formProgress.milestones.filter((m) => m.status !== 'Completed') : []), [formProjectId, formProgress]);

  useLoad([fetchExpenseClaims, fetchProjects]);
  useLoad([formProjectId && [fetchProjectProgress, formProjectId]], [formProjectId]);

  function openNew() {
    setForm(blank(projects[0]?.id || ''));
    setFiles([]);
    setFormError('');
  }
  function openEdit(e) {
    setDetail(null);
    setForm({ projectId: e.projectId, milestoneId: e.milestoneId || '', category: e.category, amount: String(e.amount), date: e.date, description: e.description, editingId: e.id });
    setFiles([]);
    setFormError('');
  }

  async function save(ev) {
    ev.preventDefault();
    setFormError('');
    if (!form.projectId) return setFormError('Choose the project.');
    const amount = Number(form.amount);
    if (!(amount > 0)) return setFormError('Enter the amount spent.');
    if (amount > PETTY_CAP) return setFormError(`A petty claim can be at most ₹${PETTY_CAP.toLocaleString('en-IN')}. For larger purchases ask the Storekeeper to raise a purchase order.`);
    if (milestones.length > 0 && !form.milestoneId) return setFormError('Select the milestone this expense belongs to.');
    if (!/^\d+(\.\d{1,2})?$/.test(String(form.amount))) return setFormError('The amount can have at most 2 decimals.');
    if (!form.date || form.date > today()) return setFormError('Choose the date you spent the money (not in the future).');
    if (form.description.trim().length < 3) return setFormError('Describe what the money was spent on.');
    const payload = { projectId: form.projectId, milestoneId: form.milestoneId || undefined, category: form.category, amount, date: form.date, description: form.description.trim() };
    setBusy(true);
    let res;
    try {
      res = await dispatch(form.editingId
        ? resubmitExpense({ id: form.editingId, changes: payload })
        : submitExpense(payload)).unwrap();
      if (files.length > 0) {
        await dispatch(uploadExpenseReceipts({ id: res.id, files })).unwrap()
          .catch((err) => toast.error(`Saved, but the receipt could not be attached: ${errorText(err)}`));
      }
    } catch (err) {
      return setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(form.editingId ? `${res.id} corrected and resubmitted.` : `${res.id} sent to your project manager.`);
    setForm(null);
  }

  async function withdraw(e) {
    try {
      await dispatch(withdrawExpense(e.id)).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    }
    toast.success('Expense withdrawn.');
    setDetail(null);
  }

  async function addReceipts(e, list) {
    if (!list || list.length === 0) return;
    try {
      await dispatch(uploadExpenseReceipts({ id: e.id, files: list })).unwrap(); // the open detail shows it at once
    } catch (err) {
      return toast.error(errorText(err));
    }
    toast.success('Receipt attached.');
  }

  async function open(e) {
    setDetail(e);
    dispatch(fetchExpenseClaim(e.id));
  }

  const columns = [
    { key: 'id', label: 'Claim', render: (e) => <div><strong>{e.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.projectName}</div></div> },
    { key: 'what', label: 'What', render: (e) => <div>{e.description}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.category} · {formatDate(e.date)}</div></div> },
    { key: 'amount', label: 'Amount', align: 'right', render: (e) => <strong>{inr(e.amount)}</strong> },
    { key: 'rc', label: 'Receipts', render: (e) => (e.receipts.length ? <span><Paperclip size={12} /> {e.receipts.length}</span> : '—') },
    { key: 'status', label: 'Status', render: (e) => <span><ExpenseStatusBadge status={e.status} /><ReimbursementBadge expense={e} /></span> }
  ];
  const returned = claims.filter((c) => c.status === 'returned').length;

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>My Expenses</h1>
          <p>Claim money you spent on site. Your project manager verifies it, finance approves it.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew} disabled={projects.length === 0}><Plus size={15} /> New expense</button>
      </div>
      {projects.length === 0 && (
        <div className="form-hint" style={{ marginBottom: 12 }}>
          You have no unfinished tasks on any project, so you cannot claim new expenses right now. Your project manager assigns tasks.
        </div>
      )}
      {returned > 0 && <div className="error-msg" style={{ display: 'block' }}>{returned} expense(s) were returned to you. Open them, correct the details and resubmit.</div>}
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card"><DataTable data={claims} columns={columns} emptyMessage="You have not submitted any expenses yet." onRowClick={open} /></div>

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.editingId ? `Correct ${form.editingId}` : 'New expense claim'} size="md">
        {form && (
          <form onSubmit={save}>
            {formError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{formError}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Project <span className="req">*</span></label>
                <select className="form-select" aria-label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, milestoneId: '' })}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Milestone {milestones.length > 0 && <span className="req">*</span>}</label>
                <select className="form-select" aria-label="Milestone" value={form.milestoneId} onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}>
                  <option value="">{milestones.length > 0 ? 'Select milestone' : 'No milestones on this project'}</option>
                  {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount (₹) <span className="req">*</span></label>
                <input className="form-input" aria-label="Amount" type="number" min="0" max={PETTY_CAP} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maximum ₹{PETTY_CAP.toLocaleString('en-IN')} per claim. A receipt is needed above ₹1,000.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Date spent <span className="req">*</span></label>
                <input className="form-input" aria-label="Date spent" type="date" max={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span className="req">*</span></label>
              <textarea className="form-textarea" aria-label="Description" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was it for?" />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt (PDF or photo, needed above ₹1,000)</label>
              <input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFiles(Array.from(e.target.files || []))} data-testid="receipt-input" />
              {files.length > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{files.map((f) => f.name).join(', ')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : form.editingId ? 'Resubmit' : 'Submit expense'}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Expense ${detail.id}` : ''}
        size="md"
        footer={detail ? (
          <>
            {['submitted', 'returned'].includes(detail.status) && <button type="button" className="btn btn-danger" onClick={() => withdraw(detail)}>Withdraw</button>}
            {['submitted', 'returned'].includes(detail.status) && (
              <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                <Paperclip size={13} /> Add receipt
                <input type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => { addReceipts(detail, Array.from(e.target.files || [])); e.target.value = ''; }} />
              </label>
            )}
            {detail.status === 'returned' && <button type="button" className="btn btn-primary" onClick={() => openEdit(detail)}>Correct & resubmit</button>}
          </>
        ) : undefined}
      >
        {detail && <ExpenseDetail expense={detail} />}
      </Modal>
    </div>
  );
}
