import { useState } from 'react';
import { FileText, Download, MapPin, Calendar, IndianRupee, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../services/utils';
import { formatINR } from '../../hooks/usePlans';
import { useToast } from '../../hooks/useToast';
import { budgetRange } from './marketplaceUiData';

const REQUIREMENT_BADGE = { open: 'badge-green', awarded: 'badge-blue', closed: 'badge-gray' };
const QUOTATION_BADGE = { estimating: 'badge-blue', submitted: 'badge-orange', accepted: 'badge-green', rejected: 'badge-red', withdrawn: 'badge-gray' };
const labelOf = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function RequirementStatusBadge({ status }) {
  return <span className={`badge ${REQUIREMENT_BADGE[status] || 'badge-gray'}`}>{labelOf(status)}</span>;
}

export function QuotationStatusBadge({ status }) {
  return <span className={`badge ${QUOTATION_BADGE[status] || 'badge-gray'}`}>{labelOf(status)}</span>;
}

/** Key facts about a requirement (shared by the client and company views). */
export function RequirementFacts({ requirement: r }) {
  const fact = (Icon, label, value) =>
    value ? (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Icon size={15} style={{ marginTop: 3, color: 'var(--text-muted)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
        </div>
      </div>
    ) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
      {fact(MapPin, 'Location', r.location)}
      {fact(IndianRupee, 'Budget range', budgetRange(r))}
      {fact(FileText, 'Type', r.projectType)}
      {fact(Clock, 'Expected duration', r.expectedDurationDays ? `${r.expectedDurationDays} days` : '')}
      {fact(Calendar, 'Preferred start', r.preferredStartDate ? formatDate(r.preferredStartDate) : '')}
      {fact(Calendar, 'Quotations accepted until', r.quotationDeadline ? formatDate(r.quotationDeadline) : 'No deadline')}
    </div>
  );
}

/** Private documents: downloaded with the login token, never via a public link. */
export function DocumentList({ requirementId, documents = [] }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');

  async function download(doc) {
    setBusy(doc.id);
    const res = await api.downloadRequirementDocument(requirementId, doc);
    setBusy('');
    if (res && res.error) toast.error(res.message);
  }

  if (!documents.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents attached.</p>;
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {documents.map((d) => (
        <div
          key={d.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <FileText size={16} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.originalName}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{Math.max(1, Math.round(d.size / 1024))} KB</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy === d.id} onClick={() => download(d)}>
            <Download size={13} /> {busy === d.id ? '...' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Work order / contract details. */
export function ContractSummary({ contract: c }) {
  return (
    <div className="card" style={{ borderLeft: '4px solid var(--green)' }}>
      <div className="section-header">
        <h3 className="section-title">Contract {c.id} · Work order {c.workOrderNumber}</h3>
        <span className="badge badge-green">{labelOf(c.status)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Info label="Contractor" value={c.companyName} />
        <Info label="Client" value={c.clientName} />
        <Info label="Contract value" value={formatINR(c.value)} />
        <Info label="Start" value={formatDate(c.startDate)} />
        <Info label="Planned end" value={formatDate(c.endDate)} />
        <Info label="Duration" value={`${c.durationDays} days`} />
      </div>
      <table className="data-table" style={{ marginBottom: 12 }}>
        <thead>
          <tr><th>Scope item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
        </thead>
        <tbody>
          {c.items.map((i, idx) => (
            <tr key={idx}>
              <td>{i.description}</td><td>{i.unit}</td>
              <td style={{ textAlign: 'right' }}>{i.quantity.toLocaleString('en-IN')}</td>
              <td style={{ textAlign: 'right' }}>{formatINR(i.rate)}</td>
              <td style={{ textAlign: 'right' }}>{formatINR(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{c.terms}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{text}</p>
    </div>
  );
}
