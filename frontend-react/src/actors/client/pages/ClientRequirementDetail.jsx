import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle2, XCircle, Pencil, Lock } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import { formatINR } from '../../../hooks/usePlans';
import { StageScheduleTable } from '../../../components/marketplace/EstimationUi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import RequirementForm from '../../../components/marketplace/RequirementForm';
import {
  RequirementStatusBadge, QuotationStatusBadge, RequirementFacts, DocumentList, ContractSummary
} from '../../../components/marketplace/marketplaceUi';

export default function ClientRequirementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const toast = useToast();
  const fileInput = useRef(null);

  const [req, setReq] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [acceptTarget, setAcceptTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const r = await api.getRequirement(id);
    if (r && r.error) {
      setError(r.message);
      return;
    }
    setError('');
    setReq(r);
    const q = await api.getRequirementQuotations(id);
    setQuotes(q && !q.error ? q : []);
    if (r.status === 'awarded') {
      const contracts = await api.getContracts();
      setContract((contracts && !contracts.error ? contracts : []).find((c) => c.requirementId === id) || null);
    } else {
      setContract(null);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function run(action, okMessage) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res && res.error) {
      toast.error(res.message);
      return false;
    }
    if (okMessage) toast.success(okMessage);
    await load();
    return true;
  }

  async function onFiles(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await run(() => api.uploadRequirementDocuments(id, files), 'Document(s) uploaded.');
    e.target.value = '';
  }

  async function accept() {
    const target = acceptTarget;
    setAcceptTarget(null);
    setBusy(true);
    const res = await api.acceptQuotation(target.id);
    setBusy(false);
    if (res && res.error) {
      toast.error(res.message || 'Could not accept quotation.');
      return;
    }
    if (outletCtx.refreshProjects) await outletCtx.refreshProjects();
    if (res?.project?.id) {
      toast.success(
        res.advanceBill
          ? `Awarded to ${target.companyName}. Pay the mobilization advance below to start site work.`
          : `Awarded to ${target.companyName}. Your project is now active.`
      );
      navigate(`/client/projects/${res.project.id}`);
      return;
    }
    toast.success(`Awarded to ${target.companyName}. Your contract and project are ready.`);
    await load();
  }

  async function reject() {
    const target = rejectTarget;
    setRejectTarget(null);
    await run(() => api.rejectQuotation(target.id, rejectReason.trim() || undefined), 'Quotation rejected.');
    setRejectReason('');
  }

  async function close() {
    setConfirmClose(false);
    await run(() => api.closeRequirement(id), 'Requirement closed.');
  }

  async function saveEdit(payload) {
    const ok = await run(() => api.updateRequirement(id, payload), 'Requirement updated.');
    if (ok) setEditing(false);
  }

  if (error) {
    return (
      <div>
        <Link to="/client/requirements" className="back-link" style={{ marginBottom: 8 }}><ArrowLeft size={14} /> Back to requirements</Link>
        <div className="error-msg" style={{ display: 'block', marginTop: 12 }}>{error}</div>
      </div>
    );
  }
  if (!req) return <div className="card">Loading...</div>;

  const isOpen = req.status === 'open';
  const hasQuotes = quotes.some((q) => q.status === 'submitted');
  const lowest = quotes.length ? Math.min(...quotes.map((q) => q.totalAmount)) : null;

  return (
    <div>
      <Link to="/client/requirements" className="back-link" style={{ marginBottom: 8 }}><ArrowLeft size={14} /> Back to requirements</Link>

      <div className="page-header-row" style={{ marginTop: 10 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>{req.title} <RequirementStatusBadge status={req.status} /></h1>
          <p>{req.id} · Posted {formatDate(req.createdAt)}</p>
        </div>
        {isOpen && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={hasQuotes || busy}
              title={hasQuotes ? 'Requirements with quotations cannot be edited' : ''}
              onClick={() => setEditing(true)}
            >
              {hasQuotes ? <Lock size={14} /> : <Pencil size={14} />} Edit
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirmClose(true)}>Close requirement</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ marginBottom: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{req.description}</p>
        <RequirementFacts requirement={req} />
        {isOpen && !req.acceptingQuotations && (
          <div className="error-msg" style={{ display: 'block', marginTop: 14 }}>
            The quotation deadline has passed, so companies can no longer send or change quotations. You can still accept one below.
          </div>
        )}
      </div>

      {req.status === 'awarded' && (
        <div style={{ marginBottom: 20 }}>
          {contract ? <ContractSummary contract={contract} /> : <div className="card">Contract details are loading...</div>}
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate(contract?.projectId ? `/client/projects/${contract.projectId}` : '/client/projects')}>View project progress</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <h3 className="section-title">Drawings & documents</h3>
          {isOpen && (
            <>
              <input ref={fileInput} type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={onFiles} />
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileInput.current && fileInput.current.click()}>
                <Upload size={13} /> Upload
              </button>
            </>
          )}
        </div>
        <DocumentList requirementId={req.id} documents={req.documents} />
        {isOpen && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>PDF, Word, Excel or images up to 10 MB each. Only you and companies browsing this requirement can open them.</p>}
      </div>

      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Quotations ({quotes.length})</h3>
          {quotes.length > 1 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sorted by price, lowest first</span>}
        </div>

        {quotes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            {isOpen ? 'No quotations yet. Companies will be notified of new requirements as they browse; you will get a notification for each quotation.' : 'No quotations were received.'}
          </p>
        ) : (
          <div className="hairline-list">
            {quotes.map((q) => (
              <div key={q.id} className="hairline-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{q.company?.name || q.companyName}</strong>{' '}
                    <QuotationStatusBadge status={q.status} />
                    {q.totalAmount === lowest && quotes.length > 1 && <span className="badge badge-green" style={{ marginLeft: 6 }}>Lowest price</span>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {q.company?.projectsCount ?? 0} project(s) on ConstructHub · {q.id} · submitted {formatDate(q.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{formatINR(q.totalAmount)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {q.durationDays} days{q.validUntil ? ` · valid until ${formatDate(q.validUntil)}` : ''}
                    </div>
                    {q.mobilizationAdvancePercent > 0 && (
                      <div style={{ fontSize: 12, marginTop: 2 }}>
                        Mobilization advance: <strong>{q.mobilizationAdvancePercent}%</strong> ({formatINR(Math.round((q.totalAmount * q.mobilizationAdvancePercent) / 100))})
                      </div>
                    )}
                  </div>
                </div>

                {q.milestoneStages?.length > 0 ? (
                  <details style={{ marginTop: 10 }} open={quotes.length === 1}>
                    <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>View milestone payment schedule</summary>
                    <div style={{ marginTop: 8 }}>
                      <StageScheduleTable stages={q.milestoneStages} advancePercent={q.mobilizationAdvancePercent} total={q.totalAmount} />
                    </div>
                    {q.notes && <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>{q.notes}</p>}
                  </details>
                ) : (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>View itemised quotation</summary>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ marginTop: 8, minWidth: 480 }}>
                      <thead><tr><th>Item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                      <tbody>
                        {q.items.map((i, idx) => (
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
                  {q.notes && <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-muted)' }}>{q.notes}</p>}
                </details>
                )}

                {q.statusReason && q.status === 'rejected' && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{q.statusReason}</p>}

                {isOpen && q.status === 'submitted' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => setAcceptTarget(q)}>
                      <CheckCircle2 size={13} /> Accept & award
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejectTarget(q)}>
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Award this project?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setAcceptTarget(null)}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={accept}>Accept & award</button>
          </>
        }
      >
        {acceptTarget && (
          <p style={{ lineHeight: 1.6 }}>
            You are accepting <strong>{acceptTarget.companyName}</strong>'s quotation of <strong>{formatINR(acceptTarget.totalAmount)}</strong> ({acceptTarget.durationDays} days).
            A contract and project will be created, and all other quotations will be rejected. This cannot be undone.{acceptTarget.mobilizationAdvancePercent > 0 && <> Work starts after you pay the {acceptTarget.mobilizationAdvancePercent}% mobilization advance ({formatINR(Math.round((acceptTarget.totalAmount * acceptTarget.mobilizationAdvancePercent) / 100))}).</>}
          </p>
        )}
      </Modal>

      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject quotation"
        subtitle={rejectTarget ? rejectTarget.companyName : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={reject}>Reject</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Reason (optional)</label>
          <textarea className="form-textarea" rows={3} maxLength={300} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
      </Modal>

      <Modal
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close this requirement?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmClose(false)}>Keep open</button>
            <button type="button" className="btn btn-danger" onClick={close}>Close requirement</button>
          </>
        }
      >
        <p style={{ lineHeight: 1.6 }}>Companies will no longer be able to quote, and any open quotations will be rejected.</p>
      </Modal>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit requirement" size="lg">
        <RequirementForm initial={req} submitting={busy} submitLabel="Save changes" onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
