import { Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../../services/utils';
import { qtyText } from './procurementUiData';

const REQUEST_BADGE = { submitted: 'badge-orange', approved: 'badge-blue', rejected: 'badge-red', cancelled: 'badge-gray', ordered: 'badge-green' };
const REQUEST_LABEL = { submitted: 'Awaiting PM approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', ordered: 'Ordered' };
const PO_BADGE = { pending_approval: 'badge-orange', approved: 'badge-blue', partially_received: 'badge-blue', received: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' };
const PO_LABEL = { pending_approval: 'Awaiting approval', approved: 'Approved - awaiting delivery', partially_received: 'Partly received', received: 'Fully received', rejected: 'Rejected', cancelled: 'Cancelled' };

export function RequestStatusBadge({ status }) {
  return <span className={`badge ${REQUEST_BADGE[status] || 'badge-gray'}`}>{REQUEST_LABEL[status] || status}</span>;
}
export function PoStatusBadge({ status }) {
  return <span className={`badge ${PO_BADGE[status] || 'badge-gray'}`}>{PO_LABEL[status] || status}</span>;
}
/** Line items of a material request (description, unit, quantity, optional specification). */
export function MaterialItemsEditor({ items, onChange, stockOptions = [] }) {
  const applyStockChoice = (idx, stockId) => {
    if (!stockId) return;
    if (stockId === '__custom__') {
      onChange(items.map((it, i) => (i === idx ? { ...it, sourceStockId: '__custom__', description: '', unit: '' } : it)));
      return;
    }
    const found = stockOptions.find((s) => s.id === stockId);
    if (!found) return;
    onChange(items.map((it, i) => (i === idx ? { ...it, sourceStockId: found.id, description: found.description, unit: found.unit } : it)));
  };
  const set = (idx, field, value) => onChange(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 560 }}>
          <thead>
            <tr><th>Material</th><th style={{ width: 90 }}>Unit</th><th style={{ width: 110 }}>Quantity</th><th>Specification</th><th style={{ width: 40 }} /></tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const matchedStock = stockOptions.find((s) => s.id === it.sourceStockId)
                || (it.sourceStockId !== '__custom__' ? stockOptions.find((s) => s.description === it.description && s.unit === it.unit) : null);
              const isFromStock = Boolean(matchedStock);
              const selectValue = isFromStock ? matchedStock.id : '__custom__';
              return (
              <tr key={idx}>
                <td>
                  {stockOptions.length > 0 && (
                    <select
                      className="form-select"
                      style={{ marginBottom: isFromStock ? 0 : 6, fontSize: 13 }}
                      value={selectValue}
                      onChange={(e) => applyStockChoice(idx, e.target.value)}
                    >
                      <optgroup label="In Site Stock (available now)">
                        {stockOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.description} ({qtyText(s.quantity)} {s.unit} in stock)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Not in Inventory">
                        <option value="__custom__">Other / Not in inventory (custom material)</option>
                      </optgroup>
                    </select>
                  )}
                  {(!stockOptions.length || !isFromStock) && (
                    <input className="form-input" aria-label={`Material ${idx + 1}`} maxLength={200} placeholder="e.g. Cement OPC 53 grade" value={it.description} onChange={(e) => set(idx, 'description', e.target.value)} />
                  )}
                </td>
                <td>
                  <input
                    className="form-input"
                    aria-label={`Unit ${idx + 1}`}
                    maxLength={20}
                    placeholder="bags"
                    value={it.unit}
                    disabled={isFromStock}
                    title={isFromStock ? 'Unit is locked to match Site Stock' : undefined}
                    style={isFromStock ? { background: '#f1f5f9', color: 'var(--text-muted)', cursor: 'not-allowed' } : undefined}
                    onChange={(e) => set(idx, 'unit', e.target.value)}
                  />
                </td>
                <td><input className="form-input" aria-label={`Quantity ${idx + 1}`} type="number" min="0" step="any" value={it.quantity} onChange={(e) => set(idx, 'quantity', e.target.value)} /></td>
                <td><input className="form-input" aria-label={`Specification ${idx + 1}`} maxLength={200} placeholder="optional" value={it.specification} onChange={(e) => set(idx, 'specification', e.target.value)} /></td>
                <td>
                  {items.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" aria-label="Remove line" onClick={() => onChange(items.filter((_, i) => i !== idx))}><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} disabled={items.length >= 30} onClick={() => onChange([...items, { description: '', unit: '', quantity: '', specification: '' }])}>
        <Plus size={13} /> Add material
      </button>
    </div>
  );
}

/** Current stock per project. */
export function StockTable({ rows, showProject = true, emptyText = 'No stock recorded yet.' }) {
  if (!rows.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{emptyText}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" data-testid="stock-table">
        <thead>
          <tr>{showProject && <th>Project</th>}<th>Material</th><th>Unit</th><th style={{ textAlign: 'right' }}>In stock</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {showProject && <td>{r.projectName}</td>}
              <td>{r.description}</td>
              <td>{r.unit}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: r.quantity === 0 ? 'var(--red)' : undefined }}>{qtyText(r.quantity)}</td>
              <td>{formatDate(r.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stock movements: every receipt (+) and issue (-) with the running balance. */
export function LedgerTable({ rows }) {
  if (!rows.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No stock movements yet.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead><tr><th>Date</th><th>Material</th><th>Type</th><th>Document</th><th style={{ textAlign: 'right' }}>Change</th><th style={{ textAlign: 'right' }}>Balance</th><th>By</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{formatDate(t.date)}</td>
              <td>{t.description}</td>
              <td><span className={`badge ${t.type === 'GRN' ? 'badge-green' : 'badge-orange'}`}>{t.type === 'GRN' ? 'Received' : 'Issued'}</span></td>
              <td>{t.refId}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: t.quantity < 0 ? 'var(--red)' : 'var(--green)' }}>{t.quantity > 0 ? '+' : ''}{qtyText(t.quantity)} {t.unit}</td>
              <td style={{ textAlign: 'right' }}>{qtyText(t.balanceAfter)}</td>
              <td>{t.byName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Read-only item table of a material request. */
export function RequestItemsTable({ items }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: 420 }}>
        <thead><tr><th>Material</th><th>Unit</th><th style={{ textAlign: 'right' }}>Requested</th>{items[0] && items[0].orderedQuantity !== undefined && <th style={{ textAlign: 'right' }}>Ordered</th>}</tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.description}{i.specification && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{i.specification}</div>}</td>
              <td>{i.unit}</td>
              <td style={{ textAlign: 'right' }}>{qtyText(i.quantity)}</td>
              {i.orderedQuantity !== undefined && <td style={{ textAlign: 'right' }}>{qtyText(i.orderedQuantity)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone === 'warn' && value > 0 ? 'var(--red)' : 'var(--primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
