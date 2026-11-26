import { useAppSelector, useLoad } from '../../../store/hooks';
import {
  fetchMaterialRequests, fetchPurchaseOrders, fetchStock, selectAllMaterialRequests, selectAllPurchaseOrders, selectStock
} from '../../../features/procurement/procurementSlice';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../services/utils';
import { Stat, RequestStatusBadge, PoStatusBadge } from '../../../components/procurement/ProcurementUi';
import { inr } from '../../../components/procurement/procurementUiData';

export default function ProcurementDashboard() {
  const requests = useAppSelector(selectAllMaterialRequests);
  const orders = useAppSelector(selectAllPurchaseOrders);
  const stock = useAppSelector(selectStock);
  const error = useAppSelector((state) => state.procurement.requests.error) || '';
  useLoad([fetchMaterialRequests, fetchPurchaseOrders, fetchStock]);

  const toOrder = requests.filter((r) => r.status === 'approved');
  const awaitingApproval = orders.filter((o) => o.status === 'pending_approval');
  const awaitingDelivery = orders.filter((o) => ['approved', 'partially_received'].includes(o.status));
  const committed = awaitingDelivery.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Procurement & Stores</h1>
        <p>Fulfill PM-approved requests from site stock or raise purchase orders for shortages, receive deliveries, and track site stock.</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Stat label="Requests to fulfill" value={toOrder.length} sub="Approved by project managers" />
        <Stat label="Orders awaiting approval" value={awaitingApproval.length} sub="With the Finance Manager" />
        <Stat label="Deliveries expected" value={awaitingDelivery.length} sub={`${inr(committed)} on order`} />
        <Stat label="Stock lines on site" value={stock.filter((s) => s.quantity > 0).length} sub="Materials in stock" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="section-header"><h3 className="section-title">Pending fulfillment</h3><Link to="/procurement-storekeeper/requests" style={{ fontSize: 13 }}>View all</Link></div>
          {toOrder.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Nothing waiting.</p> : toOrder.slice(0, 5).map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div><strong>{r.id}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.projectName}</span><div style={{ fontSize: 12 }}>{r.items.map((i) => i.description).join(', ')}</div></div>
              <RequestStatusBadge status={r.status} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-header"><h3 className="section-title">Deliveries to receive</h3><Link to="/procurement-storekeeper/orders" style={{ fontSize: 13 }}>View all</Link></div>
          {awaitingDelivery.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No open deliveries.</p> : awaitingDelivery.slice(0, 5).map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div><strong>{o.id}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.supplierName}</span><div style={{ fontSize: 12 }}>{o.expectedDelivery ? `Due ${formatDate(o.expectedDelivery)}` : 'No date set'} · {inr(o.totalAmount)}</div></div>
              <PoStatusBadge status={o.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
