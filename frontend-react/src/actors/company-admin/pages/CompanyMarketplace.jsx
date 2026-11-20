import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import DataTable from '../../../components/common/DataTable';
import { RequirementStatusBadge, QuotationStatusBadge, EmptyState } from '../../../components/marketplace/marketplaceUi';
import { PROJECT_TYPES, budgetRange } from '../../../components/marketplace/marketplaceUiData';

export default function CompanyMarketplace() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('open'); // open | mine
  const [filters, setFilters] = useState({ q: '', location: '', projectType: '', minBudget: '', maxBudget: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getRequirements({ scope, ...filters });
    setLoading(false);
    if (res && res.error) {
      setError(res.message);
      return;
    }
    setError('');
    setItems(res || []);
  }, [scope, filters]);

  // Re-query shortly after the filters stop changing.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    {
      key: 'title',
      label: 'Requirement',
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.id} · {r.location} · {r.projectType}</div>
        </div>
      )
    },
    { key: 'budget', label: 'Client budget', render: (r) => budgetRange(r) },
    { key: 'client', label: 'Posted by', render: (r) => r.clientName },
    {
      key: 'deadline',
      label: 'Quote by',
      render: (r) => (r.quotationDeadline ? formatDate(r.quotationDeadline) : '—')
    },
    {
      key: 'status',
      label: scope === 'mine' ? 'Outcome' : 'Your quotation',
      render: (r) => {
        if (scope === 'mine') {
          if (r.status === 'awarded') return r.awardedToMe ? <span className="badge badge-green">Won</span> : <span className="badge badge-gray">Not selected</span>;
          return r.myQuotationStatus ? <QuotationStatusBadge status={r.myQuotationStatus} /> : <RequirementStatusBadge status={r.status} />;
        }
        return r.hasQuoted ? <QuotationStatusBadge status={r.myQuotationStatus} /> : <span style={{ color: 'var(--text-muted)' }}>Not quoted</span>;
      }
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Marketplace</h1>
        <p>Browse construction requirements from clients and send quotations to win projects.</p>
      </div>

      <div className="module-tabs">
        <button type="button" className={`module-tab ${scope === 'open' ? 'active' : ''}`} onClick={() => setScope('open')}>Open requirements</button>
        <button type="button" className={`module-tab ${scope === 'mine' ? 'active' : ''}`} onClick={() => setScope('mine')}>My quotations</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Search..." value={filters.q} onChange={set('q')} />
          </div>
          <input className="form-input" placeholder="Location" value={filters.location} onChange={set('location')} />
          <select className="form-select" value={filters.projectType} onChange={set('projectType')}>
            <option value="">All types</option>
            {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className="form-input" type="number" min="0" placeholder="Budget from ₹" value={filters.minBudget} onChange={set('minBudget')} />
          <input className="form-input" type="number" min="0" placeholder="Budget to ₹" value={filters.maxBudget} onChange={set('maxBudget')} />
        </div>
      </div>

      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={scope === 'mine' ? 'No quotations yet' : 'No requirements match'}
          text={scope === 'mine' ? 'Open a requirement from the marketplace and send your first quotation.' : 'Try clearing the filters, or check back later for new requirements.'}
        />
      ) : (
        <div className="card">
          <DataTable data={items} columns={columns} emptyMessage={loading ? 'Loading...' : 'Nothing found'} onRowClick={(r) => navigate(`/company-admin/marketplace/${r.id}`)} />
        </div>
      )}
    </div>
  );
}
