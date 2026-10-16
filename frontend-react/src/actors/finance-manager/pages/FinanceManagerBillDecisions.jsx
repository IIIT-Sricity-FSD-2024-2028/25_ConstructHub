import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Edit2, Eye, Receipt, Plus } from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  statusBadgeClass,
  normalizeBillStatus
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';

export default function FinanceManagerBillDecisions() {
  const { user } = useOutletContext();
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    milestone: '',
    amount: '',
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    loadBills();
  }, [user]);

  async function loadBills() {
    if (!user) return;
    const [pList, bList] = await Promise.all([
      api.getProjects(user.companyId),
      api.getBills(user.companyId)
    ]);
    const myProjects = (pList || []).filter(
      (p) => p.financeManagerId === user.id || (!p.financeManagerId && user.role === 'superuser')
    );
    const myProjectIds = new Set(myProjects.map((p) => p.id));
    const myBills = (bList || []).filter((b) => myProjectIds.has(b.projectId));
    setBills(myBills);
  }

  function openEdit(b) {
    const norm = normalizeBillStatus(b.status);
    if (norm === 'Accepted' || norm === 'Declined') {
      alert('This bill has already been decided by the client (' + norm + ') and cannot be edited.');
      return;
    }
    setEditModal(b);
    setEditForm({
      id: b.id,
      milestone: b.milestone || '',
      amount: b.amount || '',
      dueDate: b.dueDate || '',
      description: b.description || ''
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editForm.milestone || !editForm.amount) return;

    if (editModal) {
      const norm = normalizeBillStatus(editModal.status);
      if (norm === 'Accepted' || norm === 'Declined') {
        alert('This bill has already been decided by the client and cannot be edited.');
        setEditModal(null);
        return;
      }
    }

    await api.updateBill(editForm.id, {
      milestone: editForm.milestone,
      amount: Number(editForm.amount),
      dueDate: editForm.dueDate,
      description: editForm.description
    });

    setEditModal(null);
    loadBills();
  }

  const pendingCount = bills.filter((b) => normalizeBillStatus(b.status) === 'Pending Decision').length;
  const acceptedCount = bills.filter((b) => normalizeBillStatus(b.status) === 'Accepted').length;
  const declinedCount = bills.filter((b) => normalizeBillStatus(b.status) === 'Declined').length;

  const filteredBills = bills.filter((b) => {
    const matchQ =
      (b.billNumber || b.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.projectName || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.clientName || '').toLowerCase().includes(search.toLowerCase());
    const matchS = !filterStatus || normalizeBillStatus(b.status) === filterStatus;
    return matchQ && matchS;
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Bill Payment Decisions</h1>
          <p>Track invoices, approval workflows, and client payment decisions</p>
        </div>
        <Link to="/finance-manager/generate-bills" className="btn btn-primary">
          <Plus size={16} /> Generate Bill
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginTop: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{bills.length}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{pendingCount}</div>
          <div className="stat-label">Pending Decision</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{acceptedCount}</div>
          <div className="stat-label">Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--red)' }}>{declinedCount}</div>
          <div className="stat-label">Declined</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search by Bill ID, Project, or Client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending Decision">Pending Decision</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
          </select>
        </div>

        <DataTable
          data={filteredBills}
          emptyMessage="No bill payment decisions match filter criteria."
          columns={[
            {
              key: 'id',
              label: 'Bill ID',
              render: (b) => (
                <div>
                  <strong>{b.billNumber || b.id}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.milestone}</div>
                </div>
              )
            },
            { key: 'projectName', label: 'Project Name' },
            { key: 'clientName', label: 'Client Name' },
            {
              key: 'amount',
              label: 'Amount',
              render: (b) => <strong>{formatCurrency(b.amount)}</strong>
            },
            {
              key: 'status',
              label: 'Payment Status',
              render: (b) => {
                const normStatus = normalizeBillStatus(b.status);
                return (
                  <span className={`badge ${statusBadgeClass(normStatus)}`}>
                    {normStatus}
                  </span>
                );
              }
            },
            {
              key: 'decisionDate',
              label: 'Decision Date',
              render: (b) => (b.decisionDate ? formatDate(b.decisionDate) : 'Pending')
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (b) => {
                const norm = normalizeBillStatus(b.status);
                const isDecided = norm === 'Accepted' || norm === 'Declined';
                return (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDetailModal(b)}
                    >
                      <Eye size={13} /> View
                    </button>
                    {!isDecided ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(b)}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          alignSelf: 'center',
                          padding: '3px 8px',
                          background: 'var(--bg-light, #f3f4f6)',
                          borderRadius: '4px'
                        }}
                      >
                        Decided
                      </span>
                    )}
                  </div>
                );
              }
            }
          ]}
        />
      </div>

      {/* Bill Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={detailModal?.billNumber || detailModal?.id || 'Bill Details'}
        subtitle={`Project: ${detailModal?.projectName || ''}`}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDetailModal(null)}
          >
            Close
          </button>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="grid-2" style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, fontSize: 13 }}>
            <div><strong>Client:</strong> {detailModal?.clientName || 'Vikram Patel'}</div>
            <div><strong>Milestone:</strong> {detailModal?.milestone || (detailModal?.description ? detailModal.description.replace(/\.?$/, '') : 'Milestone 1 - Foundation & Groundwork')}</div>
            <div><strong>Amount:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(detailModal?.amount)}</span></div>
            <div><strong>Status:</strong> <span className={`badge ${statusBadgeClass(normalizeBillStatus(detailModal?.status))}`}>{normalizeBillStatus(detailModal?.status)}</span></div>
            <div><strong>Due Date:</strong> {formatDate(detailModal?.dueDate)}</div>
            <div><strong>Decision Date:</strong> {detailModal?.decisionDate ? formatDate(detailModal?.decisionDate) : 'Pending Client Review'}</div>
          </div>

          {detailModal?.rejectionReason && (
            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
              <strong style={{ color: 'var(--red)', fontSize: 13 }}>Client Rejection Reason:</strong>
              <p style={{ marginTop: 4, fontSize: 13, color: '#991b1b' }}>{detailModal.rejectionReason}</p>
            </div>
          )}

          {detailModal?.description && (
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8 }}>
              <strong>Description / Scope:</strong>
              <p style={{ marginTop: 4, fontSize: 13 }}>{detailModal.description}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Bill Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Bill Details"
        subtitle={`Updating invoice ${editModal?.billNumber || editModal?.id}`}
      >
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label">Milestone <span className="req">*</span></label>
            <input
              type="text"
              className="form-input"
              value={editForm.milestone}
              onChange={(e) => setEditForm({ ...editForm, milestone: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹) <span className="req">*</span></label>
              <input
                type="number"
                className="form-input"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                min={1}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date <span className="req">*</span></label>
              <input
                type="date"
                className="form-input"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Status</label>
            <div>
              <span className={`badge ${statusBadgeClass(normalizeBillStatus(editModal?.status))}`}>
                {normalizeBillStatus(editModal?.status)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                (Status is decided exclusively by the client)
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            ></textarea>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditModal(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
