import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, isFirstLoad, errorText } from '../../../store/hooks';
import { fetchEstimates, submitFmEstimate, selectAllEstimates, selectEstimatesStatus } from '../../../features/marketplace/marketplaceSlice';
import { Send } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { useToast } from '../../../hooks/useToast';
import { EstimationStepper } from '../../../components/marketplace/EstimationUi';
import { round2 } from '../../../components/marketplace/estimationMath';

function CostEditor({ estimate, onSaved }) {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const stages = estimate.milestoneStages || [];
  const [costs, setCosts] = useState(stages.map((s) => (s.internalCost !== undefined && s.internalCost !== null ? String(s.internalCost) : '')));
  const [advance, setAdvance] = useState(estimate.mobilizationAdvancePercent !== undefined && estimate.mobilizationAdvancePercent !== null ? String(estimate.mobilizationAdvancePercent) : '15');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const total = round2(costs.reduce((s, c) => s + (Number(c) || 0), 0));
  const totalDays = stages.reduce((s, st) => s + st.durationDays, 0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    for (const [i, c] of costs.entries()) {
      if (!(Number(c) >= 1)) return setError(`Stage ${i + 1}: enter the internal cost.`);
    }
    const pct = Number(advance);
    if (advance === '' || !Number.isFinite(pct) || pct < 0 || pct > 50) return setError('Mobilization advance must be between 0 and 50 percent.');
    setSaving(true);
    try {
      await dispatch(submitFmEstimate({ id: estimate.id, data: {
        stages: costs.map((c) => ({ internalCost: Number(c) })),
        mobilizationAdvancePercent: pct,
      } })).unwrap();
    } catch (err) {
      return setError(errorText(err));
    } finally {
      setSaving(false);
    }
    toast.success('Costs submitted to the Company Admin.');
    onSaved();
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 640 }}>
          <thead>
            <tr><th style={{ width: 36 }}>#</th><th>Stage (from PM)</th><th style={{ width: 90, textAlign: 'right' }}>Days</th><th style={{ width: 190 }}>Internal site cost (INR)</th></tr>
          </thead>
          <tbody>
            {stages.map((st, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{st.name}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.materialScope}</div></td>
                <td style={{ textAlign: 'right' }}>{st.durationDays}</td>
                <td><input className="form-input" type="number" min="1" step="any" value={costs[i]} onChange={(e) => setCosts((p) => p.map((c, k) => (k === i ? e.target.value : c)))} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={2} style={{ fontWeight: 700 }}>Internal base cost</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{totalDays}</td><td style={{ fontWeight: 700 }}>{formatINR(total)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="form-group">
          <label className="form-label">Mobilization advance % <span className="req">*</span></label>
          <input className="form-input" type="number" min="0" max="50" step="any" value={advance} onChange={(e) => setAdvance(e.target.value)} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Share of the client quote payable before work starts (0 to 50).</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your total across all stages becomes the internal site budget cap for this project.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}><Send size={14} /> {saving ? 'Submitting...' : estimate.estimationStatus === 'fm_submitted' ? 'Update costs' : 'Submit costs'}</button>
      </div>
    </form>
  );
}

export default function FinanceManagerBidEstimates() {
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectAllEstimates);
  const status = useAppSelector(selectEstimatesStatus);
  const error = useAppSelector((state) => state.marketplace.estimates.error) || '';
  const estimates = isFirstLoad(status, list.length > 0) ? null : list;
  useLoad([fetchEstimates]);
  // After saving, reload the list: the estimate moves to its next stage (and may leave this list).
  const load = () => dispatch(fetchEstimates());

  return (
    <div>
      <div className="page-header">
        <h1>Bid Estimates</h1>
        <p>Price the stages the Project Manager defined. An estimate appears here once the PM has submitted it.</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      {estimates === null ? (
        <div className="card">Loading...</div>
      ) : estimates.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-muted)' }}>No estimates are waiting for your pricing.</div>
      ) : (
        estimates.map((est) => (
          <div className="card" key={est.id} style={{ marginBottom: 20 }}>
            <div className="section-header">
              <h3 className="section-title">{est.requirement?.title || est.requirementId}</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{est.id}</span>
            </div>
            <EstimationStepper status={est.estimationStatus} />
            {est.requirement && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                {est.requirement.location} · {est.requirement.projectType} · client budget {formatINR(est.requirement.budgetMin)} to {formatINR(est.requirement.budgetMax)}
                {est.requirement.quotationDeadline ? ` · quotes close ${formatDate(est.requirement.quotationDeadline)}` : ''}
              </p>
            )}
            <CostEditor estimate={est} onSaved={load} />
          </div>
        ))
      )}
    </div>
  );
}
