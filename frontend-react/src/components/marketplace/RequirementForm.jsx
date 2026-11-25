import { useState } from 'react';
import { PROJECT_TYPES } from './marketplaceUiData';
import { localDateISO } from '../../services/utils';

const today = () => localDateISO();

/** Create / edit form for a construction requirement. */
export default function RequirementForm({ initial, submitting, submitLabel = 'Publish requirement', onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    location: initial?.location || '',
    projectType: initial?.projectType || 'Residential',
    budgetMin: initial?.budgetMin !== undefined ? String(initial.budgetMin) : '',
    budgetMax: initial?.budgetMax !== undefined ? String(initial.budgetMax) : '',
    expectedDurationDays: initial?.expectedDurationDays ? String(initial.expectedDurationDays) : '',
    preferredStartDate: initial?.preferredStartDate || '',
    quotationDeadline: initial?.quotationDeadline || ''
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    setError('');
    if (form.title.trim().length < 5) return setError('Title must be at least 5 characters.');
    if (form.description.trim().length < 10) return setError('Please describe the work in at least 10 characters.');
    if (!form.location.trim()) return setError('Enter the project location.');
    const min = Number(form.budgetMin);
    const max = Number(form.budgetMax);
    if (form.budgetMin === '' || form.budgetMax === '' || min < 0 || max < 0) return setError('Enter a budget range.');
    if (max < min) return setError('Maximum budget cannot be lower than the minimum.');
    if (form.quotationDeadline && form.quotationDeadline < today()) return setError('The quotation deadline cannot be in the past.');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      projectType: form.projectType,
      budgetMin: min,
      budgetMax: max
    };
    if (form.expectedDurationDays) payload.expectedDurationDays = parseInt(form.expectedDurationDays, 10);
    if (form.preferredStartDate) payload.preferredStartDate = form.preferredStartDate;
    if (form.quotationDeadline) payload.quotationDeadline = form.quotationDeadline;
    onSubmit(payload);
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">Title <span className="req">*</span></label>
        <input className="form-input" maxLength={120} value={form.title} onChange={set('title')} placeholder="e.g. 3BHK independent villa construction" />
      </div>
      <div className="form-group">
        <label className="form-label">Description <span className="req">*</span></label>
        <textarea className="form-textarea" rows={4} maxLength={5000} value={form.description} onChange={set('description')} placeholder="Size, floors, materials, finish level, anything companies should know." />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Location <span className="req">*</span></label>
          <input className="form-input" maxLength={200} value={form.location} onChange={set('location')} placeholder="City, State" />
        </div>
        <div className="form-group">
          <label className="form-label">Project type</label>
          <select className="form-select" value={form.projectType} onChange={set('projectType')}>
            {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Budget from (₹) <span className="req">*</span></label>
          <input className="form-input" type="number" min="0" value={form.budgetMin} onChange={set('budgetMin')} />
        </div>
        <div className="form-group">
          <label className="form-label">Budget to (₹) <span className="req">*</span></label>
          <input className="form-input" type="number" min="0" value={form.budgetMax} onChange={set('budgetMax')} />
        </div>
      </div>
      <div className="grid-3">
        <div className="form-group">
          <label className="form-label">Expected duration (days)</label>
          <input className="form-input" type="number" min="1" max="3650" value={form.expectedDurationDays} onChange={set('expectedDurationDays')} />
        </div>
        <div className="form-group">
          <label className="form-label">Preferred start</label>
          <input className="form-input" type="date" min={today()} value={form.preferredStartDate} onChange={set('preferredStartDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Quotations until</label>
          <input className="form-input" type="date" min={today()} value={form.quotationDeadline} onChange={set('quotationDeadline')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
}
