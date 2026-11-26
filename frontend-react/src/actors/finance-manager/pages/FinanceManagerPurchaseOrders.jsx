import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchPurchaseOrders, fetchPurchaseOrder, approvePurchaseOrder, rejectPurchaseOrder, selectAllPurchaseOrders, selectPurchaseOrderById
} from '../../../features/procurement/procurementSlice';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { PoStatusBadge } from '../../../components/procurement/ProcurementUi';
import { inr, qtyText } from '../../../components/procurement/procurementUiData';

/** Shared PO detail (items, budget position, deliveries). */
export function PurchaseOrderDetail({ po }) {
  const bc = po.budgetCheck;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <PoStatusBadge status={po.status} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {po.supplierName} · {po.projectName} · raised by {po.createdByName} on {formatDate(po.createdAt)}
          {po.expectedDelivery ? ` · delivery by ${formatDate(po.expectedDelivery)}` : ''}
        </span>
      </div>
      {po.approvalReason && po.status === 'pending_approval' && (
        <div className="error-msg" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={15} /> Needs your approval: {po.approvalReason}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 480 }}>
          <thead><tr><th>Material</th><th>Unit</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Received</th></tr></thead>
          <tbody>
            {po.items.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td><td>{i.unit}</td>
                <td style={{ textAlign: 'right' }}>{qtyText(i.quantity)}</td>
                <td style={{ textAlign: 'right' }}>{inr(i.rate)}</td>
                <td style={{ textAlign: 'right' }}>{inr(i.amount)}</td>
                <td style={{ textAlign: 'right' }}>{qtyText(i.receivedQuantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{inr(po.totalAmount)}</td><td /></tr></tfoot>
        </table>
      </div>
      {bc && (
        <div data-testid="budget-check" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <strong style={{ fontSize: 13 }}>Project budget position</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 8, fontSize: 13 }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Budget</div>{inr(bc.budget)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Spent</div>{inr(bc.spent)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Committed (other POs)</div>{inr(bc.committed)}</div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>Available</div><strong style={{ color: bc.exceedsBudget ? 'var(--red)' : 'var(--green)' }}>{inr(bc.available)}</strong></div>
          </div>
          {bc.exceedsBudget && <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 8 }}>This order is more than the budget that is left.</p>}
        </div>
      )}
      {po.decisionNote && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{po.decisionByName}: {po.decisionNote}</p>}
      {po.cancelReason && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cancelled: {po.cancelReason}</p>}
      {po.receipts && po.receipts.length > 0 && (
        <div>
          <strong style={{ fontSize: 13 }}>Deliveries</strong>
          {po.receipts.map((g) => (
            <div key={g.id} style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {g.id} · {formatDate(g.receivedDate)} · {g.items.map((i) => `${qtyText(i.receivedQuantity)} ${i.unit} ${i.description}`).join(', ')}{g.deliveryNote ? ` · ${g.deliveryNote}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinanceManagerPurchaseOrders() {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectAllPurchaseOrders);
  const error = useAppSelector((state) => state.procurement.orders.error) || '';
  const [detailId, setDetailId] = useState(null);
  const detail = useAppSelector((state) => (detailId ? selectPurchaseOrderById(state, detailId) : null)) || null;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useLoad([fetchPurchaseOrders]);

  // Opening an order fetches its full record (budget position, deliveries) into the store.
  async function open(po) {
    try {
      await dispatch(fetchPurchaseOrder(po.id)).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    }
    setNote('');
    setDetailId(po.id);
  }

  async function decide(approve) {
    if (!approve && note.trim().length < 3) return toast.error('Please give a reason for rejecting.');
    setBusy(true);
    try {
      await dispatch(approve
        ? approvePurchaseOrder({ id: detail.id, note: note.trim() || undefined })
        : rejectPurchaseOrder({ id: detail.id, note: note.trim() })).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(`${detail.id} ${approve ? 'approved' : 'rejected'}.`);
    setDetailId(null);
  }

  const pending = orders.filter((o) => o.status === 'pending_approval');
  const columns = [
    { key: 'id', label: 'Order', render: (o) => <div><strong>{o.id}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.projectName}</div></div> },
    { key: 'supplier', label: 'Supplier', render: (o) => o.supplierName },
    { key: 'total', label: 'Amount', align: 'right', render: (o) => <strong>{inr(o.totalAmount)}</strong> },
    { key: 'why', label: 'Why approval', render: (o) => (o.status === 'pending_approval' ? o.approvalReason : '') },
    { key: 'status', label: 'Status', render: (o) => <PoStatusBadge status={o.status} /> },
    { key: 'date', label: 'Raised', render: (o) => formatDate(o.createdAt) }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <p>Approve orders above the company limit or beyond the project budget, and follow deliveries.</p>
      </div>
      <div className="module-tabs">
        <button type="button" className={`module-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Awaiting approval{pending.length ? ` (${pending.length})` : ''}</button>
        <button type="button" className={`module-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All orders</button>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="card">
        <DataTable
          data={tab === 'pending' ? pending : orders}
          columns={columns}
          emptyMessage={tab === 'pending' ? 'No purchase orders are waiting for your approval.' : 'No purchase orders yet.'}
          onRowClick={open}
        />
      </div>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetailId(null)}
        title={detail ? `Purchase order ${detail.id}` : ''}
        size="lg"
        footer={detail && detail.status === 'pending_approval' ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDetailId(null)}>Close</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => decide(false)}><XCircle size={14} /> Reject</button>
            <button type="button" className="btn btn-success" disabled={busy} onClick={() => decide(true)}><CheckCircle2 size={14} /> Approve</button>
          </>
        ) : undefined}
      >
        {detail && (
          <>
            <PurchaseOrderDetail po={detail} />
            {detail.status === 'pending_approval' && (
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Note (required when rejecting)</label>
                <textarea className="form-textarea" rows={2} maxLength={500} aria-label="Decision note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
