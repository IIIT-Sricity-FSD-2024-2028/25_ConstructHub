import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatINR } from '../../hooks/usePlans';
import { StageScheduleTable } from './EstimationUi';
import { round2 } from './estimationMath';

const blankItem = () => ({ description: '', unit: 'lump sum', quantity: '1', rate: '' });

/**
 * Line-item quotation editor. Amounts are shown for convenience only:
 * the server recalculates every amount and the total.
 */
export default function QuotationForm({ initial, submitting, submitLabel = 'Submit quotation', onSubmit, onCancel, expectedDurationDays }) {
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((i) => ({ description: i.description, unit: i.unit, quantity: String(i.quantity), rate: String(i.rate) }))
      : [blankItem()]
  );
  const [durationDays, setDurationDays] = useState(String(initial?.durationDays || expectedDurationDays || ''));
  const [validUntil, setValidUntil] = useState(initial?.validUntil || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [error, setError] = useState('');

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const setItem = (idx, field, value) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  function submit(e) {
    e.preventDefault();
    setError('');
    for (const [idx, i] of items.entries()) {
      if (!i.description.trim()) return setError(`Item ${idx + 1}: enter a description.`);
      if (!i.unit.trim()) return setError(`Item ${idx + 1}: enter a unit.`);
      if (!(Number(i.quantity) > 0)) return setError(`Item ${idx + 1}: quantity must be greater than zero.`);
      if (i.rate === '' || !(Number(i.rate) >= 0)) return setError(`Item ${idx + 1}: enter a valid rate.`);
    }
    if (!(parseInt(durationDays, 10) >= 1)) return setError('Enter the estimated duration in days.');
    if (total <= 0) return setError('The total must be greater than zero.');
    onSubmit({
      items: items.map((i) => ({ description: i.description.trim(), unit: i.unit.trim(), quantity: Number(i.quantity), rate: Number(i.rate) })),
      durationDays: parseInt(durationDays, 10),
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined
    });
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Description</th><th style={{ width: 110 }}>Unit</th><th style={{ width: 100 }}>Qty</th>
              <th style={{ width: 130 }}>Rate (₹)</th><th style={{ width: 130, textAlign: 'right' }}>Amount</th><th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td><input className="form-input" value={i.description} maxLength={300} placeholder="e.g. Foundation and RCC structure" onChange={(e) => setItem(idx, 'description', e.target.value)} /></td>
                <td><input className="form-input" value={i.unit} maxLength={30} onChange={(e) => setItem(idx, 'unit', e.target.value)} /></td>
                <td><input className="form-input" type="number" min="0" step="any" value={i.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} /></td>
                <td><input className="form-input" type="number" min="0" step="any" value={i.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} /></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR((Number(i.quantity) || 0) * (Number(i.rate) || 0))}</td>
                <td>
                  {items.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" aria-label="Remove item" onClick={() => setItems((p) => p.filter((_, k) => k !== idx))}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 16px' }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={items.length >= 50} onClick={() => setItems((p) => [...p, blankItem()])}>
          <Plus size={13} /> Add item
        </button>
        <div style={{ fontSize: 16 }}>Total: <strong>{formatINR(total)}</strong></div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Estimated duration (days) <span className="req">*</span></label>
          <input className="form-input" type="number" min="1" max="3650" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Quotation valid until</label>
          <input className="form-input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes (inclusions, exclusions, payment terms)</label>
        <textarea className="form-textarea" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
}

/**
 * Last step of the 3-role estimate: the Company Admin adds the profit markup %.
 * Shows the PM's stages, the FM's internal cost per stage and a live preview of the client quote.
 * The server recalculates everything; these numbers are for preview only.
 */
export function QuotationReleaseForm({ quote, submitting, onRelease, onCancel }) {
  const stages = quote?.milestoneStages || [];
  const internal = round2(stages.reduce((s, st) => s + (Number(st.internalCost) || 0), 0));
  const [markup, setMarkup] = useState('20');
  const [clientQuoteInput, setClientQuoteInput] = useState(() => String(round2(internal * 1.2)));
  const [validUntil, setValidUntil] = useState(quote?.validUntil || '');
  const [notes, setNotes] = useState(quote?.notes || '');
  const [error, setError] = useState('');

  const m = Number(markup);
  const valid = markup !== '' && Number.isFinite(m) && m >= 0 && m <= 200;
  const factor = valid ? 1 + m / 100 : 1;
  const preview = stages.map((st) => ({ ...st, clientAmount: round2((Number(st.internalCost) || 0) * factor) }));
  const client = round2(preview.reduce((s, st) => s + st.clientAmount, 0));
  const profit = round2(client - internal);
  const advancePct = Number(quote?.mobilizationAdvancePercent) || 0;

  function onMarkupChange(val) {
    setMarkup(val);
    const num = Number(val);
    if (val !== '' && Number.isFinite(num) && num >= 0 && num <= 200) {
      setClientQuoteInput(String(round2(internal * (1 + num / 100))));
    }
  }

  function onClientQuoteChange(val) {
    setClientQuoteInput(val);
    const num = Number(val);
    if (val !== '' && Number.isFinite(num) && internal > 0 && num >= internal) {
      const derivedPct = round2(((num - internal) / internal) * 100);
      setMarkup(String(derivedPct));
    }
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!valid) return setError('Enter a profit markup between 0 and 200 percent (or a client quote at or above the FM internal cost).');
    const customTotal = Number(clientQuoteInput);
    const payload = {
      markupPercent: round2(m),
      totalClientQuote: Number.isFinite(customTotal) && customTotal >= internal ? round2(customTotal) : undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
    };
    onRelease(payload);
  }


  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}

      <StageScheduleTable stages={preview} showInternal advancePercent={advancePct} total={client} />

      <div className="metric-ribbon" style={{ margin: '16px 0' }}>
        <div className="metric-cell"><div className="metric-cell-label">Internal cost (FM)</div><div className="metric-cell-value">{formatINR(internal)}</div></div>
        <div className="metric-cell"><div className="metric-cell-label">Company profit ({valid ? `${round2(m)}%` : '0%'})</div><div className="metric-cell-value" style={{ color: 'var(--green)' }}>{formatINR(profit)}</div></div>
        <div className="metric-cell" style={{ background: '#f8fafc' }}><div className="metric-cell-label">Client quote</div><div className="metric-cell-value" style={{ color: 'var(--primary)' }}>{formatINR(client)}</div></div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Profit markup % <span className="req">*</span></label>
          <input className="form-input" type="number" min="0" max="200" step="any" value={markup} onChange={(e) => onMarkupChange(e.target.value)} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[15, 20, 25, 30].map((pct) => (
              <button
                key={pct}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11.5 }}
                onClick={() => onMarkupChange(String(pct))}
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Total client quote (₹) <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(two-way synced)</span></label>
          <input className="form-input" type="number" min={internal} step="any" value={clientQuoteInput} onChange={(e) => onClientQuoteChange(e.target.value)} />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Type either Markup % or Target Quote ₹ — both auto-sync.</span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Quotation valid until</label>
        <input className="form-input" type="date" style={{ maxWidth: 260 }} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes for the client (inclusions, exclusions, payment terms)</label>
        <textarea className="form-textarea" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>The client sees the stage prices and the advance %. The internal cost and your markup stay private.</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending...' : 'Release to client'}</button>
      </div>
    </form>
  );
}
