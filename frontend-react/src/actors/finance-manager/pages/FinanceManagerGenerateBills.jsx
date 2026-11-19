import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import ReportPreviewModal from '../../../components/common/ReportPreviewModal';

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

/**
 * Stage (RA) billing. On a project with milestones the Finance Manager can only bill a milestone the project manager
 * approved: the amount is the quoted stage price, the site reports of that milestone are attached as proof,
 * and the invoice number is issued by the server.
 */
export default function FinanceManagerGenerateBills() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [milestoneId, setMilestoneId] = useState('');
  const [dueDate, setDueDate] = useState(plusDays(15));
  const [description, setDescription] = useState('');
  // Projects without a milestone plan keep the older free-form bill.
  const [legacyMilestone, setLegacyMilestone] = useState('');
  const [legacyAmount, setLegacyAmount] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(async () => {
      const all = await api.getProjects(user.companyId);
      const mine = (all || []).filter((p) => p.financeManagerId === user.id || (!p.financeManagerId && user.role === 'superuser'));
      setProjects(mine);
      setProjectId((cur) => cur || mine[0]?.id || '');
    });
  }, [user]);

  const loadSheet = useCallback(async () => {
    if (!projectId) return;
    const res = await api.getBillableSheet(projectId);
    if (res && res.error) {
      setLoadError(res.message);
      setSheet(null);
      return;
    }
    setLoadError('');
    setSheet(res);
  }, [projectId]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setMilestoneId('');
      setError('');
      return loadSheet();
    });
  }, [loadSheet]);

  const project = projects.find((p) => p.id === projectId);
  const rows = sheet?.milestones || [];
  const legacy = !!sheet && rows.length === 0;
  const billable = rows.filter((m) => m.billable);
  const picked = rows.find((m) => m.id === milestoneId);

  async function submit(e) {
    e.preventDefault();
    setError('');
    let payload;
    if (legacy) {
      if (!legacyMilestone.trim()) return setError('Enter what this bill is for.');
      if (!(Number(legacyAmount) > 0)) return setError('Amount must be greater than 0.');
      if (!description.trim()) return setError('Description is required.');
      payload = { projectId, milestone: legacyMilestone.trim(), amount: Number(legacyAmount), description: description.trim(), dueDate };
    } else {
      if (!picked) return setError('Choose an approved milestone to bill.');
      payload = { projectId, milestoneId: picked.id, description: description.trim() || undefined, dueDate };
    }
    if (!dueDate || dueDate < plusDays(0)) return setError('Due date cannot be in the past.');
    setBusy(true);
    const saved = await api.createBill(payload);
    setBusy(false);
    if (saved && saved.error) return setError(saved.message);
    if (project?.clientId) {
      await api.createNotification({
        userId: project.clientId, title: 'New Bill Pending',
        body: `Invoice ${saved.billNumber} for ${project.name} (${formatCurrency(saved.amount)}) requires your decision.`,
        time: 'just now', read: false,
      });
    }
    toast.success(`${saved.billNumber} sent to the client.`);
    setCreated(saved);
    setMilestoneId('');
    setDescription('');
    setLegacyMilestone('');
    setLegacyAmount('');
    loadSheet();
  }

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="page-header">
        <h1>Generate Stage Bill</h1>
        <p>Bill the client for a milestone the project manager has approved. The quoted stage price and the site reports are attached automatically.</p>
      </div>

      {loadError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{loadError}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ maxWidth: 420 }}>
          <label className="form-label">Project</label>
          <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {sheet && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5 }}>
            <span>Contract value: <strong>{formatCurrency(sheet.project.contractValue)}</strong></span>
            <span>Billed so far: <strong>{formatCurrency(sheet.project.billedTotal)}</strong></span>
            <span>Remaining to bill: <strong>{formatCurrency(sheet.project.remaining)}</strong></span>
          </div>
        )}
      </div>

      {sheet && !legacy && (
        <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
          <h3 className="section-title" style={{ marginBottom: 10 }}>Milestones</h3>
          <table className="data-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>Milestone</th><th>Status</th><th style={{ textAlign: 'right' }}>Quoted stage amount</th><th style={{ textAlign: 'right' }}>Bill after advance recovery</th><th style={{ textAlign: 'right' }}>Site reports</th>
                <th style={{ textAlign: 'right' }}>PO spend</th><th style={{ textAlign: 'right' }}>Expense spend</th><th style={{ textAlign: 'right' }}>Internal budget</th><th>Billing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.status}</td>
                  <td style={{ textAlign: 'right' }}>{m.clientStageAmount !== null ? formatCurrency(m.clientStageAmount) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{m.netBillAmount !== null ? formatCurrency(m.netBillAmount) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{m.siteReportCount}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(m.poSpend)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(m.expenseSpend)}</td>
                  <td style={{ textAlign: 'right' }}>{m.internalBudget !== null ? formatCurrency(m.internalBudget) : '-'}</td>
                  <td>
                    {m.billed ? <span className="badge badge-green">Billed {m.billNumber}</span>
                      : m.billable ? <span className="badge badge-blue">Ready to bill</span>
                        : <span className="badge badge-gray"><Lock size={11} /> {m.status === 'Completed' ? 'No site report' : 'Not approved'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheet && (
        <div className="card">
          <form onSubmit={submit}>
            {error && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{error}</div>}
            {legacy ? (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Bill for <span className="req">*</span></label>
                  <input className="form-input" value={legacyMilestone} maxLength={100} onChange={(e) => setLegacyMilestone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) <span className="req">*</span></label>
                  <input className="form-input" type="number" min="1" value={legacyAmount} onChange={(e) => setLegacyAmount(e.target.value)} />
                </div>
                <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-muted)' }}>This project has no milestone plan, so a free-form bill is allowed.</p>
              </div>
            ) : (
              <div>
                <div className="form-group" style={{ maxWidth: 480 }}>
                  <label className="form-label">Approved milestone <span className="req">*</span></label>
                  <select className="form-select" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} disabled={billable.length === 0}>
                    <option value="">{billable.length === 0 ? 'No approved milestone is waiting to be billed' : 'Select milestone'}</option>
                    {billable.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                {picked && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>BILL AMOUNT</div><div style={{ fontSize: 20, fontWeight: 800 }}>{picked.netBillAmount !== null ? formatCurrency(picked.netBillAmount) : 'Set by you on the server'}</div>
                        {picked.clientStageAmount !== null && picked.advanceRecovery > 0 && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quoted stage {formatCurrency(picked.clientStageAmount)} less advance recovery {formatCurrency(picked.advanceRecovery)}</div>
                        )}</div>
                      <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>INTERNAL SPEND SO FAR</div><div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(picked.poSpend + picked.expenseSpend)} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>of {picked.internalBudget !== null ? formatCurrency(picked.internalBudget) : 'n/a'}</span></div></div>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Proof attached: <strong>{picked.siteReportCount} site report(s)</strong>{' '}
                      {picked.siteReportIds.map((id) => (
                        <button key={id} type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 6 }} onClick={() => setPreviewId(id)}>{id.length > 12 ? id.slice(0, 8) : id}</button>
                      ))}
                    </div>
                  </div>
                )}
                {picked && picked.clientStageAmount === null && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>This milestone has no quoted price (it was created by hand), so the amount cannot be filled in automatically.</p>
                )}
              </div>
            )}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Due date</label>
                <input className="form-input" type="date" min={plusDays(0)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Note to the client {legacy && <span className="req">*</span>}</label>
                <textarea className="form-textarea" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={busy || (!legacy && !picked)}>{busy ? 'Generating...' : 'Generate bill'}</button>
            </div>
          </form>
        </div>
      )}

      <ReportPreviewModal reportId={previewId} onClose={() => setPreviewId(null)} />

      <Modal
        isOpen={!!created}
        onClose={() => setCreated(null)}
        title="Bill generated"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreated(null)}>Bill another</button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/finance-manager/bill-decisions')}>View bills</button>
          </>
        }
      >
        {created && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={40} color="var(--green)" />
            <p style={{ marginTop: 10 }}><strong>{created.billNumber}</strong> for {formatCurrency(created.amount)} was sent to {created.clientName || 'the client'}.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
