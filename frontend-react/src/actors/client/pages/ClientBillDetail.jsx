import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, formatDate, statusBadge, normalizeBillStatus } from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientBillDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [rejectedModalOpen, setRejectedModalOpen] = useState(false);

  useEffect(() => {
    loadBill();
  }, [id, user]);

  async function loadBill() {
    if (!id || !user) return;
    setLoading(true);
    const allBills = await api.getBills(user.companyId);
    const found = (allBills || []).find((b) => b.id === id);
    setBill(found || null);
    setLoading(false);
  }

  async function handleApprove() {
    try {
      await api.updateBill(bill.id, {
        status: 'Accepted',
        decisionDate: new Date().toISOString().split('T')[0]
      });

      // Notify Finance Managers
      const allUsers = await api.getUsers(user.companyId);
      const financeManagers = (allUsers || []).filter((u) => u.role === 'finance_manager');
      for (const fm of financeManagers) {
        await api.createNotification({
          userId: fm.id,
          type: 'bill',
          title: 'Bill Accepted',
          body: `Client has accepted bill ${bill.id} for project ${bill.projectName}.`
        });
      }

      await loadBill();
      setApprovedModalOpen(true);
    } catch (err) {
      alert('Error accepting bill: ' + err.message);
    }
  }

  function openRejectModal() {
    setRejectReason('');
    setRejectError('');
    setRejectModalOpen(true);
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
      await api.updateBill(bill.id, {
        status: 'Declined',
        decisionDate: new Date().toISOString().split('T')[0],
        rejectionReason: rejectReason.trim()
      });

      // Notify Finance Managers
      const allUsers = await api.getUsers(user.companyId);
      const financeManagers = (allUsers || []).filter((u) => u.role === 'finance_manager');
      for (const fm of financeManagers) {
        await api.createNotification({
          userId: fm.id,
          type: 'bill',
          title: 'Bill Declined',
          body: `Client declined bill ${bill.id} for project ${bill.projectName}. Reason: ${rejectReason.trim()}`
        });
      }

      setRejectModalOpen(false);
      await loadBill();
      setRejectedModalOpen(true);
    } catch (err) {
      alert('Error declining bill: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading bill details...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/client/pending-bills')}
          className="back-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <h3>Bill not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The bill you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const canDecide = user.role === 'client' && normalizeBillStatus(bill.status) === 'Pending Decision';

  return (
    <div className="page-container">
      <button
        onClick={() => navigate(-1)}
        className="back-btn"
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '16px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700, margin: 0 }}>{bill.billNumber || bill.id}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span className={`badge ${statusBadge(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Due: {formatDate(bill.dueDate)}</span>
          </div>
        </div>

        {canDecide && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="success" onClick={handleApprove}>✓ Accept Payment</Button>
            <Button variant="danger" onClick={openRejectModal}>
              <X size={16} style={{ marginRight: '4px' }} /> Decline
            </Button>
          </div>
        )}
      </div>

      {/* Amount Banner */}
      <div style={{
        background: 'var(--primary-light, #ffedd5)',
        border: '1px solid #fdba74',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
            Bill Amount
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
            {formatCurrency(bill.amount)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
          <span className={`badge ${statusBadge(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Bill Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', fontSize: '13.5px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Bill ID</span>
              <strong>{bill.id}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Project</span>
              <strong>{bill.projectName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Client</span>
              <strong>{bill.clientName || user.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Milestone</span>
              <strong>{bill.milestone || (bill.description ? bill.description.replace(/\.?$/, '') : 'Milestone 1 - Foundation & Groundwork')}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Due Date</span>
              <strong>{formatDate(bill.dueDate)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Status</span>
              <span className={`badge ${statusBadge(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Decision Details</h3>
          {bill.decisionDate ? (
            <div style={{ fontSize: '13.5px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Decision Date</span>
                <strong>{formatDate(bill.decisionDate)}</strong>
              </div>
              {bill.rejectionReason && (
                <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--red, #ef4444)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Decline Reason
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>{bill.rejectionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No decision made yet.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Description</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)', margin: 0 }}>
          {bill.description || 'No description provided.'}
        </p>
      </div>

      {canDecide && (
        <div style={{
          background: 'var(--primary-light, #ffedd5)',
          border: '1px solid #fdba74',
          borderRadius: 'var(--radius)',
          padding: '20px',
          marginTop: '16px'
        }}>
          <h3 style={{ fontFamily: 'var(--font-head)', color: 'var(--primary)', marginBottom: '8px', fontSize: '16px' }}>
            Action Required
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Please review this bill and make a payment decision.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="success" onClick={handleApprove}>✓ Accept Payment</Button>
            <Button variant="danger" onClick={openRejectModal}>
              <X size={16} style={{ marginRight: '4px' }} /> Decline
            </Button>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Decline Bill" maxWidth="440px">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
          Please provide a reason for declining
        </p>
        <div className="form-group">
          <label className="form-label">
            Decline Reason <span className="req">*</span>
          </label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Describe why this bill is being declined..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          {rejectError && <span className="field-error">{rejectError}</span>}
        </div>
        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmReject}>Decline Bill</Button>
        </div>
      </Modal>

      {/* Approved Success Modal */}
      <Modal isOpen={approvedModalOpen} onClose={() => setApprovedModalOpen(false)} maxWidth="400px">
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div className="icon-box icon-box-green icon-box-lg" style={{ margin: '0 auto 16px', borderRadius: '50%' }}>
            <CheckCircle2 size={36} color="#10b981" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '8px', fontSize: '20px' }}>Payment Accepted!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            The payment will be processed within 2–3 business days. The finance manager has been notified.
          </p>
          <Button
            variant="success"
            fullWidth
            onClick={() => {
              setApprovedModalOpen(false);
              navigate('/client/payment-decisions');
            }}
          >
            View Payment History
          </Button>
        </div>
      </Modal>

      {/* Rejected Success Modal */}
      <Modal isOpen={rejectedModalOpen} onClose={() => setRejectedModalOpen(false)} maxWidth="400px">
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div className="icon-box icon-box-red icon-box-lg" style={{ margin: '0 auto 16px', borderRadius: '50%' }}>
            <X size={36} color="#ef4444" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '8px', fontSize: '20px' }}>Payment Declined</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            The decision to decline has been recorded. The finance manager has been notified.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              setRejectedModalOpen(false);
              navigate('/client/pending-bills');
            }}
          >
            See Pending Bills
          </Button>
        </div>
      </Modal>
    </div>
  );
}
