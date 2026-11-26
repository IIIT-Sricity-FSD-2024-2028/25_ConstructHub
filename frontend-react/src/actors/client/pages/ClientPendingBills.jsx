import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchBills, updateBill, selectAllBills } from '../../../features/bills/billsSlice';
import {
  CheckCircle2,
  X
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  normalizeBillStatus, localDateISO } from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import ReportPreviewModal from '../../../components/common/ReportPreviewModal';
import { useToast } from '../../../hooks/useToast';

export default function ClientPendingBills() {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const allBills = useAppSelector(selectAllBills);
  const [actingId, setActingId] = useState('');
  useLoad([fetchBills]);

  // The client's bills split into "waiting for my decision" and "accepted, still to pay".
  const { bills, payableBills } = useMemo(() => {
    const mine = allBills.filter((b) => b.clientId === user?.id || b.clientEmail === user?.email);
    return {
      bills: mine.filter((b) => normalizeBillStatus(b.status) === 'Pending Decision'),
      payableBills: mine.filter((b) => normalizeBillStatus(b.status) === 'Accepted'
        && Number(b.outstanding ?? b.amount ?? 0) > 0 && b.paymentStatus !== 'Paid'),
    };
  }, [allBills, user]);

  // Modals
  const [detailBill, setDetailBill] = useState(null);
  const [previewReportId, setPreviewReportId] = useState(null);
  const [rejectBillId, setRejectBillId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [approvedBillNotice, setApprovedBillNotice] = useState(null);
  const [isRejectedSuccessOpen, setIsRejectedSuccessOpen] = useState(false);

  async function handleApprove(bill) {
    if (actingId) return;
    setActingId(bill.id);
    try {
      await dispatch(updateBill({ id: bill.id, changes: {
        status: 'Accepted',
        decisionDate: localDateISO()
      } })).unwrap();
      setDetailBill(null);
      setApprovedBillNotice(bill);
    } catch (err) {
      toast.error('Error accepting bill: ' + errorText(err));
    } finally {
      setActingId('');
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

    if (actingId) return;
    setActingId(rejectBillId);
    try {
      // The server tells the project's finance manager about the decline.
      await dispatch(updateBill({ id: rejectBillId, changes: {
        status: 'Declined',
        decisionDate: localDateISO(),
        rejectionReason: rejectReason.trim()
      } })).unwrap();
      setRejectBillId(null);
      setIsRejectedSuccessOpen(true);
    } catch (err) {
      setRejectError(errorText(err, 'Error declining bill'));
    } finally {
      setActingId('');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Pending Bills</h1>
        <p className="page-subtitle">Review milestone invoices and authorize or reject payment requests</p>
      </div>

      {payableBills.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 600, marginBottom: '10px', color: 'var(--text)' }}>
            Ready to Pay ({payableBills.length})
          </h2>
          {payableBills.map((b) => {
            const amountDue = Number(b.outstanding ?? b.amount ?? 0);
            const isAdv = b.billType === 'advance';
            return (
              <div
                key={b.id}
                className="card"
                style={{
                  marginBottom: '12px',
                  background: isAdv ? '#fff7ed' : 'var(--white)',
                  borderColor: isAdv ? '#fed7aa' : 'var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px' }}>{b.billNumber || b.id}</strong>
                      <span className={`badge ${isAdv ? 'badge-orange' : 'badge-green'}`}>
                        {isAdv ? 'Mobilization Advance' : 'Accepted · Unpaid'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {b.projectName} · {b.milestone || 'Stage Bill'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--primary)' }}>{formatCurrency(amountDue)}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Outstanding</div>
                    </div>
                    <Link
                      to={`/client/bills/${b.id}/pay`}
                      className="btn btn-primary btn-sm"
                    >
                      Pay Now
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div id="bills-list">
        {bills.length === 0 && payableBills.length === 0 ? (
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
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{b.billNumber || b.id}</h3>
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

              {(b.stageAmount || (b.siteReportIds || []).length > 0) && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: (b.siteReportIds || []).length > 0 ? '8px' : 0 }}>
                    <span className="badge badge-green">✓ PM Verified 100% Milestone Completion</span>
                    {b.stageAmount ? (
                      <span>
                        Quoted stage <strong>{formatCurrency(b.stageAmount)}</strong>
                        {b.advanceRecovery ? <> − Advance recovery <strong>{formatCurrency(b.advanceRecovery)}</strong></> : null}
                        {' '}= Net bill <strong>{formatCurrency(b.amount)}</strong>
                      </span>
                    ) : null}
                  </div>
                  {(b.siteReportIds || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Attached Proof of Work (Site Reports & Photos):</span>
                      {b.siteReportIds.map((rid) => (
                        <button
                          key={rid}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewReportId(rid)}
                        >
                          Inspect Report {rid.length > 12 ? rid.slice(0, 8) : rid}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="success" style={{ flex: 1 }} disabled={!!actingId} onClick={() => handleApprove(b)}>
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

          {(detailBill.stageAmount || (detailBill.siteReportIds || []).length > 0) && (
            <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
                Stage Billing & Attached Proof of Work
              </div>
              {detailBill.stageAmount ? (
                <p style={{ margin: '0 0 8px', fontSize: '13px' }}>
                  Quoted stage amount <strong>{formatCurrency(detailBill.stageAmount)}</strong>
                  {detailBill.advanceRecovery ? <> less mobilization advance recovery <strong>{formatCurrency(detailBill.advanceRecovery)}</strong></> : null}
                  {' '}= Net payable <strong>{formatCurrency(detailBill.amount)}</strong>.
                </p>
              ) : null}
              {(detailBill.siteReportIds || []).length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Site Engineer Reports (click to view photos, labor & materials):</span>
                  {detailBill.siteReportIds.map((rid) => (
                    <button key={rid} type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewReportId(rid)}>
                      {rid.length > 12 ? rid.slice(0, 8) : rid}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setDetailBill(null)}>
              Close
            </Button>
            <Button variant="danger" onClick={() => openRejectModal(detailBill.id)}>
              Decline
            </Button>
            <Button variant="success" disabled={!!actingId} onClick={() => handleApprove(detailBill)}>
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
            <Button variant="danger" disabled={!!actingId} onClick={handleConfirmReject}>
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
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Bill Accepted</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              {approvedBillNotice.billNumber || approvedBillNotice.id} for {formatCurrency(approvedBillNotice.amount)} has been accepted. Nothing has been paid yet:
              pay it now or later from the payment portal.
            </p>
            <Button
              variant="success"
              style={{ width: '100%' }}
              onClick={() => {
                const id = approvedBillNotice.id;
                setApprovedBillNotice(null);
                navigate(`/client/bills/${id}/pay`);
              }}
            >
              Pay Now
            </Button>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => setApprovedBillNotice(null)}>
              Pay later
            </button>
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
      <ReportPreviewModal reportId={previewReportId} onClose={() => setPreviewReportId(null)} />
    </div>
  );
}
