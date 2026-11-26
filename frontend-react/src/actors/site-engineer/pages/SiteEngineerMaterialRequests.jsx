import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchMaterialRequests, fetchStock, createMaterialRequest, cancelMaterialRequest, selectAllMaterialRequests, selectStock
} from '../../../features/procurement/procurementSlice';
import { fetchProjects, selectSiteWorkProjects } from '../../../features/projects/projectsSlice';
import { Plus } from 'lucide-react';
import { formatDate, localDateISO } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import {
  RequestStatusBadge, MaterialItemsEditor, StockTable, RequestItemsTable
} from '../../../components/procurement/ProcurementUi';
import { PRIORITY_BADGE } from '../../../components/procurement/procurementUiData';

const blankItem = () => ({ description: '', unit: '', quantity: '', specification: '' });
const today = () => localDateISO();

export default function SiteEngineerMaterialRequests() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState('requests');
  const requests = useAppSelector(selectAllMaterialRequests);
  const stock = useAppSelector(selectStock);
  // Projects the engineer works on (the server only accepts requests for those)
  const projects = useAppSelector(selectSiteWorkProjects);
  const loadError = useAppSelector((state) => state.procurement.requests.error) || '';
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ projectId: '', items: [blankItem()], neededBy: '', priority: 'Medium', notes: '' });

  useLoad([fetchMaterialRequests, fetchStock, fetchProjects]);

  function openForm() {
    setForm({ projectId: projects[0]?.id || '', items: [blankItem()], neededBy: '', priority: 'Medium', notes: '' });
    setFormError('');
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.projectId) return setFormError('Choose the project.');
    for (const [i, it] of form.items.entries()) {
      if (it.description.trim().length < 2) return setFormError(`Line ${i + 1}: enter the material name.`);
      if (!it.unit.trim()) return setFormError(`Line ${i + 1}: enter the unit (bags, kg, m...).`);
      if (!(Number(it.quantity) > 0)) return setFormError(`Line ${i + 1}: quantity must be greater than zero.`);
    }
    if (form.neededBy && form.neededBy < today()) return setFormError('"Needed by" cannot be in the past.');
    setSaving(true);
    let res;
    try {
      res = await dispatch(createMaterialRequest({
      projectId: form.projectId,
      items: form.items.map((i) => ({ description: i.description.trim(), unit: i.unit.trim(), quantity: Number(i.quantity), specification: i.specification.trim() || undefined })),
      neededBy: form.neededBy || undefined,
      priority: form.priority,
      notes: form.notes.trim() || undefined
      })).unwrap();
    } catch (err) {
      return setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
    toast.success(`Request ${res.id} sent to your project manager.`);
    setShowForm(false);
  }

  async function cancel(r) {
    try {
      await dispatch(cancelMaterialRequest(r.id)).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    }
    toast.success('Request cancelled.');
    setDetail(null);
  }

  const columns = [
    { key: 'id', label: 'Request', render: (r) => <div><strong>{r.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div></div> },
    { key: 'items', label: 'Materials', render: (r) => r.items.map((i) => i.description).join(', ') },
    { key: 'priority', label: 'Priority', render: (r) => <span className={`badge ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span> },
    { key: 'neededBy', label: 'Needed by', render: (r) => (r.neededBy ? formatDate(r.neededBy) : '—') },
    { key: 'status', label: 'Status', render: (r) => <RequestStatusBadge status={r.status} /> }
  ];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Material Requests</h1>
          <p>Ask for materials your site needs. Your project manager approves, then procurement orders them.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openForm} disabled={projects.length === 0}>
          <Plus size={15} /> New request
        </button>
      </div>
      {projects.length === 0 && (
        <div className="form-hint" style={{ marginBottom: 12 }}>
          You have no unfinished tasks on any project, so you cannot request materials right now. Your project manager assigns tasks.
        </div>
      )}

      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>My requests</button>
        <button type="button" className={`module-tab ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Site stock</button>
      </div>

      {loadError && <div className="error-msg" style={{ display: 'block' }}>{loadError}</div>}

      {tab === 'requests' ? (
        <div className="card">
          <DataTable data={requests} columns={columns} emptyMessage="You have not requested any materials yet." onRowClick={(r) => setDetail(r)} />
        </div>
      ) : (
        <div className="card">
          <div className="section-header"><h3 className="section-title">Stock at your sites</h3></div>
          <StockTable rows={stock} />
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New material request" subtitle="List everything you need for one project" size="lg">
        <form onSubmit={submit}>
          {formError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{formError}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Project <span className="req">*</span></label>
              <select className="form-select" aria-label="Project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" aria-label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <MaterialItemsEditor items={form.items} stockOptions={stock.filter((s) => s.projectId === form.projectId && Number(s.quantity) > 0)} onChange={(items) => setForm({ ...form, items })} />
          <div className="grid-2" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Needed by</label>
              <input className="form-input" aria-label="Needed by" type="date" min={today()} value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sending...' : 'Send request'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Request ${detail.id}` : ''}
        subtitle={detail ? detail.projectName : ''}
        size="md"
        footer={detail && detail.status === 'submitted' ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
            <button type="button" className="btn btn-danger" onClick={() => cancel(detail)}>Cancel request</button>
          </>
        ) : undefined}
      >
        {detail && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div><RequestStatusBadge status={detail.status} /> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sent {formatDate(detail.createdAt)}</span></div>
            <RequestItemsTable items={detail.items} />
            {detail.notes && <p style={{ fontSize: 13 }}>{detail.notes}</p>}
            {detail.decisionNote && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.decisionByName}: {detail.decisionNote}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
