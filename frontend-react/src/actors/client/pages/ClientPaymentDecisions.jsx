import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useLoad } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchBills, selectAllBills } from '../../../features/bills/billsSlice';
import {
  CheckCircle2,
  X
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  normalizeBillStatus
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientPaymentDecisions() {
  const user = useAppSelector(selectCurrentUser);
  const allBills = useAppSelector(selectAllBills);
  const [selectedBill, setSelectedBill] = useState(null);
  useLoad([fetchBills]);

  // Bills this client has already accepted or declined, latest decision first.
  const decisions = useMemo(() => allBills
    .filter((b) =>
      (b.clientId === user?.id || b.clientEmail === user?.email) &&
      (normalizeBillStatus(b.status) === 'Accepted' || normalizeBillStatus(b.status) === 'Declined'))
    .sort((a, b) => new Date(b.decisionDate || 0) - new Date(a.decisionDate || 0)), [allBills, user]);

  const acceptedBills = decisions.filter((b) => normalizeBillStatus(b.status) === 'Accepted');
  const declinedBills = decisions.filter((b) => normalizeBillStatus(b.status) === 'Declined');

  const acceptedTotal = acceptedBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const declinedTotal = declinedBills.reduce((s, b) => s + (Number(b.amount) || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Payment Decisions</h1>
        <p className="page-subtitle">Historical log of all accepted and declined milestone payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="icon-box icon-box-green icon-box-lg" style={{ borderRadius: '10px' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Accepted Payments ({acceptedBills.length})</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--emerald-600, #059669)', marginTop: '2px' }}>
              {formatCurrency(acceptedTotal)}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="icon-box icon-box-red icon-box-lg" style={{ borderRadius: '10px' }}>
            <X size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Declined Payments ({declinedBills.length})</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red)', marginTop: '2px' }}>
              {formatCurrency(declinedTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Decisions List */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '14px' }}>Decision History</div>
        {decisions.length === 0 ? (
          <div className="empty-state">
            <p>No processed payment decisions found yet.</p>
          </div>
        ) : (
          decisions.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px',
                background: 'var(--bg)',
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '15px' }}>{b.billNumber || b.id}</strong>
                  <span className={`badge ${statusBadge(normalizeBillStatus(b.status))}`}>{normalizeBillStatus(b.status)}</span>
                  {normalizeBillStatus(b.status) === 'Accepted' && (
                    <span className={`badge ${b.paymentStatus === 'Paid' ? 'badge-green' : 'badge-orange'}`}>
                      {b.paymentStatus === 'Paid' ? 'Paid' : Number(b.paidAmount || 0) > 0 ? 'Partially Paid' : 'Unpaid'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {b.projectName} · {b.milestone} · Decision on: {formatDate(b.decisionDate || b.dueDate)}
                </div>
                {b.rejectionReason && (
                  <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>
                    Reason: {b.rejectionReason}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--primary)', marginBottom: '6px' }}>
                  {formatCurrency(b.amount)}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {normalizeBillStatus(b.status) === 'Accepted' && Number(b.outstanding ?? (Number(b.amount || 0) - Number(b.paidAmount || 0))) > 0 && b.paymentStatus !== 'Paid' && (
                    <Link to={`/client/bills/${b.id}/pay`} className="btn btn-primary btn-sm">
                      Pay Now
                    </Link>
                  )}
                  <Link to={`/client/bills/${b.id}`} className="btn btn-secondary btn-sm">
                    View Invoice
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          title={`Bill Record: ${selectedBill.id}`}
          subtitle={selectedBill.projectName}
          onClose={() => setSelectedBill(null)}
        >
          <div className="detail-grid" style={{ marginBottom: '16px' }}>
            <div className="detail-item"><label>Bill ID</label><span>{selectedBill.id}</span></div>
            <div className="detail-item"><label>Milestone</label><span>{selectedBill.milestone || (selectedBill.description ? selectedBill.description.replace(/\.?$/, '') : 'Milestone 1 - Foundation & Groundwork')}</span></div>
            <div className="detail-item"><label>Amount</label><span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(selectedBill.amount)}</span></div>
            <div className="detail-item"><label>Decision</label><span><span className={`badge ${statusBadge(normalizeBillStatus(selectedBill.status))}`}>{normalizeBillStatus(selectedBill.status)}</span></span></div>
            <div className="detail-item"><label>Due Date</label><span>{formatDate(selectedBill.dueDate)}</span></div>
            <div className="detail-item"><label>Decision Date</label><span>{selectedBill.decisionDate ? formatDate(selectedBill.decisionDate) : 'Pending Client Action'}</span></div>
          </div>

          {selectedBill.rejectionReason && (
            <div style={{ padding: '12px', background: 'var(--red-light, #fee2e2)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--red)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                Rejection Note
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--red)' }}>
                {selectedBill.rejectionReason}
              </p>
            </div>
          )}

          {selectedBill.description && (
            <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                Description
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {selectedBill.description}
              </p>
            </div>
          )}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setSelectedBill(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
