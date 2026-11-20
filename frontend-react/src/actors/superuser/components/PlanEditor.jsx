import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

const numberOrEmpty = (v) => (v === '' || v === null || v === undefined ? '' : String(v));

/**
 * Platform admin: edit subscription plan prices, limits and overage rates.
 * Changes apply to the whole platform immediately (limits, revenue, company subscription pages).
 */
export default function PlanEditor({ plansData, onChanged }) {
  const toast = useToast();
  const [forms, setForms] = useState({});
  const [overage, setOverage] = useState({ extraUserMonthly: '', extraProjectMonthly: '' });
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!plansData) return;
    const next = {};
    plansData.plans.forEach((p) => {
      next[p.name] = {
        monthlyPrice: numberOrEmpty(p.monthlyPrice),
        annualPrice: numberOrEmpty(p.annualPrice),
        userLimit: numberOrEmpty(p.userLimit),
        projectLimit: numberOrEmpty(p.projectLimit)
      };
    });
    void Promise.resolve().then(() => {
      setForms(next);
      setOverage({
        extraUserMonthly: numberOrEmpty(plansData.overageRates.extraUserMonthly),
        extraProjectMonthly: numberOrEmpty(plansData.overageRates.extraProjectMonthly)
      });
    });
  }, [plansData]);

  if (!plansData) {
    return <div className="card">Plans could not be loaded. Make sure the backend is running.</div>;
  }

  function setField(plan, field, value) {
    setForms((prev) => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }));
  }

  function toNumbers(obj) {
    const out = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== '') out[k] = Number(v);
    });
    return out;
  }

  async function savePlan(name) {
    setSaving(name);
    const res = await api.updatePlan(name, toNumbers(forms[name]));
    setSaving('');
    if (res && res.error) {
      toast.error(res.message || 'Could not save the plan.');
      return;
    }
    toast.success(`${name} plan updated.`);
    onChanged && onChanged();
  }

  async function saveOverage() {
    setSaving('overage');
    const res = await api.updateOverageRates(toNumbers(overage));
    setSaving('');
    if (res && res.error) {
      toast.error(res.message || 'Could not save the overage rates.');
      return;
    }
    toast.success('Overage rates updated.');
    onChanged && onChanged();
  }

  const field = (label, value, onChange, step = 1) => (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label">{label}</label>
      <input className="form-input" type="number" min="0" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}
      >
        {plansData.plans.map((p) => {
          const f = forms[p.name];
          if (!f) return null;
          return (
            <div className="card" key={p.name}>
              <h3 className="section-title" style={{ marginBottom: 4 }}>
                {p.name}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{p.description}</p>
              {field('Monthly price (₹)', f.monthlyPrice, (v) => setField(p.name, 'monthlyPrice', v))}
              {field('Annual price (₹)', f.annualPrice, (v) => setField(p.name, 'annualPrice', v))}
              {field('User limit', f.userLimit, (v) => setField(p.name, 'userLimit', v))}
              {field('Project limit', f.projectLimit, (v) => setField(p.name, 'projectLimit', v))}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving === p.name}
                onClick={() => savePlan(p.name)}
              >
                <Save size={13} /> {saving === p.name ? 'Saving...' : `Save ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <h3 className="section-title" style={{ marginBottom: 4 }}>
          Overage rates
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Charged per month to companies with overage billing enabled when they exceed their plan limits.
        </p>
        {field('Per extra user (₹ / month)', overage.extraUserMonthly, (v) => setOverage((o) => ({ ...o, extraUserMonthly: v })))}
        {field('Per extra project (₹ / month)', overage.extraProjectMonthly, (v) => setOverage((o) => ({ ...o, extraProjectMonthly: v })))}
        <button type="button" className="btn btn-primary btn-sm" disabled={saving === 'overage'} onClick={saveOverage}>
          <Save size={13} /> {saving === 'overage' ? 'Saving...' : 'Save overage rates'}
        </button>
      </div>
    </div>
  );
}
