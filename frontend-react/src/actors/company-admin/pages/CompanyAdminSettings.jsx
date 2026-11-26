import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import { fetchProcurementSettings, updateProcurementSettings, selectProcurementSettings } from '../../../features/procurement/procurementSlice';
import { useOutletContext } from 'react-router-dom';
import UserSettings from '../../../components/common/UserSettings';
import { useToast } from '../../../hooks/useToast';
import { inr } from '../../../components/procurement/procurementUiData';

/** Purchase orders above this amount need the Finance Manager's approval. */
function PurchaseLimitCard() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const saved = useAppSelector(selectProcurementSettings)?.poApprovalLimit ?? null;
  // The input shows the saved limit until the admin types a new one.
  const [typed, setLimit] = useState(null);
  const limit = typed ?? (saved !== null ? String(saved) : '');
  const [saving, setSaving] = useState(false);
  useLoad([fetchProcurementSettings]);

  async function save(e) {
    e.preventDefault();
    const n = Number(limit);
    if (limit === '' || !Number.isInteger(n) || n < 0) return toast.error('Enter a whole number of rupees (0 or more).');
    setSaving(true);
    try {
      await dispatch(updateProcurementSettings(n)).unwrap();
    } catch (err) {
      return toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
    setLimit(null);
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
  const { user } = useOutletContext();
  return (
    <>
      <PurchaseLimitCard />
      <UserSettings user={user} />
    </>
  );
}
