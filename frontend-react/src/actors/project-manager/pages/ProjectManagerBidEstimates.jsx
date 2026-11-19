import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import { EstimationStepper } from '../../../components/marketplace/EstimationUi';

const blankStage = () => ({ name: '', durationDays: '', materialScope: '' });

function StageEditor({ estimate, onSaved }) {
  const toast = useToast();
  const [stages, setStages] = useState(
    estimate.milestoneStages?.length
      ? estimate.milestoneStages.map((s) => ({ name: s.name, durationDays: String(s.durationDays), materialScope: s.materialScope }))
      : [blankStage()]
  );
  const [notes, setNotes] = useState(estimate.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const readOnly = !estimate.canEdit;

  const setStage = (idx, field, value) => setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  const totalDays = stages.reduce((sum, s) => sum + (parseInt(s.durationDays, 10) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    for (const [i, s] of stages.entries()) {
      if (s.name.trim().length < 3) return setError(`Stage ${i + 1}: enter a name (at least 3 characters).`);
      if (!(parseInt(s.durationDays, 10) >= 1)) return setError(`Stage ${i + 1}: enter the duration in days.`);
      if (!s.materialScope.trim()) return setError(`Stage ${i + 1}: describe the material scope.`);
    }
    setSaving(true);
    const res = await api.submitPmEstimate(estimate.id, {
      milestoneStages: stages.map((s) => ({ name: s.name.trim(), durationDays: parseInt(s.durationDays, 10), materialScope: s.materialScope.trim() })),
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (res && res.error) return setError(res.message);
    toast.success('Stages submitted to the Finance Manager.');
    onSaved();
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 640 }}>
          <thead>
            <tr><th style={{ width: 36 }}>#</th><th>Milestone stage</th><th style={{ width: 110 }}>Days</th><th>Material scope</th><th style={{ width: 40 }} /></tr>
          </thead>
          <tbody>
            {stages.map((s, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input className="form-input" value={s.name} maxLength={100} disabled={readOnly} placeholder="e.g. Foundation and plinth" onChange={(e) => setStage(i, 'name', e.target.value)} /></td>
                <td><input className="form-input" type="number" min="1" max="3650" value={s.durationDays} disabled={readOnly} onChange={(e) => setStage(i, 'durationDays', e.target.value)} /></td>
                <td><input className="form-input" value={s.materialScope} maxLength={1000} disabled={readOnly} placeholder="e.g. Cement 400 bags, steel 6 t" onChange={(e) => setStage(i, 'materialScope', e.target.value)} /></td>
                <td>
                  {!readOnly && stages.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" aria-label="Remove stage" onClick={() => setStages((p) => p.filter((_, k) => k !== i))}><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 14px' }}>
        {!readOnly ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={stages.length >= 20} onClick={() => setStages((p) => [...p, blankStage()])}><Plus size={13} /> Add stage</button>
        ) : <span />}
        <div>Total duration: <strong>{totalDays} days</strong></div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes for the Finance Manager</label>
        <textarea className="form-textarea" rows={2} maxLength={2000} value={notes} disabled={readOnly} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Define the milestone stages, durations in days, and material scope for this estimate.</p>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}><Send size={14} /> {saving ? 'Submitting...' : estimate.estimationStatus === 'pm_submitted' ? 'Update stages' : 'Submit stages'}</button>
        </div>
      )}
      {readOnly && <p style={{ fontSize: 13 }}>The Finance Manager has already priced these stages, so they are locked.</p>}
    </form>
  );
}

export default function ProjectManagerBidEstimates() {
  const [estimates, setEstimates] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await api.getEstimates();
    if (res && res.error) {
      setError(res.message);
      setEstimates([]);
      return;
    }
    setError('');
    setEstimates(res || []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <div>
      <div className="page-header">
        <h1>Bid Estimates</h1>
        <p>Requirements the Company Admin assigned to you. Define the milestone stages, durations and material scope for each.</p>
      </div>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      {estimates === null ? (
        <div className="card">Loading...</div>
      ) : estimates.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-muted)' }}>No bid estimates are assigned to you right now.</div>
      ) : (
        estimates.map((est) => (
          <div className="card" key={est.id} style={{ marginBottom: 20 }}>
            <div className="section-header">
              <h3 className="section-title">{est.requirement?.title || est.requirementId}</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{est.id}</span>
            </div>
            <EstimationStepper status={est.estimationStatus} />
            {est.requirement && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                {est.requirement.location} · {est.requirement.projectType} · client expects about {est.requirement.expectedDurationDays} days
                {est.requirement.quotationDeadline ? ` · quotes close ${formatDate(est.requirement.quotationDeadline)}` : ''}
                <br />{est.requirement.description}
              </p>
            )}
            <StageEditor estimate={est} onSaved={load} />
          </div>
        ))
      )}
    </div>
  );
}
