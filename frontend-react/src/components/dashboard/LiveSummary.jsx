import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useLoad } from '../../store/hooks';
import { fetchDashboard, selectDashboard } from '../../features/finance/financeSlice';
import { inr } from '../procurement/procurementUiData';
import { formatINRCompact, statusBadgeClass } from '../../services/utils';

const RingSvg = ({ pct = 0 }) => {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = circ * (1 - clamped / 100);
  return (
    <svg width="62" height="62" viewBox="0 0 62 62" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
      <circle cx="31" cy="31" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx="31"
        cy="31"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ.toFixed(2)}
        strokeDashoffset={offset.toFixed(2)}
      />
    </svg>
  );
};

const Card = ({ label, value, sub, tone, to, testid, title }) => {
  const color =
    tone === 'bad'
      ? 'var(--red)'
      : tone === 'good'
        ? 'var(--green)'
        : tone === 'warn'
          ? 'var(--primary)'
          : 'var(--text)';

  const inner = (
    <>
      <div className="metric-cell-label">{label}</div>
      <div className="metric-cell-value" style={{ color }} title={title}>
        {value}
      </div>
      {sub && <div className="metric-cell-sub">{sub}</div>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="metric-cell" data-testid={testid} style={{ textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="metric-cell" data-testid={testid}>
      {inner}
    </div>
  );
};

const MiniTile = ({ label, value, sub, tone, to, title, compact = false, testid }) => {
  const color =
    tone === 'bad'
      ? 'var(--red)'
      : tone === 'good'
        ? 'var(--green)'
        : tone === 'warn'
          ? 'var(--primary)'
          : 'var(--text)';

  const content = (
    <>
      <div
        className="hero-mini-val"
        style={{ color, fontSize: compact ? 19 : 22 }}
        title={title}
      >
        {value}
      </div>
      <div className="hero-mini-lbl">{label}</div>
      {sub && <div className="hero-mini-sub">{sub}</div>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="hero-mini-card" data-testid={testid} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }
  return (
    <div className="hero-mini-card" data-testid={testid}>
      {content}
    </div>
  );
};

const Grid = ({ children }) => <div className="metric-ribbon">{children}</div>;

function HeroPanel({ title, sub, figure, figureTitle, metaPrefix, metaHighlight, metaSuffix, pct, viewMode, setViewMode, overviewTiles, detailedTiles }) {
  return (
    <div className="card hero-summary-card" style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
        </div>
        <div className="module-tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={`module-tab ${viewMode === 'overview' ? 'active' : ''}`} onClick={() => setViewMode('overview')}>
            Overview
          </button>
          <button type="button" className={`module-tab ${viewMode === 'detailed' ? 'active' : ''}`} onClick={() => setViewMode('detailed')}>
            Detailed Metrics
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', margin: '16px 0 12px' }}>
        <div
          style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(30px, 3.2vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}
          title={figureTitle}
        >
          {figure}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          {metaPrefix}
          <strong style={{ color: 'var(--green)', fontWeight: 600 }}>{metaHighlight}</strong>
          {metaSuffix}
        </div>
      </div>

      <div className="progress-track" style={{ height: 8, marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }} />
      </div>

      <div className={viewMode === 'overview' ? 'hero-mini-grid-4' : 'hero-mini-grid-6'}>
        {viewMode === 'overview' ? overviewTiles : detailedTiles}
      </div>
    </div>
  );
}

/** Company Admin: 3-column circular-ring portfolio cards */
function RingPortfolio({ rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>Active Project Portfolio</h3>
      <div className="portfolio-ring-grid">
        {rows.map((p) => {
          const isDelayed = p.delayedMilestones > 0;
          const badgeText = isDelayed ? 'Delayed' : (p.status || 'On Track');
          const badgeCls = isDelayed ? 'badge-red' : statusBadgeClass(p.status);
          return (
            <div key={p.id} className="portfolio-ring-card" data-testid={`project-row-${p.id}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 16.5, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                  <span className={`badge ${badgeCls}`}>{badgeText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <RingSvg pct={p.progress} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 15.5, fontWeight: 700 }}>{p.progress}% built</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.milestoneCompletion !== null && p.milestoneCompletion !== undefined
                        ? `${p.milestoneCompletion}% stages approved`
                        : `${p.milestonesTotal || 0} milestone(s)`}
                      {p.delayedMilestones > 0 ? ` · ${p.delayedMilestones} delayed` : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700, marginTop: 2 }} title={inr(p.budget)}>{formatINRCompact(p.budget)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Spent</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700, marginTop: 2 }} title={inr(p.spent)}>{formatINRCompact(p.spent)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Available</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 14.5, fontWeight: 700, marginTop: 2, color: p.available < 0 ? 'var(--red)' : 'var(--green)' }} title={inr(p.available)}>
                    {formatINRCompact(p.available)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Clean sans-serif linear progress cards for Finance Manager, Project Manager, and Client */
function LinearPortfolio({ rows, mode }) {
  if (!rows.length) return null;
  const heading =
    mode === 'finance'
      ? 'Project Budget Utilization'
      : mode === 'pm'
        ? 'Assigned Sites & Stage Progress'
        : 'Active Project Progress';

  return (
    <div style={{ marginBottom: 22 }}>
      <h3 className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>{heading}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((p) => {
          const isDelayed = p.delayedMilestones > 0;
          const barVal = mode === 'finance' ? (p.utilization || 0) : (p.progress || 0);
          return (
            <div key={p.id} className="card linear-project-card" data-testid={`project-row-${p.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h4 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: 0 }}>{p.name}</h4>
                    <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status || 'On Track'}</span>
                    {isDelayed && <span className="badge badge-red">{p.delayedMilestones} delayed</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {p.milestoneCompletion !== null && p.milestoneCompletion !== undefined
                      ? `${p.milestoneCompletion}% stages approved`
                      : `${p.milestonesTotal || 0} milestone(s)`}
                    {p.nextMilestone ? ` · Next stage: ${p.nextMilestone.name}` : ''}
                  </div>
                </div>
                {mode === 'client' && (
                  <Link to={`/client/projects/${p.id}`} className="btn btn-secondary btn-sm">
                    Open Workspace
                  </Link>
                )}
                {mode === 'pm' && (
                  <Link to={`/project-manager/projects/${p.id}`} className="btn btn-secondary btn-sm">
                    Open Project
                  </Link>
                )}
                {mode === 'finance' && (
                  <Link to="/finance-manager/budget" className="btn btn-secondary btn-sm">
                    View Budget
                  </Link>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, marginBottom: 7 }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {mode === 'finance' ? 'Site cap utilization' : 'Overall Completion'}
                </span>
                <strong style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>
                  {mode === 'finance' ? `${barVal}% used` : `${barVal}%`}
                </strong>
              </div>
              <div className="progress-track" style={{ height: 7 }}>
                <div className="progress-fill" style={{ width: `${Math.max(barVal > 0 ? 2 : 0, Math.min(100, barVal))}%` }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, paddingTop: 14, marginTop: 14, borderTop: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
                {mode === 'client' ? (
                  <>
                    <div>Contract: <strong style={{ color: 'var(--primary)' }} title={inr(p.contractValue)}>{formatINRCompact(p.contractValue)}</strong></div>
                    <div>Billed: <strong style={{ color: 'var(--text)' }} title={inr(p.billed)}>{formatINRCompact(p.billed)}</strong></div>
                    <div>Paid: <strong style={{ color: 'var(--green)' }} title={inr(p.paid)}>{formatINRCompact(p.paid)}</strong></div>
                    <div>Outstanding: <strong style={{ color: p.outstanding > 0 ? 'var(--red)' : 'var(--text)' }} title={inr(p.outstanding)}>{formatINRCompact(p.outstanding)}</strong></div>
                  </>
                ) : (
                  <>
                    <div>Budget: <strong style={{ color: 'var(--text)' }} title={inr(p.budget)}>{formatINRCompact(p.budget)}</strong></div>
                    <div>Spent: <strong style={{ color: 'var(--text)' }} title={inr(p.spent)}>{formatINRCompact(p.spent)}</strong></div>
                    <div>Committed: <strong style={{ color: 'var(--text)' }} title={inr(p.committed)}>{formatINRCompact(p.committed)}</strong></div>
                    <div>Available: <strong style={{ color: p.available < 0 ? 'var(--red)' : 'var(--green)' }} title={inr(p.available)}>{formatINRCompact(p.available)}</strong></div>
                    {mode === 'pm' && p.openTasks !== undefined && (
                      <div>Open Tasks: <strong style={{ color: 'var(--text)' }}>{p.openTasks}</strong></div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Real numbers from the server for every role's dashboard. Renders nothing for roles without a summary. */
export default function LiveSummary({ refreshKey = 0 }) {
  const { data: d, error } = useAppSelector(selectDashboard);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'detailed'
  useLoad([fetchDashboard], [refreshKey]);

  if (error) return <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>;
  if (!d || !d.role) return null;

  const isExecRole = d.role === 'finance_manager' || d.role === 'company_admin';
  const totalPendingApprovals = isExecRole
    ? (Number(d.pending?.expensesToApprove) || 0) + (Number(d.pending?.purchaseOrdersToApprove) || 0)
    : 0;

  // PM average build progress across assigned projects
  const pmAvgBuild = d.role === 'project_manager' && d.projects?.length
    ? Math.round(d.projects.reduce((s, p) => s + (Number(p.progress) || 0), 0) / d.projects.length)
    : 0;

  return (
    <div data-testid="live-summary" style={{ marginBottom: 18 }}>
      {d.role === 'client' && (
        <>
          <Grid>
            <Card label="Contract value" value={formatINRCompact(d.totals.contractValue)} title={inr(d.totals.contractValue)} sub={`${d.projects.length} project(s)`} />
            <Card label="Billed" value={formatINRCompact(d.totals.billed)} title={inr(d.totals.billed)} sub="Bills not declined" />
            <Card label="Paid" value={formatINRCompact(d.totals.paid)} title={inr(d.totals.paid)} tone="good" />
            <Card label="Outstanding" value={formatINRCompact(d.totals.outstanding)} title={inr(d.totals.outstanding)} tone={d.totals.outstanding > 0 ? 'bad' : undefined} sub="Accepted bills not yet paid" to="/client/pending-bills" />
            <Card label="Bills to decide" value={d.totals.pendingBills} sub={d.totals.pendingBills ? formatINRCompact(d.totals.pendingAmount) : 'All decided'} tone={d.totals.pendingBills ? 'bad' : undefined} to="/client/pending-bills" />
            <Card label="Open requirements" value={d.requirements.open} sub={`${d.requirements.quotationsToReview} quotation(s) to review`} to="/client/requirements" />
          </Grid>
          <LinearPortfolio rows={d.projects} mode="client" />
        </>
      )}

      {d.role === 'project_manager' && (
        <>
          <HeroPanel
            title="Portfolio Build Progress"
            sub={`Weighted completion across your ${d.totals.projects} assigned project(s)`}
            figure={`${pmAvgBuild}%`}
            metaPrefix="built · "
            metaHighlight={`${d.totals.projects} active site(s)`}
            metaSuffix={d.totals.delayedMilestones ? ` · ${d.totals.delayedMilestones} milestone(s) delayed` : ' · on schedule'}
            pct={pmAvgBuild}
            viewMode={viewMode}
            setViewMode={setViewMode}
            overviewTiles={(
              <>
                <MiniTile label="Open tasks" value={d.totals.openTasks} sub={`${d.totals.overdueTasks} overdue`} tone={d.totals.overdueTasks ? 'bad' : undefined} to="/project-manager/tasks" />
                <MiniTile label="Delayed milestones" value={d.totals.delayedMilestones} sub="Past deadline" tone={d.totals.delayedMilestones ? 'bad' : 'good'} to="/project-manager/milestones" />
                <MiniTile label="Material requests" value={d.pending.materialRequests} sub="Waiting PM review" tone={d.pending.materialRequests ? 'warn' : undefined} to="/project-manager/material-requests" />
                <MiniTile label="Milestones to approve" value={d.pending.milestonesToApprove} sub="Ready for sign-off" tone={d.pending.milestonesToApprove ? 'warn' : undefined} to="/project-manager/milestones" />
              </>
            )}
            detailedTiles={(
              <>
                <MiniTile compact label="Projects" value={d.totals.projects} sub="Assigned" to="/project-manager/projects" />
                <MiniTile compact label="Open tasks" value={d.totals.openTasks} sub={`${d.totals.overdueTasks} overdue`} tone={d.totals.overdueTasks ? 'bad' : undefined} to="/project-manager/tasks" />
                <MiniTile compact label="Delayed milestones" value={d.totals.delayedMilestones} sub="Needs review" tone={d.totals.delayedMilestones ? 'bad' : undefined} to="/project-manager/milestones" />
                <MiniTile compact label="Material reqs" value={d.pending.materialRequests} sub="To review" tone={d.pending.materialRequests ? 'warn' : undefined} to="/project-manager/material-requests" />
                <MiniTile compact label="Expenses to verify" value={d.pending.expensesToVerify} sub="Field claims" tone={d.pending.expensesToVerify ? 'bad' : undefined} to="/project-manager/expenses" />
                <MiniTile compact label="Ready to approve" value={d.pending.milestonesToApprove} sub="Stage sign-off" tone={d.pending.milestonesToApprove ? 'warn' : undefined} to="/project-manager/milestones" />
              </>
            )}
          />
          <LinearPortfolio rows={d.projects} mode="pm" />
        </>
      )}

      {d.role === 'company_admin' && (
        <>
          <HeroPanel
            title="Total Site Budget"
            sub={`${d.budget.utilization}% used or committed across all company projects`}
            figure={formatINRCompact(d.budget.total)}
            figureTitle={inr(d.budget.total)}
            metaPrefix="total · "
            metaHighlight={formatINRCompact(d.budget.available)}
            metaSuffix=" available"
            pct={d.budget.utilization}
            viewMode={viewMode}
            setViewMode={setViewMode}
            overviewTiles={(
              <>
                <MiniTile label="Receivable outstanding" value={formatINRCompact(d.receivables.outstanding)} title={inr(d.receivables.outstanding)} sub={d.receivables.overdue ? `${formatINRCompact(d.receivables.overdue)} overdue` : 'Nothing overdue'} tone={d.receivables.overdue ? 'bad' : undefined} />
                <MiniTile label="Average progress" value={`${d.totals?.averageProgress ?? 0}%`} sub={`${d.totals?.delayedMilestones ?? 0} milestone(s) delayed`} tone="warn" />
                <MiniTile label="Pending approvals" value={totalPendingApprovals} sub={`${d.pending.expensesToApprove} expense(s) · ${d.pending.purchaseOrdersToApprove} PO(s)`} tone={totalPendingApprovals > 0 ? 'bad' : 'good'} />
                <MiniTile label="Marketplace" value={d.totals?.openMarketplaceRequirements ?? 0} sub={`open reqs · ${d.totals?.myQuotationsPending ?? 0} quote(s) pending`} tone="warn" to="/company-admin/marketplace" />
              </>
            )}
            detailedTiles={(
              <>
                <MiniTile compact testid="fm-budget" label="Total budget" value={formatINRCompact(d.budget.total)} title={inr(d.budget.total)} sub={`${d.budget.utilization}% used`} />
                <MiniTile compact label="Spent (approved)" value={formatINRCompact(d.budget.spent)} title={inr(d.budget.spent)} sub="Approved expenses" />
                <MiniTile compact label="Committed (POs)" value={formatINRCompact(d.budget.committed)} title={inr(d.budget.committed)} sub="Active orders" />
                <MiniTile compact label="Available" value={formatINRCompact(d.budget.available)} title={inr(d.budget.available)} sub="Remaining cap" tone={d.budget.available < 0 ? 'bad' : 'good'} />
                <MiniTile compact label="Receivable" value={formatINRCompact(d.receivables.outstanding)} title={inr(d.receivables.outstanding)} sub={d.receivables.overdue ? `${formatINRCompact(d.receivables.overdue)} overdue` : 'None overdue'} tone={d.receivables.overdue ? 'bad' : undefined} />
                <MiniTile compact label="Collected" value={formatINRCompact(d.receivables.paid)} title={inr(d.receivables.paid)} sub={`${d.receivables.pendingBills} bill(s) awaiting`} tone="good" />
                <MiniTile compact label="Expenses to approve" value={d.pending.expensesToApprove} sub={`${d.pending.expensesAwaitingPm} with PMs`} tone={d.pending.expensesToApprove ? 'bad' : undefined} />
                <MiniTile compact label="POs to approve" value={d.pending.purchaseOrdersToApprove} sub="Pending FM" tone={d.pending.purchaseOrdersToApprove ? 'bad' : undefined} />
                <MiniTile compact label="Reimbursements due" value={d.pending.reimbursements} sub="Not yet paid back" tone={d.pending.reimbursements ? 'bad' : undefined} />
                <MiniTile compact label="Material reqs" value={d.pending.materialRequests} sub="With PMs" tone={d.pending.materialRequests ? 'warn' : undefined} />
                <MiniTile compact label="Average progress" value={`${d.totals?.averageProgress ?? 0}%`} sub={`${d.totals?.delayedMilestones ?? 0} delayed`} tone="warn" />
                <MiniTile compact label="Marketplace" value={d.totals?.openMarketplaceRequirements ?? 0} sub={`${d.totals?.myQuotationsPending ?? 0} quote(s) pending`} tone="warn" to="/company-admin/marketplace" />
              </>
            )}
          />
          <RingPortfolio rows={d.projects} />
        </>
      )}

      {d.role === 'finance_manager' && (
        <>
          <HeroPanel
            title="Site Budget & Cashflow"
            sub={`${d.budget.utilization}% spent or committed across your assigned projects`}
            figure={formatINRCompact(d.budget.total)}
            figureTitle={inr(d.budget.total)}
            metaPrefix="budget · "
            metaHighlight={formatINRCompact(d.budget.available)}
            metaSuffix=" available"
            pct={d.budget.utilization}
            viewMode={viewMode}
            setViewMode={setViewMode}
            overviewTiles={(
              <>
                <MiniTile label="Receivable outstanding" value={formatINRCompact(d.receivables.outstanding)} title={inr(d.receivables.outstanding)} sub={d.receivables.overdue ? `${formatINRCompact(d.receivables.overdue)} overdue` : 'Nothing overdue'} tone={d.receivables.overdue ? 'bad' : undefined} to="/finance-manager/bill-decisions" />
                <MiniTile label="Collected" value={formatINRCompact(d.receivables.paid)} title={inr(d.receivables.paid)} sub={`${d.receivables.pendingBills} bill(s) awaiting client`} tone="good" to="/finance-manager/bill-decisions" />
                <MiniTile label="Pending approvals" value={totalPendingApprovals} sub={`${d.pending.expensesToApprove} expense(s) · ${d.pending.purchaseOrdersToApprove} PO(s)`} tone={totalPendingApprovals > 0 ? 'bad' : 'good'} to="/finance-manager/purchase-orders" />
                <MiniTile label="Reimbursements due" value={d.pending.reimbursements} sub="Approved, not yet paid" tone={d.pending.reimbursements ? 'bad' : 'good'} to="/finance-manager/expenses" />
              </>
            )}
            detailedTiles={(
              <>
                <MiniTile compact testid="fm-budget" label="Total budget" value={formatINRCompact(d.budget.total)} title={inr(d.budget.total)} sub={`${d.budget.utilization}% used`} />
                <MiniTile compact label="Spent (approved)" value={formatINRCompact(d.budget.spent)} title={inr(d.budget.spent)} sub="Approved claims" />
                <MiniTile compact label="Committed (POs)" value={formatINRCompact(d.budget.committed)} title={inr(d.budget.committed)} sub="Active POs" />
                <MiniTile compact label="Available" value={formatINRCompact(d.budget.available)} title={inr(d.budget.available)} sub="Remaining cap" tone={d.budget.available < 0 ? 'bad' : 'good'} />
                <MiniTile compact label="Receivable" value={formatINRCompact(d.receivables.outstanding)} title={inr(d.receivables.outstanding)} sub={d.receivables.overdue ? `${formatINRCompact(d.receivables.overdue)} overdue` : 'None overdue'} tone={d.receivables.overdue ? 'bad' : undefined} to="/finance-manager/bill-decisions" />
                <MiniTile compact label="Collected" value={formatINRCompact(d.receivables.paid)} title={inr(d.receivables.paid)} sub={`${d.receivables.pendingBills} awaiting`} tone="good" />
                <MiniTile compact label="Expenses to approve" value={d.pending.expensesToApprove} sub={`${d.pending.expensesAwaitingPm} with PMs`} tone={d.pending.expensesToApprove ? 'bad' : undefined} to="/finance-manager/expenses" />
                <MiniTile compact label="POs to approve" value={d.pending.purchaseOrdersToApprove} sub="Pending sign-off" tone={d.pending.purchaseOrdersToApprove ? 'bad' : undefined} to="/finance-manager/purchase-orders" />
                <MiniTile compact label="Reimbursements due" value={d.pending.reimbursements} sub="Not yet paid" tone={d.pending.reimbursements ? 'bad' : undefined} to="/finance-manager/expenses" />
                <MiniTile compact label="Material reqs" value={d.pending.materialRequests} sub="With PMs" tone={d.pending.materialRequests ? 'warn' : undefined} />
              </>
            )}
          />
          <LinearPortfolio rows={d.projects} mode="finance" />
        </>
      )}

      {d.role === 'superuser' && (
        <Grid>
          <Card label="Open requirements" value={d.marketplace.openRequirements} sub={`${d.marketplace.awardedRequirements} awarded · ${d.marketplace.closedRequirements} closed`} />
          <Card label="Quotations submitted" value={d.marketplace.quotationsSubmitted} sub="Across all firms" />
          <Card label="Active contracts" value={d.marketplace.contracts} sub={formatINRCompact(d.marketplace.contractValue)} title={inr(d.marketplace.contractValue)} />
          <Card label="Marketplace projects" value={d.projects.fromMarketplace} sub={`${d.projects.active} active globally`} />
        </Grid>
      )}
    </div>
  );
}
