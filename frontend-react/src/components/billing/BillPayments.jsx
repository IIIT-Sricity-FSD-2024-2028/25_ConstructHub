import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Landmark } from 'lucide-react';
import { api } from '../../services/api';
import { formatDate, normalizeBillStatus, localDateISO } from '../../services/utils';
import { useToast } from '../../hooks/useToast';
import { inr } from '../procurement/procurementUiData';

const METHODS = ['Bank transfer', 'Cheque', 'Cash', 'UPI'];
const today = () => localDateISO();

/**
 * Payments against one bill. Accepting a bill and paying it are separate:
 *  - client: demo "Pay now" (no real money moves; partial payments allowed)
 *  - finance manager: record money received offline (transfer, cheque, cash, UPI)
 */
export default function BillPayments({ bill, role, onChanged }) {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.getBillPayments(bill.id);
    if (res && res.error) return setLoadError(res.message);
    setLoadError('');
    setPayments(res || []);
  }, [bill.id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, bill.paidAmount]);

  const accepted = normalizeBillStatus(bill.status) === 'Accepted';
  const total = Number(bill.amount) || 0;
  const paid = Number(bill.paidAmount) || 0;
  const outstanding = accepted ? Math.max(0, Number(bill.outstanding ?? total - paid)) : total;
  const canPay = accepted && outstanding > 0 && (role === 'client' || role === 'finance_manager');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const n = Number(amount);
    if (!(n > 0)) return setError('Enter an amount greater than zero.');
    if (n > outstanding) return setError(`The amount cannot be more than the outstanding balance (${inr(outstanding)}).`);
    if (role === 'finance_manager' && method !== 'Cash' && reference.trim().length < 3) return setError('Enter the payment reference.');
    setBusy(true);
    const payload = role === 'client' ? { amount: n } : { amount: n, method, reference: reference.trim() || undefined, paidAt, note: note.trim() || undefined };
    const res = await api.payBill(bill.id, payload);
    setBusy(false);
    if (res && res.error) return setError(res.message);
    toast.success(`Payment of ${inr(n)} recorded.`);
    setAmount('');
    setReference('');
    setNote('');
    await load();
    onChanged && onChanged(res.bill);
  }

  return (
    <div className="card" style={{ marginTop: 16 }} data-testid="bill-payments">
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Payments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bill amount</div><strong style={{ fontSize: 18 }}>{inr(total)}</strong></div>
        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paid</div><strong style={{ fontSize: 18, color: 'var(--green)' }}>{inr(paid)}</strong></div>
        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Outstanding</div><strong style={{ fontSize: 18, color: outstanding > 0 && accepted ? 'var(--red)' : undefined }}>{accepted ? inr(outstanding) : '—'}</strong></div>
        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment status</div>
          <span className={`badge ${bill.paymentStatus === 'Paid' ? 'badge-green' : bill.paymentStatus === 'Partially Paid' ? 'badge-orange' : 'badge-gray'}`}>{accepted ? bill.paymentStatus || 'Unpaid' : 'Not payable yet'}</span>
        </div>
      </div>

      {!accepted && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>A bill can be paid only after the client has accepted it.</p>}
      {loadError && <div className="error-msg" style={{ display: 'block' }}>{loadError}</div>}

      {payments.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th><th>Recorded by</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paidAt)}</td><td>{p.method}</td><td>{p.reference || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(p.amount)}</td><td>{p.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canPay && role === 'client' && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={15} /> Ready to settle this invoice
            </strong>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Pay the full balance ({inr(outstanding)}) or make a partial payment via UPI, Card, NetBanking, or NEFT.
            </p>
          </div>
          <Link to={`/client/bills/${bill.id}/pay`} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={14} /> Proceed to Payment Portal
          </Link>
        </div>
      )}

      {canPay && role === 'finance_manager' && (
        <form onSubmit={submit} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Landmark size={15} /> Record a payment received
          </strong>
          {error && <div className="error-msg" style={{ display: 'block', margin: '8px 0' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" aria-label="Payment amount" type="number" min="0" step="0.01" max={outstanding} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`up to ${outstanding}`} />
            </div>
            {role === 'finance_manager' && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Method</label>
                  <select className="form-select" aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reference</label>
                  <input className="form-input" aria-label="Payment reference" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'Cash' ? 'optional' : 'transfer / cheque / UPI no.'} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Received on</label>
                  <input className="form-input" aria-label="Received on" type="date" max={today()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAmount(String(outstanding))}>Full balance</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : role === 'client' ? 'Pay now' : 'Record payment'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
