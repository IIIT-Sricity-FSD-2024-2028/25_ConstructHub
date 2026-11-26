import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import {
  fetchRequirement, fetchQuotations, fetchContracts, assignEstimateTeam, releaseQuotation, updateQuotation, withdrawQuotation,
  selectRequirementById, selectAllQuotations, selectAllContracts
} from '../../../features/marketplace/marketplaceSlice';
import { fetchUsers, selectAllUsers } from '../../../features/users/usersSlice';
import { ArrowLeft, Pencil, Undo2, UserPlus } from 'lucide-react';
import { formatDate } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import QuotationForm, { QuotationReleaseForm } from '../../../components/marketplace/QuotationForm';
import { EstimationStepper, StageScheduleTable } from '../../../components/marketplace/EstimationUi';
import {
  RequirementStatusBadge, QuotationStatusBadge, RequirementFacts, DocumentList, ContractSummary
} from '../../../components/marketplace/marketplaceUi';

export default function CompanyMarketplaceDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const req = useAppSelector((state) => selectRequirementById(state, id)) || null;
  const quotes = useAppSelector(selectAllQuotations);
  const contracts = useAppSelector(selectAllContracts);
  const quote = (req?.myQuotationId && quotes.find((q) => q.id === req.myQuotationId)) || null; // this company's quotation (if any)
  const contract = req?.awardedToMe ? contracts.find((c) => c.requirementId === id) || null : null;
  const allUsers = useAppSelector(selectAllUsers);
  const staff = allUsers.filter((u) => u.companyId === user?.companyId && u.status !== 'inactive');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [pmId, setPmId] = useState('');
  const [fmId, setFmId] = useState('');

  // The requirement, then this company's quotation on it and (when won) the contract.
  const load = useCallback(async () => {
    try {
      const r = await dispatch(fetchRequirement(id)).unwrap();
      setError('');
      if (r.myQuotationId) dispatch(fetchQuotations());
      if (r.awardedToMe) dispatch(fetchContracts());
    } catch (err) {
      setError(errorText(err));
    }
  }, [dispatch, id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  useLoad([fetchUsers]);

  /** Runs one quotation step, then reloads the page data. Returns true when it worked. */
  async function run(action, okMessage) {
    setSaving(true);
    try {
      await dispatch(action).unwrap();
    } catch (err) {
      toast.error(errorText(err));
      return false;
    } finally {
      setSaving(false);
    }
    toast.success(okMessage);
    await load();
    return true;
  }

  const pms = staff.filter((u) => u.role === 'project_manager');
  const fms = staff.filter((u) => u.role === 'finance_manager');
  const nameOf = (uid) => staff.find((u) => u.id === uid)?.name || uid;

  function openTeam() {
    setPmId(quote?.assignedPmId || pms[0]?.id || '');
    setFmId(quote?.assignedFmId || fms[0]?.id || '');
    setTeamOpen(true);
  }

  async function assignTeam() {
    if (await run(assignEstimateTeam({ requirementId: id, pmId, fmId }), 'Estimate opened. The PM and FM have been notified.')) setTeamOpen(false);
  }

  async function release(payload) {
    await run(releaseQuotation({ id: quote.id, data: payload }), 'Quotation sent to the client.');
  }

  // Only an older single-screen quotation (no PM/FM stages) can be edited directly; new ones go through estimation.
  async function save(payload) {
    if (await run(updateQuotation({ id: quote.id, changes: payload }), 'Quotation updated.')) setEditing(false);
  }

  async function withdraw() {
    setConfirmWithdraw(false);
    await run(withdrawQuotation(quote.id), quote.status === 'estimating' ? 'Estimate cancelled.' : 'Quotation withdrawn.');
  }

  if (error) {
    return (
      <div>
        <Link to="/company-admin/marketplace" className="back-link" style={{ marginBottom: 8 }}><ArrowLeft size={14} /> Back to marketplace</Link>
        <div className="error-msg" style={{ display: 'block', marginTop: 12 }}>{error}</div>
      </div>
    );
  }
  if (!req) return <div className="card">Loading...</div>;

  const active = quote && quote.status !== 'withdrawn';
  const canQuote = req.acceptingQuotations && !active;
  const estimating = active && quote.status === 'estimating';
  const staged = active && quote.milestoneStages && quote.milestoneStages.length > 0 && !estimating;
  const noStaff = pms.length === 0 || fms.length === 0;

  return (
    <div>
      <Link to="/company-admin/marketplace" className="back-link" style={{ marginBottom: 8 }}><ArrowLeft size={14} /> Back to marketplace</Link>

      <div className="page-header" style={{ marginTop: 10 }}>
        <h1>{req.title} <RequirementStatusBadge status={req.status} /></h1>
        <p>{req.id} · Posted by {req.clientName} on {formatDate(req.createdAt)}</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ marginBottom: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{req.description}</p>
        <RequirementFacts requirement={req} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header"><h3 className="section-title">Drawings & documents</h3></div>
        <DocumentList requirementId={req.id} documents={req.documents} />
      </div>

      {req.awardedToMe && contract && (
        <div style={{ marginBottom: 20 }}>
          <div className="card" style={{ marginBottom: 12, background: '#f0fdf4' }}>
            <strong>You won this project!</strong> Assign a project manager and finance manager from{' '}
            <Link to="/company-admin/dashboard?tab=projects" style={{ color: 'var(--primary)', fontWeight: 600 }}>Projects</Link> to get started.
          </div>
          <ContractSummary contract={contract} />
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Your quotation</h3>
          {active && <QuotationStatusBadge status={quote.status} />}
        </div>

        {estimating ? (
          <div>
            <EstimationStepper status={quote.estimationStatus} mode="admin" />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Estimate {quote.id} · PM: <strong>{nameOf(quote.assignedPmId)}</strong> · FM: <strong>{nameOf(quote.assignedFmId)}</strong>
            </p>
            {quote.estimationStatus === 'assigned' && (
              <p>Waiting for the project manager to define the milestone stages, durations and material scope.</p>
            )}
            {quote.estimationStatus === 'pm_submitted' && (
              <div>
                <p style={{ marginBottom: 10 }}>The project manager submitted {quote.milestoneStages.length} stage(s) ({quote.durationDays} days). Waiting for the finance manager to price them.</p>
                <StageScheduleTable stages={quote.milestoneStages} />
              </div>
            )}
            {quote.estimationStatus === 'fm_submitted' && (
              <div>
                <p style={{ marginBottom: 12 }}>Both steps are done. Add your profit markup to see the client quote, then release it.</p>
                <QuotationReleaseForm quote={quote} submitting={saving} onRelease={release} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {quote.estimationStatus !== 'fm_submitted' && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={openTeam}><UserPlus size={13} /> Change PM / FM</button>
              )}
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmWithdraw(true)}><Undo2 size={13} /> Cancel estimate</button>
            </div>
          </div>
        ) : active ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(quote.totalAmount)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {quote.durationDays} days{quote.validUntil ? ` · valid until ${formatDate(quote.validUntil)}` : ''} · {quote.id}
              </div>
            </div>
            {staged ? (
              <div>
                <StageScheduleTable stages={quote.milestoneStages} showInternal advancePercent={quote.mobilizationAdvancePercent} total={quote.totalAmount} />
                <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>
                  Internal base cost {formatINR(quote.internalBaseCost)} · markup {quote.markupPercent}% · PM {nameOf(quote.assignedPmId)} · FM {nameOf(quote.assignedFmId)}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 480 }}>
                  <thead><tr><th>Item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {quote.items.map((i, idx) => (
                      <tr key={idx}>
                        <td>{i.description}</td><td>{i.unit}</td>
                        <td style={{ textAlign: 'right' }}>{i.quantity.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(i.rate)}</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quote.notes && <p style={{ fontSize: 13, marginTop: 10, color: 'var(--text-muted)' }}>{quote.notes}</p>}
            {quote.statusReason && quote.status === 'rejected' && <p style={{ fontSize: 13, marginTop: 10 }}>{quote.statusReason}</p>}

            {quote.status === 'submitted' && req.acceptingQuotations && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {!staged && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Pencil size={13} /> Edit quotation</button>}
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmWithdraw(true)}><Undo2 size={13} /> Withdraw</button>
              </div>
            )}
          </div>
        ) : canQuote ? (
          <div>
            <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Quotations are prepared by your team: you assign a <strong>Project Manager</strong> (milestone stages, durations, materials) and a{' '}
              <strong>Finance Manager</strong> (internal cost per stage and advance %). When both are done you add your profit markup and send the quote to the client.
            </p>
            {noStaff && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>Your company needs at least one Project Manager and one Finance Manager. Add them under Team Members first.</div>}
            <button type="button" className="btn btn-primary" disabled={noStaff} onClick={openTeam}><UserPlus size={14} /> Assign PM & FM for Estimate</button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>
            {quote?.status === 'withdrawn' ? 'You withdrew your quotation, and this requirement is no longer accepting new ones.' : 'This requirement is no longer accepting quotations.'}
          </p>
        )}
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit your quotation" size="lg">
        {quote && <QuotationForm initial={quote} submitting={saving} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} />}
      </Modal>

      <Modal
        isOpen={teamOpen}
        onClose={() => setTeamOpen(false)}
        title="Assign PM & FM for estimate"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTeamOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={saving || !pmId || !fmId} onClick={assignTeam}>{saving ? 'Saving...' : 'Assign'}</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Project Manager (defines stages and materials)</label>
          <select className="form-select" value={pmId} onChange={(e) => setPmId(e.target.value)}>
            {pms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Finance Manager (prices the stages)</label>
          <select className="form-select" value={fmId} onChange={(e) => setFmId(e.target.value)}>
            {fms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Both will be notified. The client cannot see the quotation until you release it.</p>
      </Modal>

      <Modal
        isOpen={confirmWithdraw}
        onClose={() => setConfirmWithdraw(false)}
        title={estimating ? 'Cancel this estimate?' : 'Withdraw your quotation?'}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmWithdraw(false)}>Keep it</button>
            <button type="button" className="btn btn-danger" onClick={withdraw}>Withdraw</button>
          </>
        }
      >
        <p>{estimating ? 'The work done by the PM and FM on this estimate will be discarded. You can open a new estimate while the requirement is still open.' : 'The client will no longer see this quotation. You can open a new estimate while the requirement is still open.'}</p>
      </Modal>
    </div>
  );
}
