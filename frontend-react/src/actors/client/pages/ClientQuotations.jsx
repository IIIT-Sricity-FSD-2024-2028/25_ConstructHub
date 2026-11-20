import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { QuotationStatusBadge, EmptyState } from '../../../components/marketplace/marketplaceUi';

/** Every quotation received across all of the client's requirements, newest first. */
export default function ClientQuotations() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const [quotes, reqs] = await Promise.all([api.getQuotations(), api.getRequirements()]);
      if (quotes && quotes.error) {
        setError(quotes.message);
        setRows([]);
        return;
      }
      const title = Object.fromEntries((Array.isArray(reqs) ? reqs : []).map((r) => [r.id, r.title]));
      setRows(
        (quotes || [])
          .map((q) => ({ ...q, requirementTitle: title[q.requirementId] || q.requirementId }))
          .sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id))
      );
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Received Quotations</h1>
        <p>Quotations from construction companies on your requirements. Open a requirement to compare them side by side and award one.</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      {rows === null ? (
        <div className="card">Loading...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No quotations yet" text="Post a requirement and companies will send their quotations here." />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr><th>Requirement</th><th>Company</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Days</th><th style={{ textAlign: 'right' }}>Advance</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td><Link to={`/client/requirements/${q.requirementId}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{q.requirementTitle}</Link></td>
                  <td>{q.company?.name || q.companyName}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(q.totalAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{q.durationDays}</td>
                  <td style={{ textAlign: 'right' }}>{q.mobilizationAdvancePercent ? `${q.mobilizationAdvancePercent}%` : '-'}</td>
                  <td><QuotationStatusBadge status={q.status} /></td>
                  <td>{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
