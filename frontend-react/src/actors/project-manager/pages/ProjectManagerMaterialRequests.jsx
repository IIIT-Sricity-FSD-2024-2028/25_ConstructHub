import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchMaterialRequests, fetchStock, approveMaterialRequest, rejectMaterialRequest, selectAllMaterialRequests, selectStock
} from '../../../features/procurement/procurementSlice';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { RequestStatusBadge, RequestItemsTable, StockTable } from '../../../components/procurement/ProcurementUi';
import { PRIORITY_BADGE } from '../../../components/procurement/procurementUiData';

export default function ProjectManagerMaterialRequests() {
  const toast = useToast();
  const [tab, setTab] = useState('review');
  const dispatch = useAppDispatch();
  const requests = useAppSelector(selectAllMaterialRequests);
  const stock = useAppSelector(selectStock);
  const error = useAppSelector((state) => state.procurement.requests.error) || '';
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  useLoad([fetchMaterialRequests, fetchStock]);

  async function approve(r) {
    setBusy(true);
    try {
      await dispatch(approveMaterialRequest({ id: r.id })).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(`${r.id} approved and sent to Procurement & Stores.`);
  }

  async function reject() {
    if (reason.trim().length < 3) return toast.error('Please give a reason for rejecting.');
    setBusy(true);
    try {
      await dispatch(rejectMaterialRequest({ id: rejecting.id, note: reason.trim() })).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(`${rejecting.id} rejected.`);
    setRejecting(null);
    setReason('');
  }

  const pending = requests.filter((r) => r.status === 'submitted');

  const historyColumns = [
    { key: 'id', label: 'Request', render: (r) => <div><strong>{r.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div></div> },
    { key: 'by', label: 'Requested by', render: (r) => r.requestedByName },
    { key: 'items', label: 'Materials', render: (r) => r.items.map((i) => `${i.quantity} ${i.unit} ${i.description}`).join(', ') },
    { key: 'status', label: 'Status', render: (r) => <RequestStatusBadge status={r.status} /> },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.createdAt) }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Material Requests</h1>
        <p>Verify what your site engineers ask for. Approved requests go to procurement.</p>
      </div>

      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>To review{pending.length ? ` (${pending.length})` : ''}</button>
        <button type="button" className={`module-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All requests</button>
        <button type="button" className={`module-tab ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Site stock</button>
      </div>

      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {tab === 'review' && (
        pending.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}><h3>Nothing to review</h3><p style={{ color: 'var(--text-muted)' }}>New requests from your site engineers will appear here.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {pending.map((r) => (
              <div className="card" key={r.id} data-testid={`request-${r.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{r.id}</strong> <span className={`badge ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.projectName} · requested by {r.requestedByName} on {formatDate(r.createdAt)}{r.neededBy ? ` · needed by ${formatDate(r.neededBy)}` : ''}</div>
                  </div>
                </div>
                <RequestItemsTable items={r.items} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {r.items.map((it) => {
                    const match = stock.find(
                      (s) => s.projectId === r.projectId
                        && String(s.description || '').trim().toLowerCase() === String(it.description || '').trim().toLowerCase()
                        && String(s.unit || '').trim().toLowerCase() === String(it.unit || '').trim().toLowerCase()
                    );
                    const avail = match ? Number(match.quantity) : 0;
                    if (avail >= it.quantity) {
                      return <span key={it.id} className="badge badge-green">{it.description}: {avail} {it.unit} in stock</span>;
                    }
                    if (avail > 0) {
                      return <span key={it.id} className="badge badge-orange">{it.description}: {avail} in stock · {Math.round((it.quantity - avail) * 1000) / 1000} short</span>;
                    }
                    return <span key={it.id} className="badge badge-gray">{it.description}: Not in stock (needs PO)</span>;
                  })}
                </div>
                {r.notes && <p style={{ fontSize: 13, margin: '10px 0 0' }}>{r.notes}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => approve(r)}><CheckCircle2 size={13} /> Approve</button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setRejecting(r); setReason(''); }}><XCircle size={13} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'all' && <div className="card"><DataTable data={requests} columns={historyColumns} emptyMessage="No material requests yet." /></div>}

      {tab === 'stock' && (
        <div className="card">
          <div className="section-header"><h3 className="section-title">Stock on your projects</h3></div>
          <StockTable rows={stock} />
        </div>
      )}

      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject request"
        subtitle={rejecting ? rejecting.id : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={reject}>Reject request</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Reason <span className="req">*</span></label>
          <textarea className="form-textarea" rows={3} maxLength={500} aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The site engineer will see this." />
        </div>
      </Modal>
    </div>
  );
}
