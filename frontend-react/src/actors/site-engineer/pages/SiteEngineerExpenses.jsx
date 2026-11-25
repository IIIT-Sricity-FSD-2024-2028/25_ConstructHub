import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Paperclip } from 'lucide-react';
import { api } from '../../../services/api';
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
  const { user } = useOutletContext();
  const toast = useToast();
  const fileInput = useRef(null);
  const [claims, setClaims] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | { ...fields, editingId? }
  const [files, setFiles] = useState([]);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const formProjectId = form?.projectId || '';

  const load = useCallback(async () => {
    const res = await api.getExpenseClaims();
    if (res && res.error) return setError(res.message);
    setError('');
    setClaims(res || []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.getProjects(user.companyId), api.getTasks(user.companyId)]).then(([ps, ts]) => {
      // only projects where this engineer still has unfinished work (the server enforces the same rule)
      const mine = new Set((ts || []).filter((t) => t.assignedTo === user.id && t.status !== 'Completed').map((t) => t.projectId));
      setProjects((ps || []).filter((p) => mine.has(p.id) && p.status !== 'Completed'));
    });
  }, [user]);

  useEffect(() => {
    if (!formProjectId) return;
    let live = true;
    api.getProjectProgress(formProjectId).then((p) => {
      if (live) setMilestones(p && !p.error ? (p.milestones || []).filter((m) => m.status !== 'Completed') : []);
    });
    return () => { live = false; };
  }, [formProjectId]);

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
    const res = form.editingId ? await api.resubmitExpense(form.editingId, payload) : await api.submitExpense(payload);
    if (res && res.error) {
      setBusy(false);
      return setFormError(res.message);
    }
    if (files.length > 0) {
      const up = await api.uploadExpenseReceipts(res.id, files);
      if (up && up.error) toast.error(`Saved, but the receipt could not be attached: ${up.message}`);
    }
    setBusy(false);
    toast.success(form.editingId ? `${res.id} corrected and resubmitted.` : `${res.id} sent to your project manager.`);
    setForm(null);
    load();
  }

  async function withdraw(e) {
    const res = await api.withdrawExpense(e.id);
    if (res && res.error) return toast.error(res.message);
    toast.success('Expense withdrawn.');
    setDetail(null);
    load();
  }

  async function addReceipts(e, list) {
    if (!list || list.length === 0) return;
    const res = await api.uploadExpenseReceipts(e.id, list);
    if (res && res.error) return toast.error(res.message);
    toast.success('Receipt attached.');
    const fresh = await api.getExpenseClaim(e.id);
    setDetail(fresh && !fresh.error ? fresh : null);
    load();
  }

  async function open(e) {
    const full = await api.getExpenseClaim(e.id);
    setDetail(full && !full.error ? full : e);
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
