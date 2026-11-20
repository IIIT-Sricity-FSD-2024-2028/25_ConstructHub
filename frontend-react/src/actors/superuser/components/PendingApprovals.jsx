import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../services/utils';

/**
 * Platform admin onboarding queue: companies that self-registered and wait for approval.
 * Approved companies can sign in; rejected ones see the reason on the login page.
 */
export default function PendingApprovals({ companies, onChanged }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // company being rejected
  const [reason, setReason] = useState('');

  const pending = companies.filter((c) => c.approvalStatus === 'pending');
  const rejected = companies.filter((c) => c.approvalStatus === 'rejected');

  async function decide(company, decision, why) {
    setBusyId(company.id);
    const res = await api.setCompanyApproval(company.id, decision, why);
    setBusyId(null);
    if (res && res.error) {
      toast.error(res.message || 'Could not save the decision.');
      return false;
    }
    toast.success(`${company.name} ${decision}.`);
    onChanged && onChanged();
    return true;
  }

  async function confirmReject() {
    if (!reason.trim()) {
      toast.error('Please enter a reason for rejecting this company.');
      return;
    }
    const ok = await decide(rejecting, 'rejected', reason.trim());
    if (ok) {
      setRejecting(null);
      setReason('');
    }
  }

  const baseColumns = [
    {
      key: 'name',
      label: 'Company',
      render: (c) => (
        <div>
          <strong>{c.name}</strong>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {c.code} · @{c.domain}
          </div>
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (c) => (
        <div>
          <div>{c.ownerEmail}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>
        </div>
      )
    },
    { key: 'plan', label: 'Requested plan', render: (c) => <span className="badge badge-orange">{c.plan || 'Basic'}</span> },
    { key: 'createdAt', label: 'Registered', render: (c) => (c.createdAt ? formatDate(c.createdAt) : '—') }
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Companies awaiting approval</h3>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{pending.length} pending</span>
        </div>
        <DataTable
          data={pending}
          emptyMessage="No companies are waiting for approval."
          columns={[
            ...baseColumns,
            {
              key: 'actions',
              label: 'Decision',
              render: (c) => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={busyId === c.id}
                    onClick={() => decide(c, 'approved')}
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busyId === c.id}
                    onClick={() => {
                      setRejecting(c);
                      setReason('');
                    }}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {rejected.length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Rejected registrations</h3>
          </div>
          <DataTable
            data={rejected}
            columns={[
              ...baseColumns,
              { key: 'reason', label: 'Reason', render: (c) => c.approvalReason || '—' },
              {
                key: 'actions',
                label: 'Action',
                render: (c) => (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={busyId === c.id}
                    onClick={() => decide(c, 'approved')}
                  >
                    <CheckCircle2 size={13} /> Approve instead
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject company registration"
        subtitle={rejecting ? rejecting.name : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRejecting(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmReject} disabled={busyId === rejecting?.id}>
              Reject company
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">
            Reason <span className="req">*</span>
          </label>
          <textarea
            className="form-input"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="This is shown to the company when they try to sign in."
          />
        </div>
      </Modal>
    </div>
  );
}
