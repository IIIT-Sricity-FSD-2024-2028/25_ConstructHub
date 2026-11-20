import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Building2,
  Receipt,
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, formatDate, normalizeBillStatus } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';

const METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone, hint: 'Instant settlement via UPI ID (demo)' },
  { id: 'card', label: 'Card', icon: CreditCard, hint: 'Corporate Debit or Credit Card (demo)' },
  { id: 'netbanking', label: 'NetBanking', icon: Landmark, hint: 'Direct corporate bank login (demo)' },
  { id: 'neft', label: 'NEFT / RTGS', icon: Building2, hint: 'Bank transfer with UTR reference (demo)' },
];

export default function ClientPaymentPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const { user } = outletCtx;
  const toast = useToast();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('client@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8841');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [bankName, setBankName] = useState('HDFC Bank Corporate');
  const [utrRef, setUtrRef] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id || !user?.id) return;
      setLoading(true);
      const allBills = await api.getBills();
      if (!alive) return;
      const found = (Array.isArray(allBills) ? allBills : []).find((b) => b.id === id) || null;
      setBill(found);
      if (found) {
        const due = Math.max(0, Number(found.outstanding ?? (Number(found.amount || 0) - Number(found.paidAmount || 0))));
        setAmount(due > 0 ? String(due) : '');
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading payment portal...
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="page-container">
        <Link to="/client/pending-bills" className="back-link">
          <ArrowLeft size={15} /> Back to Bills
        </Link>
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <h3>Invoice not found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>This bill could not be located or is no longer accessible.</p>
        </div>
      </div>
    );
  }

  const total = Number(bill.amount) || 0;
  const paidBefore = Number(bill.paidAmount) || 0;
  const outstanding = Math.max(0, Number(bill.outstanding ?? total - paidBefore));
  const isAccepted = normalizeBillStatus(bill.status) === 'Accepted';
  const isAdvance = bill.billType === 'advance';

  async function handlePay(e) {
    e.preventDefault();
    setError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      return setError('Enter a valid payment amount greater than ₹0.');
    }
    if (num > outstanding) {
      return setError(`Amount cannot exceed the remaining balance of ${formatCurrency(outstanding)}.`);
    }
    if (method === 'upi' && !upiId.trim().includes('@')) {
      return setError('Enter a valid UPI ID (e.g. name@okaxis).');
    }

    setProcessing(true);
    // Brief realistic gateway confirmation feel before recording the real backend payment
    await new Promise((r) => setTimeout(r, 450));
    const res = await api.payBill(bill.id, { amount: num });
    setProcessing(false);

    if (res && res.error) {
      setError(res.message || 'Payment could not be completed.');
      return;
    }

    if (outletCtx.refreshProjects) {
      await outletCtx.refreshProjects();
    }

    const methodLabel = METHODS.find((m) => m.id === method)?.label || 'Online Payment';
    setReceipt({
      payment: res.payment,
      bill: res.bill,
      projectStarted: !!res.projectStarted,
      amountPaid: num,
      methodLabel,
      reference: res.payment?.reference || utrRef.trim() || `CH-${Date.now().toString(36).toUpperCase()}`,
      paidAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    });
    toast.success(
      res.projectStarted
        ? 'Mobilization advance paid! Your project is now active (On Track) and site work is unlocked.'
        : `Payment of ${formatCurrency(num)} completed.`
    );
  }

  if (receipt) {
    const newOutstanding = Math.max(0, Number(receipt.bill?.outstanding ?? outstanding - receipt.amountPaid));
    return (
      <div className="page-container" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="icon-box icon-box-green icon-box-lg" style={{ margin: '0 auto 14px', borderRadius: '50%', width: 56, height: 56 }}>
            <CheckCircle2 size={30} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            Payment Successful
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 22 }}>
            {receipt.projectStarted
              ? 'Mobilization advance settled. Your project is now Active (On Track) and tasks & procurement are unlocked.'
              : 'Your payment has been recorded and synced with the contractor’s finance ledger.'}
          </p>

          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, textAlign: 'left', marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>Amount Paid</span>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>
                {formatCurrency(receipt.amountPaid)}
              </span>
            </div>
            <div className="detail-grid" style={{ gap: 10 }}>
              <div className="detail-item"><label>Invoice</label><span>{bill.billNumber || bill.id}</span></div>
              <div className="detail-item"><label>Reference ID</label><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{receipt.reference}</span></div>
              <div className="detail-item"><label>Project</label><span>{bill.projectName}</span></div>
              <div className="detail-item"><label>Milestone</label><span>{bill.milestone || 'Stage Bill'}</span></div>
              <div className="detail-item"><label>Method</label><span>{receipt.methodLabel}</span></div>
              <div className="detail-item"><label>Remaining Balance</label><span>{formatCurrency(newOutstanding)}</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {bill.projectId && (
              <Link to={`/client/projects/${bill.projectId}`} className="btn btn-primary">
                Open Project Workspace
              </Link>
            )}
            <Link to={`/client/bills/${bill.id}`} className="btn btn-secondary">
              View Invoice &amp; History
            </Link>
            <Link to="/client/pending-bills" className="btn btn-secondary">
              Back to Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 980, margin: '0 auto' }}>
      <button type="button" onClick={() => navigate(-1)} className="back-link">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 className="page-title">ConstructHub Payment Portal</h1>
          {isAdvance && <span className="badge badge-orange">Mobilization Advance</span>}
        </div>
        <p className="page-subtitle">
          Settle invoice <strong>{bill.billNumber || bill.id}</strong> for {bill.projectName}
        </p>
      </div>

      {!isAccepted || outstanding <= 0 ? (
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 8 }}>
            {outstanding <= 0 ? 'This invoice is already paid in full.' : 'Accept this bill before paying.'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 16 }}>
            {outstanding <= 0
              ? `Total paid: ${formatCurrency(paidBefore)}. No further payment is required.`
              : 'Review and accept the invoice first, then return here to complete payment.'}
          </p>
          <Link to={`/client/bills/${bill.id}`} className="btn btn-primary btn-sm">
            Open Invoice Details
          </Link>
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Checkout Form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600 }}>Payment Details</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>
                <ShieldCheck size={14} /> Demo Checkout
              </span>
            </div>

            {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

            <form onSubmit={handlePay}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Amount to Pay (₹)</span>
                  <button
                    type="button"
                    onClick={() => setAmount(String(outstanding))}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Fill full balance ({formatCurrency(outstanding)})
                  </button>
                </label>
                <input
                  type="number"
                  min="1"
                  max={outstanding}
                  step="0.01"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="form-hint">You can pay the full balance now or make a partial tranche payment.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {METHODS.map((m) => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: active ? 'var(--primary-light)' : 'var(--white)',
                          color: active ? 'var(--primary-dark)' : 'var(--text)',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={16} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {method === 'upi' && (
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" required />
                </div>
              )}

              {method === 'card' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input className="form-input" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Expiry</label>
                      <input className="form-input" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input className="form-input" type="password" defaultValue="123" maxLength={4} required />
                    </div>
                  </div>
                </>
              )}

              {method === 'netbanking' && (
                <div className="form-group">
                  <label className="form-label">Select Bank</label>
                  <select className="form-select" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                    <option>HDFC Bank Corporate</option>
                    <option>ICICI Bank Business</option>
                    <option>SBI Corporate Banking</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              {method === 'neft' && (
                <div className="form-group">
                  <label className="form-label">UTR / Transfer Reference (optional)</label>
                  <input className="form-input" value={utrRef} onChange={(e) => setUtrRef(e.target.value)} placeholder="e.g. HDFCR520261119001" />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ padding: '12px 18px', marginTop: 6 }}
                disabled={processing}
              >
                {processing ? 'Processing payment...' : `Pay ${formatCurrency(Number(amount) || 0)} Now`}
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                Demo payment portal — no real money is debited, and the payment is recorded immediately on the server.
              </p>
            </form>
          </div>

          {/* Right: Invoice Summary */}
          <div className="card" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Receipt size={18} color="var(--primary)" />
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600 }}>Invoice Summary</h2>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: 13.5, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Invoice Number</span>
                <strong>{bill.billNumber || bill.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Project</span>
                <strong>{bill.projectName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Milestone</span>
                <strong>{bill.milestone || 'Stage Bill'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Due Date</span>
                <strong>{formatDate(bill.dueDate)}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'grid', gap: 8, fontSize: 13.5 }}>
              {bill.stageAmount ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quoted Stage Amount</span>
                    <span>{formatCurrency(bill.stageAmount)}</span>
                  </div>
                  {bill.advanceRecovery > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                      <span>Less: Mobilization Advance Recovery</span>
                      <span>− {formatCurrency(bill.advanceRecovery)}</span>
                    </div>
                  )}
                </>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Invoice Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already Paid</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatCurrency(paidBefore)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 16 }}>
                <strong>Balance Due</strong>
                <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-head)' }}>{formatCurrency(outstanding)}</strong>
              </div>
            </div>

            {isAdvance && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 12.5, color: '#9a3412' }}>
                Paying this mobilization advance in full unlocks your project to <strong>Active (On Track)</strong> so site tasks and material orders can begin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
