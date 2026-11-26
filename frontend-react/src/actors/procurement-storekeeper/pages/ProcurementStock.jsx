import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchStock, fetchStockLedger, fetchMaterialIssues, createMaterialIssue, selectStock, selectStockLedger, selectMaterialIssues
} from '../../../features/procurement/procurementSlice';
import { fetchProjects, selectAllProjects } from '../../../features/projects/projectsSlice';
import { fetchUsers, selectUsersByRole } from '../../../features/users/usersSlice';
import { fetchTasks, selectAllTasks } from '../../../features/tasks/tasksSlice';
import { ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import { StockTable, LedgerTable } from '../../../components/procurement/ProcurementUi';
import { qtyText } from '../../../components/procurement/procurementUiData';

export default function ProcurementStock() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState('stock');
  const [projectId, setProjectId] = useState('');
  const projects = useAppSelector(selectAllProjects);
  const allStock = useAppSelector(selectStock);
  const allLedger = useAppSelector(selectStockLedger);
  const allIssues = useAppSelector(selectMaterialIssues);
  const engineers = useAppSelector((state) => selectUsersByRole(state, 'site_engineer'));
  const tasks = useAppSelector(selectAllTasks);
  const error = useAppSelector((state) => state.procurement.stockError) || '';
  useLoad([fetchStock, fetchStockLedger, fetchMaterialIssues, fetchProjects, fetchUsers, fetchTasks]);

  // Everything is loaded once for all projects; the project filter works on what is already in the store.
  const byProject = (rows) => (projectId ? rows.filter((r) => r.projectId === projectId) : rows);
  const stock = byProject(allStock);
  const ledger = byProject(allLedger);
  const issues = byProject(allIssues);

  const [issuing, setIssuing] = useState(false);
  const [issueProject, setIssueProject] = useState('');
  const [lines, setLines] = useState([{ stockId: '', quantity: '' }]);
  const [issuedTo, setIssuedTo] = useState('');
  const [taskId, setTaskId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const issuable = allStock.filter((s) => s.quantity > 0);
  const issueProjects = [...new Map(issuable.map((s) => [s.projectId, s.projectName])).entries()];
  const projectStock = issuable.filter((s) => s.projectId === issueProject);

  function openIssue() {
    const first = issueProjects[0]?.[0] || '';
    setIssueProject(first);
    setLines([{ stockId: '', quantity: '' }]);
    setIssuedTo('');
    setTaskId('');
    setNotes('');
    setFormError('');
    setIssuing(true);
  }

  async function submitIssue(e) {
    e.preventDefault();
    setFormError('');
    const items = [];
    for (const l of lines) {
      if (!l.stockId) return setFormError('Choose a material on every line.');
      if (!(Number(l.quantity) > 0)) return setFormError('Enter a quantity greater than zero on every line.');
      items.push({ stockId: l.stockId, quantity: Number(l.quantity) });
    }
    setBusy(true);
    let res;
    try {
      // the thunk re-reads the stock; the movement ledger is read again here
      res = await dispatch(createMaterialIssue({ items, issuedTo: issuedTo || undefined, taskId: taskId || undefined, notes: notes.trim() || undefined })).unwrap();
    } catch (err) {
      return setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(`${res.id} issued. Site stock updated.`);
    setIssuing(false);
    dispatch(fetchStockLedger());
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Site Stock</h1>
          <p>Stock changes only through goods receipts (in) and material issues (out).</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" aria-label="Project filter" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={openIssue} disabled={issuable.length === 0}><ArrowUpRight size={15} /> Issue material</button>
        </div>
      </div>

      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Current stock</button>
        <button type="button" className={`module-tab ${tab === 'ledger' ? 'active' : ''}`} onClick={() => setTab('ledger')}>Movements</button>
        <button type="button" className={`module-tab ${tab === 'issues' ? 'active' : ''}`} onClick={() => setTab('issues')}>Issues</button>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      <div className="card">
        {tab === 'stock' && <StockTable rows={stock} />}
        {tab === 'ledger' && <LedgerTable rows={ledger} />}
        {tab === 'issues' && (
          issues.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No material has been issued yet.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Issue</th><th>Date</th><th>Materials</th><th>Issued to</th><th>Notes</th></tr></thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.id}</strong></td><td>{formatDate(i.date)}</td>
                      <td>{i.items.map((x) => `${qtyText(x.quantity)} ${x.unit} ${x.description}`).join(', ')}</td>
                      <td>{i.issuedToName || '—'}</td><td>{i.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <Modal isOpen={issuing} onClose={() => setIssuing(false)} title="Issue material from site stock" size="lg">
        <form onSubmit={submitIssue}>
          {formError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{formError}</div>}
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-select" aria-label="Issue project" value={issueProject} onChange={(e) => { setIssueProject(e.target.value); setLines([{ stockId: '', quantity: '' }]); setTaskId(''); }}>
              {issueProjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          {lines.map((l, idx) => {
            const sel = projectStock.find((s) => s.id === l.stockId);
            return (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select className="form-select" aria-label={`Material ${idx + 1}`} style={{ flex: 1 }} value={l.stockId} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, stockId: e.target.value } : x)))}>
                  <option value="">Choose material...</option>
                  {projectStock.map((s) => <option key={s.id} value={s.id}>{s.description} ({qtyText(s.quantity)} {s.unit} in stock)</option>)}
                </select>
                <input className="form-input" aria-label={`Quantity ${idx + 1}`} style={{ width: 120 }} type="number" min="0" step="any" max={sel ? sel.quantity : undefined} value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} placeholder="Qty" />
                {lines.length > 1 && <button type="button" className="btn btn-danger btn-sm" aria-label="Remove line" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 size={13} /></button>}
              </div>
            );
          })}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLines([...lines, { stockId: '', quantity: '' }])}><Plus size={13} /> Add line</button>
          <div className="grid-2" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Issued to (site engineer)</label>
              <select className="form-select" aria-label="Issued to" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)}>
                <option value="">Not specified</option>
                {/* only engineers with unfinished work on this project (the server refuses anyone else) */}
                {engineers
                  .filter((u) => tasks.some((t) => t.projectId === issueProject && t.assignedTo === u.id && t.status !== 'Completed'))
                  .map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">For task</label>
              <select className="form-select" aria-label="For task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">Not specified</option>
                {tasks.filter((t) => t.projectId === issueProject && t.status !== 'Completed' && (!issuedTo || t.assignedTo === issuedTo)).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIssuing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Issuing...' : 'Issue material'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
