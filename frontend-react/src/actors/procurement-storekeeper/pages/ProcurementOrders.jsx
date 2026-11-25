import { useCallback, useEffect, useState } from 'react';
import { PackageCheck, Ban, Paperclip, Download } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate, localDateISO } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { PoStatusBadge } from '../../../components/procurement/ProcurementUi';
import { inr, qtyText } from '../../../components/procurement/procurementUiData';
import { PurchaseOrderDetail } from '../../finance-manager/pages/FinanceManagerPurchaseOrders';

const today = () => localDateISO();

export default function ProcurementOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const [receiving, setReceiving] = useState(false);
  const [recv, setRecv] = useState({});
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receivedDate, setReceivedDate] = useState(today());
  const [recvError, setRecvError] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [milestoneId, setMilestoneId] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receipts, setReceipts] = useState([]);

  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.getPurchaseOrders();
    if (res && res.error) return setError(res.message);
    setError('');
    setOrders(res || []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function open(po) {
    const full = await api.getPurchaseOrder(po.id);
    if (full && full.error) return toast.error(full.message);
    setDetail(full);
    const rs = await api.getGoodsReceipts(po.id);
    setReceipts(Array.isArray(rs) ? rs : []);
  }

  async function attachInvoice(grnId, file) {
    if (!file) return;
    const res = await api.uploadGrnInvoice(grnId, file);
    if (res && res.error) return toast.error(res.message);
    toast.success('Vendor invoice attached.');
    const rs = await api.getGoodsReceipts(detail.id);
    setReceipts(Array.isArray(rs) ? rs : []);
  }

  async function downloadInvoice(r) {
    const res = await api.downloadGrnInvoice(r.id, r.vendorInvoice?.originalName);
    if (res && res.error) toast.error(res.message);
  }

  function openReceive() {
    setRecv(Object.fromEntries(detail.items.map((i) => [i.id, { qty: '', remarks: '' }])));
    setDeliveryNote('');
    setReceivedDate(today());
    setRecvError('');
    setMilestoneId('');
    setInvoiceFile(null);
    setMilestones([]);
    api.getProjectProgress(detail.projectId).then((p) => setMilestones(p && !p.error ? (p.milestones || []).filter((m) => m.status !== 'Completed') : []));
    setReceiving(true);
  }

  async function submitReceipt(e) {
    e.preventDefault();
    setRecvError('');
    const items = [];
    for (const i of detail.items) {
      const l = recv[i.id] || {};
      if (!l.qty || Number(l.qty) === 0) continue;
      const remaining = i.quantity - i.receivedQuantity;
      if (!(Number(l.qty) > 0)) return setRecvError(`"${i.description}": enter a valid quantity.`);
      if (Number(l.qty) > remaining) return setRecvError(`"${i.description}": cannot receive more than ordered. At most ${qtyText(remaining)} ${i.unit} can still be received.`);
      items.push({ poItemId: i.id, receivedQuantity: Number(l.qty), remarks: l.remarks.trim() || undefined });
    }
    if (items.length === 0) return setRecvError('Enter the quantity received for at least one item.');
    setBusy(true);
    const res = await api.createGoodsReceipt({ poId: detail.id, items, deliveryNote: deliveryNote.trim() || undefined, receivedDate, milestoneId: milestoneId || undefined });
    if (res && res.error) {
      setBusy(false);
      return setRecvError(res.message);
    }
    // The delivery is saved first; the vendor's paper invoice is attached right after (it can be added later too).
    if (invoiceFile) {
      const up = await api.uploadGrnInvoice(res.receipt.id, invoiceFile);
      if (up && up.error) toast.error(`${res.receipt.id} was saved, but the invoice could not be attached: ${up.message}`);
    }
    setBusy(false);
    toast.success(`${res.receipt.id} recorded. Site stock updated.`);
    setReceiving(false);
    setDetail(res.order);
    const rs = await api.getGoodsReceipts(res.order.id);
    setReceipts(Array.isArray(rs) ? rs : []);
    load();
  }

  async function cancelOrder() {
    if (reason.trim().length < 3) return toast.error('Please enter a reason.');
    setBusy(true);
    const res = await api.cancelPurchaseOrder(detail.id, reason.trim());
    setBusy(false);
    if (res && res.error) return toast.error(res.message);
    toast.success(`${detail.id} cancelled.`);
    setCancelling(false);
    setReason('');
    setDetail(null);
    load();
  }

  const shown = orders.filter((o) => !filter || o.status === filter);
  const canReceive = detail && ['approved', 'partially_received'].includes(detail.status);
  const canCancel = detail && ['pending_approval', 'approved'].includes(detail.status) && detail.items.every((i) => i.receivedQuantity === 0);

  const columns = [
    { key: 'id', label: 'Order', render: (o) => <div><strong>{o.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.projectName} · {o.requestId}</div></div> },
    { key: 'supplier', label: 'Supplier', render: (o) => o.supplierName },
    { key: 'total', label: 'Amount', align: 'right', render: (o) => <strong>{inr(o.totalAmount)}</strong> },
    { key: 'deliv', label: 'Received', render: (o) => `${qtyText(o.items.reduce((s, i) => s + i.receivedQuantity, 0))} of ${qtyText(o.items.reduce((s, i) => s + i.quantity, 0))}` },
    { key: 'eta', label: 'Expected', render: (o) => (o.expectedDelivery ? formatDate(o.expectedDelivery) : '—') },
    { key: 'status', label: 'Status', render: (o) => <PoStatusBadge status={o.status} /> }
  ];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Purchase Orders</h1>
          <p>Track orders and record deliveries as they arrive at site.</p>
        </div>
        <select className="form-select" aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending_approval">Awaiting approval</option>
          <option value="approved">Approved - awaiting delivery</option>
          <option value="partially_received">Partly received</option>
          <option value="received">Fully received</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card">
        <DataTable data={shown} columns={columns} emptyMessage="No purchase orders yet." onRowClick={open} />
      </div>

      <Modal
        isOpen={!!detail && !receiving && !cancelling}
        onClose={() => setDetail(null)}
        title={detail ? `Purchase order ${detail.id}` : ''}
        size="lg"
        footer={detail ? (
          <>
            {canCancel && <button type="button" className="btn btn-danger" onClick={() => { setReason(''); setCancelling(true); }}><Ban size={14} /> Cancel order</button>}
            <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
            {canReceive && <button type="button" className="btn btn-primary" onClick={openReceive}><PackageCheck size={14} /> Record delivery</button>}
          </>
        ) : undefined}
      >
        {detail && <PurchaseOrderDetail po={detail} />}
        {detail && receipts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Deliveries</h4>
            {receipts.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                <div>
                  <strong>{r.id}</strong> · {formatDate(r.receivedDate)}{r.deliveryNote ? ` · ${r.deliveryNote}` : ''}
                  {r.milestoneName ? ` · for ${r.milestoneName}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.vendorInvoice && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadInvoice(r)}><Download size={13} /> {r.vendorInvoice.originalName}</button>
                  )}
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Paperclip size={13} /> {r.vendorInvoice ? 'Replace invoice' : 'Attach invoice'}
                    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => { attachInvoice(r.id, e.target.files[0]); e.target.value = ''; }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={receiving} onClose={() => setReceiving(false)} title="Record delivery (goods receipt)" subtitle={detail ? `${detail.id} · ${detail.supplierName}` : ''} size="lg">
        {detail && (
          <form onSubmit={submitReceipt}>
            {recvError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{recvError}</div>}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 560 }}>
                <thead><tr><th>Material</th><th>Unit</th><th style={{ textAlign: 'right' }}>Ordered</th><th style={{ textAlign: 'right' }}>Already received</th><th style={{ width: 120 }}>Received now</th><th>Remarks</th></tr></thead>
                <tbody>
                  {detail.items.map((i) => {
                    const l = recv[i.id] || { qty: '', remarks: '' };
                    const done = i.receivedQuantity >= i.quantity;
                    return (
                      <tr key={i.id}>
                        <td>{i.description}</td><td>{i.unit}</td>
                        <td style={{ textAlign: 'right' }}>{qtyText(i.quantity)}</td>
                        <td style={{ textAlign: 'right' }}>{qtyText(i.receivedQuantity)}</td>
                        <td><input className="form-input" aria-label={`Received ${i.description}`} type="number" min="0" step="any" disabled={done} value={l.qty} onChange={(e) => setRecv({ ...recv, [i.id]: { ...l, qty: e.target.value } })} /></td>
                        <td><input className="form-input" aria-label={`Remarks ${i.description}`} maxLength={200} disabled={done} value={l.remarks} onChange={(e) => setRecv({ ...recv, [i.id]: { ...l, remarks: e.target.value } })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Delivery note / challan no.</label>
                <input className="form-input" aria-label="Delivery note" maxLength={60} value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Received on</label>
                <input className="form-input" aria-label="Received on" type="date" max={today()} value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Milestone this delivery is for</label>
                <select className="form-select" aria-label="Milestone" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                  <option value="">Not specified</option>
                  {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor delivery challan / invoice (PDF or photo)</label>
                <input className="form-input" aria-label="Vendor invoice" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setInvoiceFile(e.target.files[0] || null)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReceiving(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save receipt'}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel purchase order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelling(false)}>Keep order</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={cancelOrder}>Cancel order</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Reason <span className="req">*</span></label>
          <textarea className="form-textarea" rows={3} maxLength={300} aria-label="Cancel reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
