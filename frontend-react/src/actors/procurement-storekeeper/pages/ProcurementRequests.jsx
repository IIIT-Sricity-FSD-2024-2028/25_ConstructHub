import { useCallback, useEffect, useState } from 'react';
import { ShoppingCart, PackageCheck } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { RequestStatusBadge } from '../../../components/procurement/ProcurementUi';
import { PRIORITY_BADGE, inr, qtyText } from '../../../components/procurement/procurementUiData';

const matKey = (desc, unit) => `${String(desc || '').trim().toLowerCase()}::${String(unit || '').trim().toLowerCase()}`;

export default function ProcurementRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stock, setStock] = useState([]);
  const [limit, setLimit] = useState(null);
  const [error, setError] = useState('');

  // Create PO modal state
  const [target, setTarget] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [delivery, setDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Issue from Stock modal state
  const [issueTarget, setIssueTarget] = useState(null);
  const [issueLines, setIssueLines] = useState({});
  const [issueNotes, setIssueNotes] = useState('');
  const [issueError, setIssueError] = useState('');
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(async () => {
    const [r, s, st, stk] = await Promise.all([
      api.getMaterialRequests(),
      api.getSuppliers(),
      api.getProcurementSettings(),
      api.getStock()
    ]);
    if (r && r.error) return setError(r.message);
    setError('');
    setRequests(r || []);
    setSuppliers((s && !s.error ? s : []).filter((x) => x.status === 'active'));
    setLimit(st && !st.error ? st.poApprovalLimit : null);
    setStock(Array.isArray(stk) ? stk : []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  function findStockMatch(projectId, item) {
    const k = matKey(item.description, item.unit);
    return stock.find((s) => s.projectId === projectId && matKey(s.description, s.unit) === k && Number(s.quantity) > 0) || null;
  }

  function analyzeRequestStock(r) {
    const remainingItems = (r.items || []).filter((i) => Number(i.remainingQuantity) > 0);
    let hasAnyStock = false;
    let hasAnyShortage = false;
    let totalShortageCount = 0;

    const details = remainingItems.map((i) => {
      const match = findStockMatch(r.projectId, i);
      const inStock = match ? Number(match.quantity) : 0;
      const rem = Number(i.remainingQuantity) || 0;
      const issuable = Math.min(inStock, rem);
      const missing = Math.max(0, Math.round((rem - issuable) * 1000) / 1000);
      if (issuable > 0) hasAnyStock = true;
      if (missing > 0) {
        hasAnyShortage = true;
        totalShortageCount += 1;
      }
      return { item: i, match, inStock, issuable, missing };
    });

    return { details, hasAnyStock, hasAnyShortage, totalShortageCount };
  }

  function openOrder(r, onlyMissing = false) {
    const analysis = analyzeRequestStock(r);
    setTarget(r);
    setSupplierId(suppliers[0]?.id || '');
    setDelivery('');
    setNotes(onlyMissing ? 'Ordering missing quantity not available in site stock.' : '');
    setFormError('');
    const initial = {};
    for (const d of analysis.details) {
      const defaultQty = onlyMissing ? d.missing : d.item.remainingQuantity;
      initial[d.item.id] = { qty: defaultQty > 0 ? String(defaultQty) : '0', rate: '' };
    }
    setLines(initial);
  }

  function openIssueModal(r) {
    const analysis = analyzeRequestStock(r);
    setIssueTarget({ request: r, details: analysis.details.filter((d) => d.issuable > 0) });
    setIssueNotes(`Fulfilling material request ${r.id} from site stock.`);
    setIssueError('');
    const init = {};
    for (const d of analysis.details) {
      if (d.issuable > 0) {
        init[d.item.id] = String(d.issuable);
      }
    }
    setIssueLines(init);
  }

  const total = target
    ? target.items.reduce((s, i) => s + (Number(lines[i.id]?.qty) || 0) * (Number(lines[i.id]?.rate) || 0), 0)
    : 0;

  async function submitOrder(e) {
    e.preventDefault();
    setFormError('');
    if (!supplierId) return setFormError('Choose a supplier (add one under Suppliers first).');
    const items = [];
    for (const i of target.items.filter((x) => x.remainingQuantity > 0)) {
      const l = lines[i.id] || {};
      const qty = Number(l.qty);
      if (!l.qty || qty === 0) continue;
      if (!(qty > 0) || qty > i.remainingQuantity) return setFormError(`"${i.description}": quantity must be between 0 and ${i.remainingQuantity}.`);
      if (!(Number(l.rate) > 0)) return setFormError(`"${i.description}": enter the rate.`);
      items.push({ requestItemId: i.id, quantity: qty, rate: Number(l.rate) });
    }
    if (items.length === 0) return setFormError('Enter a quantity and rate for at least one item.');
    setSaving(true);
    const res = await api.createPurchaseOrder({ requestId: target.id, supplierId, items, expectedDelivery: delivery || undefined, notes: notes.trim() || undefined });
    setSaving(false);
    if (res && res.error) return setFormError(res.message);
    toast.success(res.status === 'pending_approval' ? `${res.id} created and sent for Finance Manager approval.` : `${res.id} created and approved.`);
    setTarget(null);
    load();
  }

  async function submitIssue(e) {
    e.preventDefault();
    setIssueError('');
    if (!issueTarget) return;
    const items = [];
    for (const d of issueTarget.details) {
      const qty = Number(issueLines[d.item.id]);
      if (!qty || qty <= 0) continue;
      if (qty > d.issuable) {
        return setIssueError(`"${d.item.description}": cannot issue more than ${qtyText(d.issuable)} ${d.item.unit} available/needed.`);
      }
      items.push({ stockId: d.match.id, quantity: qty, requestItemId: d.item.id });
    }
    if (items.length === 0) return setIssueError('Enter a quantity to issue for at least one item.');
    setIssuing(true);
    const res = await api.createMaterialIssue({
      requestId: issueTarget.request.id,
      issuedTo: issueTarget.request.requestedBy,
      items,
      notes: issueNotes.trim() || undefined
    });
    setIssuing(false);
    if (res && res.error) return setIssueError(res.message);
    toast.success(`${res.id} issued from site stock to ${issueTarget.request.requestedByName}.`);
    setIssueTarget(null);
    load();
  }

  const columns = [
    { key: 'id', label: 'Request', render: (r) => <div><strong>{r.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div></div> },
    { key: 'by', label: 'Requested by', render: (r) => r.requestedByName },
    {
      key: 'items',
      label: 'Materials & Site Stock Check',
      render: (r) => {
        const analysis = analyzeRequestStock(r);
        if (r.status !== 'approved' || analysis.details.length === 0) {
          return r.items.map((i) => `${qtyText(i.quantity)} ${i.unit} ${i.description}`).join('; ');
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {analysis.details.map(({ item, inStock, missing }) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13 }}>
                <span><strong>{qtyText(item.remainingQuantity)}</strong> of {qtyText(item.quantity)} {item.unit} {item.description}</span>
                {inStock >= item.remainingQuantity ? (
                  <span className="badge badge-green">In Stock ({qtyText(inStock)})</span>
                ) : inStock > 0 ? (
                  <span className="badge badge-orange">{qtyText(inStock)} in stock · {qtyText(missing)} short</span>
                ) : (
                  <span className="badge badge-gray">Not in stock</span>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    { key: 'priority', label: 'Priority', render: (r) => <span className={`badge ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span> },
    { key: 'needed', label: 'Needed by', render: (r) => (r.neededBy ? formatDate(r.neededBy) : '—') },
    { key: 'status', label: 'Status', render: (r) => (r.status === 'ordered' && (!r.purchaseOrderIds || r.purchaseOrderIds.length === 0) ? <span className="badge badge-green">Fulfilled (Stock)</span> : <RequestStatusBadge status={r.status} />) },
    {
      key: 'act',
      label: 'Fulfillment',
      render: (r) => {
        if (r.status !== 'approved') return null;
        const { hasAnyStock, hasAnyShortage } = analyzeRequestStock(r);
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {hasAnyStock && (
              <button type="button" className="btn btn-success btn-sm" onClick={() => openIssueModal(r)}>
                <PackageCheck size={13} /> {hasAnyShortage ? 'Issue Available' : 'Issue from Stock'}
              </button>
            )}
            {hasAnyShortage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openOrder(r, hasAnyStock)}>
                <ShoppingCart size={13} /> {hasAnyStock ? 'Order Missing Qty' : 'Create PO'}
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Approved Material Requests</h1>
        <p>Issue directly from available site stock or raise a purchase order for missing quantities. {limit !== null && `Orders above ${inr(limit)} require Finance Manager approval.`}</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card">
        <DataTable data={requests} columns={columns} emptyMessage="No approved requests are waiting to be fulfilled." />
      </div>

      {/* Issue from Site Stock Modal */}
      <Modal
        isOpen={!!issueTarget}
        onClose={() => setIssueTarget(null)}
        title={issueTarget ? `Issue from Site Stock — ${issueTarget.request.id}` : ''}
        subtitle={issueTarget ? `${issueTarget.request.projectName} · Issuing to ${issueTarget.request.requestedByName}` : ''}
        size="lg"
      >
        {issueTarget && (
          <form onSubmit={submitIssue}>
            {issueError && <div className="error-msg" style={{ display: 'block' }}>{issueError}</div>}
            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ textAlign: 'right' }}>In Stock</th>
                    <th style={{ textAlign: 'right' }}>Still Needed</th>
                    <th style={{ width: 130 }}>Issue Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {issueTarget.details.map((d) => (
                    <tr key={d.item.id}>
                      <td><strong>{d.item.description}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({d.item.unit})</span></td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{qtyText(d.inStock)}</td>
                      <td style={{ textAlign: 'right' }}>{qtyText(d.item.remainingQuantity)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={d.issuable}
                          step="any"
                          className="form-input"
                          value={issueLines[d.item.id] ?? ''}
                          onChange={(e) => setIssueLines((prev) => ({ ...prev, [d.item.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-group">
              <label className="form-label">Issue Notes</label>
              <input className="form-input" value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} maxLength={500} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIssueTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={issuing}>
                {issuing ? 'Issuing...' : 'Confirm Issue from Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create PO Modal */}
      <Modal isOpen={!!target} onClose={() => setTarget(null)} title={target ? `Create Purchase Order — ${target.id}` : ''} subtitle={target?.projectName} size="lg">
        {target && (
          <form onSubmit={submitOrder}>
            {formError && <div className="error-msg" style={{ display: 'block' }}>{formError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supplier <span className="req">*</span></label>
                <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  {suppliers.length === 0 && <option value="">No active suppliers</option>}
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected delivery</label>
                <input className="form-input" type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table className="data-table">
                <thead><tr><th>Material</th><th style={{ textAlign: 'right' }}>Remaining</th><th style={{ width: 110 }}>Order qty</th><th style={{ width: 130 }}>Rate (₹)</th><th style={{ textAlign: 'right' }}>Line total</th></tr></thead>
                <tbody>
                  {target.items.filter((i) => i.remainingQuantity > 0).map((i) => {
                    const l = lines[i.id] || {};
                    const lineTotal = (Number(l.qty) || 0) * (Number(l.rate) || 0);
                    return (
                      <tr key={i.id}>
                        <td><strong>{i.description}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({i.unit})</span></td>
                        <td style={{ textAlign: 'right' }}>{qtyText(i.remainingQuantity)}</td>
                        <td><input className="form-input" type="number" min="0" max={i.remainingQuantity} step="any" value={l.qty ?? ''} onChange={(e) => setLines((p) => ({ ...p, [i.id]: { ...p[i.id], qty: e.target.value } }))} /></td>
                        <td><input className="form-input" type="number" min="0" step="any" placeholder="0" value={l.rate ?? ''} onChange={(e) => setLines((p) => ({ ...p, [i.id]: { ...p[i.id], rate: e.target.value } }))} /></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{inr(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Delivery instructions, payment terms..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {limit !== null && total > limit ? `Above ${inr(limit)} limit — Finance Manager will approve.` : 'Within auto-approval limit.'}
              </span>
              <strong style={{ fontSize: 16 }}>Total: {inr(total)}</strong>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || suppliers.length === 0}>{saving ? 'Creating...' : 'Create Purchase Order'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
