import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UserSettings from '../../../components/common/UserSettings';
import { api } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { inr } from '../../../components/procurement/procurementUiData';

/** Purchase orders above this amount need the Finance Manager's approval. */
function PurchaseLimitCard() {
  const toast = useToast();
  const [limit, setLimit] = useState('');
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getProcurementSettings().then((s) => {
      if (s && !s.error) {
        setSaved(s.poApprovalLimit);
        setLimit(String(s.poApprovalLimit));
      }
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    const n = Number(limit);
    if (limit === '' || !Number.isInteger(n) || n < 0) return toast.error('Enter a whole number of rupees (0 or more).');
    setSaving(true);
    const res = await api.updateProcurementSettings(n);
    setSaving(false);
    if (res && res.error) return toast.error(res.message);
    setSaved(res.poApprovalLimit);
    toast.success('Purchase approval limit updated.');
  }

  return (
    <div className="card" style={{ maxWidth: 640, marginBottom: 20 }}>
      <div className="section-header"><h3 className="section-title">Purchase approval limit</h3></div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Purchase orders above this amount, or above what is left of the project budget, must be approved by the project's Finance Manager before material can be received.
        {saved !== null && <> Currently <strong>{inr(saved)}</strong>.</>}
      </p>
      <form onSubmit={save} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Limit (₹)</label>
          <input className="form-input" aria-label="Purchase approval limit" type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save limit'}</button>
      </form>
    </div>
  );
}

export default function CompanyAdminSettings() {
  const { user, setUser } = useOutletContext();
  return (
    <>
      <PurchaseLimitCard />
      <UserSettings user={user} onUpdateUser={setUser} />
    </>
  );
}
