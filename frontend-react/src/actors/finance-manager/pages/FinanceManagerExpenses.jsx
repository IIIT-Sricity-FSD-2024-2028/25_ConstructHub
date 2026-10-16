import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, formatDate } from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';

export default function FinanceManagerExpenses() {
  const { user } = useOutletContext();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: '',
    category: 'Materials',
    amount: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [eList, pList] = await Promise.all([
      api.getExpenses(user.companyId),
      api.getProjects(user.companyId)
    ]);
    const myProjects = (pList || []).filter(
      (p) => p.financeManagerId === user.id || (!p.financeManagerId && user.role === 'superuser')
    );
    const myProjectIds = new Set(myProjects.map((p) => p.id));
    const myExpenses = (eList || []).filter((e) => myProjectIds.has(e.projectId));

    setExpenses(myExpenses);
    setProjects(myProjects);
  }

  function openAddModal() {
    setIsEditing(false);
    setForm({
      id: '',
      category: 'Materials',
      amount: '',
      projectId: projects[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(e) {
    setIsEditing(true);
    setForm({
      id: e.id,
      category: e.category || 'Materials',
      amount: e.amount || '',
      projectId: e.projectId || '',
      date: e.date || new Date().toISOString().split('T')[0],
      description: e.description || ''
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};

    if (!form.category) errors.category = 'Select category';
    if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Amount must be greater than 0';
    if (!form.projectId) errors.projectId = 'Select project';
    if (!form.date) errors.date = 'Date is required';
    if (!form.description.trim()) errors.description = 'Description is required';

    // Category allocation limit check
    const projTarget = projects.find((p) => p.id === form.projectId);
    const catLimit = projTarget?.allocations?.[form.category];
    if (catLimit !== null && catLimit !== undefined && Number(catLimit) > 0) {
      const amt = Number(form.amount);
      const existingInCat = expenses.filter(
        (x) => x.projectId === form.projectId && x.category === form.category && x.id !== form.id
      );
      const spentSoFar = existingInCat.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
      if (spentSoFar + amt > Number(catLimit)) {
        errors.amount = `Exceeds maximum allocated limit (${formatCurrency(Number(catLimit))}) for ${form.category}. Spent so far: ${formatCurrency(spentSoFar)}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const proj = projTarget;
    const payload = {
      companyId: user.companyId,
      category: form.category,
      amount: Number(form.amount),
      projectId: form.projectId,
      projectName: proj ? proj.name : '',
      date: form.date,
      description: form.description.trim(),
      recordedBy: user.id
    };

    if (isEditing) {
      await api.updateExpense(form.id, payload);
    } else {
      await api.createExpense(payload);
    }

    setModalOpen(false);
    loadData();
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this expense record?')) {
      await api.deleteExpense(id);
      loadData();
    }
  }

  const filtered = expenses.filter((e) => {
    const matchQ =
      (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.projectName || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.id || '').toLowerCase().includes(search.toLowerCase());
    const matchP = !filterProject || e.projectId === filterProject;
    const matchC = !filterCategory || e.category === filterCategory;
    return matchQ && matchP && matchC;
  });

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Expenses</h1>
          <p>Track and record project operational expenses</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openAddModal}
        >
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <div className="filter-bar" style={{ marginTop: 20 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Materials">Materials</option>
          <option value="Labor">Labor</option>
          <option value="Equipment">Equipment</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          data={filtered}
          emptyMessage="No expenses match current filters."
          columns={[
            { key: 'id', label: 'ID' },
            {
              key: 'projectName',
              label: 'Project',
              render: (e) => {
                const p = projects.find((x) => x.id === e.projectId);
                return p ? p.name : (e.projectName || e.projectId || 'General');
              }
            },
            {
              key: 'category',
              label: 'Category',
              render: (e) => <span className="badge badge-orange">{e.category}</span>
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (e) => <strong>{formatCurrency(e.amount)}</strong>
            },
            { key: 'description', label: 'Description' },
            { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
            {
              key: 'actions',
              label: 'Actions',
              render: (e) => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(e)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Record / Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Expense Record' : 'Record Project Expense'}
        subtitle="Manage cost allocations and expense verification"
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">
              Category <span className="req">*</span>
            </label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="Materials">Materials</option>
              <option value="Labor">Labor</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Amount (₹) <span className="req">*</span>
            </label>
            <input
              type="number"
              className={`form-input ${formErrors.amount ? 'input-error' : ''}`}
              placeholder="e.g. 50000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              min={1}
            />
            {formErrors.amount && <span className="field-error">{formErrors.amount}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Project <span className="req">*</span>
            </label>
            <select
              className={`form-select ${formErrors.projectId ? 'input-error' : ''}`}
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {formErrors.projectId && <span className="field-error">{formErrors.projectId}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Date <span className="req">*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Description <span className="req">*</span>
            </label>
            <textarea
              className={`form-textarea ${formErrors.description ? 'input-error' : ''}`}
              placeholder="Expense details and justification..."
              value={form.description}
              maxLength={300}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            ></textarea>
            {formErrors.description && <span className="field-error">{formErrors.description}</span>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
