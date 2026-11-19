import { Check } from 'lucide-react';
import { formatINR } from '../../hooks/usePlans';

import { round2 } from './estimationMath';

const BID_STEPS = [
  { key: 'assigned', pendingLabel: 'Stages not defined', doneLabel: 'Stages defined' },
  { key: 'pm_submitted', pendingLabel: 'Prices not set', doneLabel: 'Prices set' },
  { key: 'fm_submitted', pendingLabel: 'Quote not released', doneLabel: 'Quote released' },
  { key: 'submitted', pendingLabel: 'Not sent to client', doneLabel: 'Sent to client' },
];

const ADMIN_STEPS = [
  { key: 'assigned', pendingLabel: 'PM: Stages not defined', doneLabel: 'PM: Stages defined' },
  { key: 'pm_submitted', pendingLabel: 'FM: Prices not set', doneLabel: 'FM: Prices set' },
  { key: 'fm_submitted', pendingLabel: 'Admin: Markup pending', doneLabel: 'Admin: Markup added' },
  { key: 'submitted', pendingLabel: 'Not sent to client', doneLabel: 'Sent to client' },
];

/**
 * Four-step tracker for a bid estimate.
 * - Default (`mode="bid"` in PM/FM Bid Estimates): shows stage/price state transitions without role-instruction or markup wording.
 * - Admin (`mode="admin"` in Company Admin view): shows role-prefixed stage and markup state transitions.
 */
export function EstimationStepper({ status, mode = 'bid' }) {
  const steps = mode === 'admin' ? ADMIN_STEPS : BID_STEPS;
  const current = Math.max(0, steps.findIndex((s) => s.key === status));
  return (
    <ol style={{ display: 'flex', gap: 8, flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
      {steps.map((s, i) => {
        const done = i < current || status === 'submitted';
        const active = i === current && status !== 'submitted';
        return (
          <li
            key={s.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)',
              background: done ? '#f0fdf4' : active ? 'var(--primary-light, #eff6ff)' : 'transparent',
              color: done ? '#166534' : active ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            {done ? <Check size={13} /> : <span>{i + 1}.</span>} {done ? s.doneLabel : s.pendingLabel}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Milestone payment schedule. Pass `showInternal` for company staff (adds the internal cost and margin per stage);
 * the client version only ever shows the stage price.
 */
export function StageScheduleTable({ stages = [], showInternal = false, advancePercent, total }) {
  const sum = total ?? stages.reduce((s, st) => s + (Number(st.clientAmount) || 0), 0);
  const advance = advancePercent ? round2((sum * advancePercent) / 100) : 0;
  const dayMarks = stages.reduce((acc, st) => [...acc, (acc[acc.length - 1] || 0) + (Number(st.durationDays) || 0)], []);
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: showInternal ? 640 : 480 }}>
          <thead>
            <tr>
              <th>#</th><th>Stage</th><th style={{ textAlign: 'right' }}>Days</th>
              {showInternal && <th style={{ textAlign: 'right' }}>Internal cost</th>}
              <th style={{ textAlign: 'right' }}>Client amount</th>
              <th style={{ textAlign: 'right' }}>% of quote</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((st, i) => {
              const pct = sum > 0 ? Math.round(((Number(st.clientAmount) || 0) / sum) * 1000) / 10 : 0;
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{st.name}</strong>
                    {st.materialScope && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.materialScope}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{st.durationDays} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(day {dayMarks[i]})</span></td>
                  {showInternal && <td style={{ textAlign: 'right' }}>{st.internalCost !== undefined ? formatINR(st.internalCost) : '-'}</td>}
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{st.clientAmount !== undefined ? formatINR(st.clientAmount) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showInternal ? 3 : 3} style={{ fontWeight: 700 }}>Total</td>
              {showInternal && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(round2(stages.reduce((s, st) => s + (Number(st.internalCost) || 0), 0)))}</td>}
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(sum)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {advancePercent > 0 && (
        <p style={{ fontSize: 13, marginTop: 8 }}>
          Mobilization advance: <strong>{advancePercent}%</strong> ({formatINR(advance)}) is payable before work starts. Each stage is billed when it is completed and approved.
        </p>
      )}
    </div>
  );
}
