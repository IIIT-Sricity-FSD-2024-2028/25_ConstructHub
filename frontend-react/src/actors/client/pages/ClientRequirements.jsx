import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector, useLoad, isFirstLoad } from '../../../store/hooks';
import {
  createRequirement, fetchRequirements, selectAllRequirements, selectRequirementsStatus
} from '../../../features/marketplace/marketplaceSlice';
import { formatDate } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import RequirementForm from '../../../components/marketplace/RequirementForm';
import { RequirementStatusBadge, EmptyState } from '../../../components/marketplace/marketplaceUi';
import { budgetRange } from '../../../components/marketplace/marketplaceUiData';

export default function ClientRequirements() {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const requirements = useAppSelector(selectAllRequirements);
  const status = useAppSelector(selectRequirementsStatus);
  const loadError = useAppSelector((state) => state.marketplace.requirements.error) || '';
  const loading = isFirstLoad(status, requirements.length > 0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  useLoad([fetchRequirements]);

  async function create(payload) {
    setSaving(true);
    let res;
    try {
      res = await dispatch(createRequirement(payload)).unwrap();
    } catch (message) {
      toast.error(message);
      return;
    } finally {
      setSaving(false);
    }
    toast.success('Requirement published. Companies can now send quotations.');
    setShowForm(false);
    navigate(`/client/requirements/${res.id}`); // let the client attach drawings right away
  }

  const columns = [
    {
      key: 'title',
      label: 'Requirement',
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.id} · {r.location}</div>
        </div>
      )
    },
    { key: 'budget', label: 'Budget', render: (r) => budgetRange(r) },
    { key: 'status', label: 'Status', render: (r) => <RequirementStatusBadge status={r.status} /> },
    {
      key: 'quotes',
      label: 'Quotations',
      align: 'center',
      render: (r) => (r.status === 'open' && r.quotationCount > 0 ? <span className="badge badge-orange">{r.quotationCount} to review</span> : r.quotationCount)
    },
    { key: 'createdAt', label: 'Posted', render: (r) => formatDate(r.createdAt) }
  ];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>My Requirements</h1>
          <p>Post what you want built, compare quotations from verified companies, and award the work.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Post requirement
        </button>
      </div>

      {loadError && <div className="error-msg" style={{ display: 'block' }}>{loadError}</div>}

      {!loading && !loadError && requirements.length === 0 ? (
        <EmptyState title="No requirements yet" text="Post your first construction requirement to start receiving quotations." />
      ) : (
        <div className="card">
          <DataTable data={requirements} columns={columns} emptyMessage={loading ? 'Loading...' : 'No requirements'} onRowClick={(r) => navigate(`/client/requirements/${r.id}`)} />
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Post a construction requirement" subtitle="Verified companies will be able to send you quotations." size="lg">
        <RequirementForm submitting={saving} onSubmit={create} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
