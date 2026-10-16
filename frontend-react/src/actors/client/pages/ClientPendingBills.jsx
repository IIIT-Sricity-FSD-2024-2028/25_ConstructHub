import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  X,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  normalizeBillStatus
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientPendingBills() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [users, setUsers] = useState([]);

  // Modals
  const [detailBill, setDetailBill] = useState(null);
  const [rejectBillId, setRejectBillId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [approvedBillNotice, setApprovedBillNotice] = useState(null);
  const [isRejectedSuccessOpen, setIsRejectedSuccessOpen] = useState(false);

  useEffect(() => {
    loadBills();
  }, [user]);

  async function loadBills() {
    if (!user) return;
    const [allBills, allUsers] = await Promise.all([
      api.getBills(user.companyId),
      api.getUsers(user.companyId)
    ]);

    const clientBills = (allBills || []).filter(
      (b) =>
        (b.clientId === user.id || b.clientEmail === user.email || b.clientName === user.name) &&
        normalizeBillStatus(b.status) === 'Pending Decision'
    );
    setBills(clientBills);
    setUsers(allUsers || []);
  }

  async function handleApprove(bill) {
    try {
      await api.updateBill(bill.id, {
        status: 'Accepted',
        decisionDate: new Date().toISOString().split('T')[0]
      });

      // Notify Finance Managers
      const financeManagers = users.filter((u) => u.role === 'finance_manager');
      for (const fm of financeManagers) {
        await api.createNotification({
          userId: fm.id,
          type: 'bill',
          title: 'Bill Accepted',
          body: `Client has accepted bill ${bill.id} for project ${bill.projectName}.`
        });
      }

      setDetailBill(null);
      setApprovedBillNotice(bill);
      loadBills();
    } catch (err) {
      alert('Error accepting bill: ' + err.message);
    }
  }

  function openRejectModal(billId) {
    setDetailBill(null);
    setRejectBillId(billId);
    setRejectReason('');
    setRejectError('');
  }

  async function handleConfirmReject() {
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for declining');
      return;
    }
    if (rejectReason.length > 500) {
      setRejectError('Max 500 characters');
      return;
    }

    try {
      const b = bills.find((item) => item.id === rejectBillId);
      await api.updateBill(rejectBillId, {
        status: 'Declined',
        decisionDate: new Date().toISOString().split('T')[0],
        rejectionReason: rejectReason.trim()
      });

      // Notify Finance Managers
      const financeManagers = users.filter((u) => u.role === 'finance_manager');
      for (const fm of financeManagers) {
        await api.createNotification({
          userId: fm.id,
          type: 'bill',
          title: 'Bill Declined',
          body: `Client has declined bill ${rejectBillId} for project ${b ? b.projectName : ''}. Reason: ${rejectReason.trim()}`
        });
      }

      setRejectBillId(null);
      setIsRejectedSuccessOpen(true);
      loadBills();
    } catch (err) {
      setRejectError(err.message || 'Error declining bill');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Pending Bills</h1>
        <p className="page-subtitle">Review milestone invoices and authorize or reject payment requests</p>
      </div>

      <div id="bills-list">
        {bills.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ margin: '0 auto 12px', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--emerald-50, #ecfdf5)', color: 'var(--emerald-600, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3>No pending bills</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>All issued bills have been reviewed.</p>
            <Link to="/client/payment-decisions" className="btn btn-secondary">
              View Payment History
            </Link>
          </div>
        ) : (
          bills.map((b) => (
            <div key={b.id} className="card" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{b.id}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {b.projectName} · Milestone: <strong>{b.milestone}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>
                    {formatCurrency(b.amount)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Due: {formatDate(b.dueDate)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="success" style={{ flex: 1 }} onClick={() => handleApprove(b)}>
                  ✓ Accept Payment
                </Button>
                <Button variant="danger" style={{ flex: 1 }} onClick={() => openRejectModal(b.id)}>
                  <X size={15} style={{ marginRight: '4px' }} /> Decline Bill
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDetailBill(b)}>
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Details Modal */}
      {detailBill && (
        <Modal
          isOpen={!!detailBill}
          title={`Bill Details: ${detailBill.id}`}
          subtitle={detailBill.projectName}
          onClose={() => setDetailBill(null)}
        >
          <div className="detail-grid" style={{ marginBottom: '16px' }}>
            <div className="detail-item"><label>Project</label><span>{detailBill.projectName}</span></div>
            <div className="detail-item"><label>Milestone</label><span>{detailBill.milestone}</span></div>
            <div className="detail-item">
              <label>Amount</label>
              <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--primary)' }}>
                {formatCurrency(detailBill.amount)}
              </span>
            </div>
            <div className="detail-item"><label>Status</label><span><span className={`badge ${statusBadge(normalizeBillStatus(detailBill.status))}`}>{normalizeBillStatus(detailBill.status)}</span></span></div>
            <div className="detail-item"><label>Due Date</label><span>{formatDate(detailBill.dueDate)}</span></div>
          </div>

          {detailBill.description && (
            <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                Invoice Scope / Description
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {detailBill.description}
              </p>
            </div>
          )}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setDetailBill(null)}>
              Close
            </Button>
            <Button variant="danger" onClick={() => openRejectModal(detailBill.id)}>
              Decline
            </Button>
            <Button variant="success" onClick={() => handleApprove(detailBill)}>
              ✓ Accept
            </Button>
          </div>
        </Modal>
      )}

      {/* Decline Modal */}
      {rejectBillId && (
        <Modal
          isOpen={!!rejectBillId}
          title="Decline Bill"
          subtitle="Please provide a reason for declining this bill"
          onClose={() => setRejectBillId(null)}
        >
          {rejectError && (
            <div className="error-alert" style={{ marginBottom: '12px' }}>{rejectError}</div>
          )}

          <div className="form-group">
            <label className="form-label">Decline Reason <span className="req">*</span></label>
            <textarea
              className="form-textarea"
              placeholder="Explain why this bill is being declined..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <span className="form-hint">Max 500 characters</span>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setRejectBillId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmReject}>
              Confirm Decline
            </Button>
          </div>
        </Modal>
      )}

      {/* Approved Success Modal */}
      {approvedBillNotice && (
        <Modal
          isOpen={!!approvedBillNotice}
          title=""
          onClose={() => setApprovedBillNotice(null)}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              className="icon-box icon-box-green icon-box-lg"
              style={{ margin: '0 auto 16px', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Payment Accepted!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              {approvedBillNotice.id} for {formatCurrency(approvedBillNotice.amount)} has been accepted. The payment will be processed within 2-3 business days.
            </p>
            <Button
              variant="success"
              style={{ width: '100%' }}
              onClick={() => {
                setApprovedBillNotice(null);
                navigate('/client/payment-decisions');
              }}
            >
              View Payment History
            </Button>
          </div>
        </Modal>
      )}

      {/* Rejected Success Modal */}
      {isRejectedSuccessOpen && (
        <Modal
          isOpen={isRejectedSuccessOpen}
          title=""
          onClose={() => setIsRejectedSuccessOpen(false)}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              className="icon-box icon-box-red icon-box-lg"
              style={{ margin: '0 auto 16px', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={30} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Payment Declined</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              The finance manager has been notified of your decision to decline.
            </p>
            <Button
              variant="danger"
              style={{ width: '100%', marginBottom: '8px' }}
              onClick={() => setIsRejectedSuccessOpen(false)}
            >
              See Pending Bills
            </Button>
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => {
                setIsRejectedSuccessOpen(false);
                navigate('/client/feedback');
              }}
            >
              Submit Feedback
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
