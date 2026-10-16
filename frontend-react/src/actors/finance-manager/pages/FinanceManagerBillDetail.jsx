import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Receipt, CheckCircle2, X } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, formatDate, statusBadgeClass, normalizeBillStatus } from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function FinanceManagerBillDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

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
          onClick={() => navigate('/finance-manager/bill-decisions')}
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
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {bill.billNumber || bill.id}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span className={`badge ${statusBadgeClass(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Due: {formatDate(bill.dueDate)}</span>
          </div>
        </div>
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
          <span className={`badge ${statusBadgeClass(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
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
              <strong>{bill.clientName || 'Vikram Patel'}</strong>
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
              <span className={`badge ${statusBadgeClass(normalizeBillStatus(bill.status))}`}>{normalizeBillStatus(bill.status)}</span>
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
                    Rejection Reason
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>{bill.rejectionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No decision recorded yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Description</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)', margin: 0 }}>
          {bill.description || 'No description provided.'}
        </p>
      </div>
    </div>
  );
}
