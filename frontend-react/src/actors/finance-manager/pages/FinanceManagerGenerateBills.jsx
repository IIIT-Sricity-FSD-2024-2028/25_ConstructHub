import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, generateId, normalizeBillStatus } from '../../../services/utils';
import Modal from '../../../components/common/Modal';

export default function FinanceManagerGenerateBills() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [bills, setBills] = useState([]);

  // Form
  const [projectId, setProjectId] = useState('');
  const [milestone, setMilestone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState({});
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [generatedBillId, setGeneratedBillId] = useState('');

  useEffect(() => {
    loadProjectsAndBills();
    // Default due date = 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
  }, [user]);

  async function loadProjectsAndBills() {
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
    setProjects(myProjects);
    setBills(myBills);
    if (myProjects.length > 0 && !projectId) {
      setProjectId(myProjects[0].id);
    }
  }

  const selectedProj = projects.find((p) => p.id === projectId);

  const billedSoFar = selectedProj
    ? bills
        .filter((b) => b.projectId === selectedProj.id && normalizeBillStatus(b.status) !== 'Declined')
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
    : 0;

  const remainingBudget = selectedProj ? selectedProj.budget - billedSoFar : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!projectId) newErrors.projectId = 'Project is required';
    if (!milestone.trim()) newErrors.milestone = 'Milestone is required';
    if (!amount || Number(amount) <= 0) newErrors.amount = 'Amount must be greater than 0';

    if (selectedProj && Number(amount) > remainingBudget) {
      if (!window.confirm(`Bill amount (${formatCurrency(Number(amount))}) exceeds remaining project budget (${formatCurrency(remainingBudget)}). Continue anyway?`)) {
        return;
      }
    }

    if (!dueDate) newErrors.dueDate = 'Due date is required';
    else if (new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      newErrors.dueDate = 'Due date cannot be in the past';
    }

    if (!description.trim()) newErrors.description = 'Description is required';
    else if (description.trim().length > 500) newErrors.description = 'Max 500 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const billNumber = 'INV-' + (user.companyId || 'BILL') + '-' + String(bills.length + 1).padStart(3, '0');
    const billData = {
      billNumber,
      companyId: user.companyId || (selectedProj ? selectedProj.companyId : ''),
      projectId,
      projectName: selectedProj ? selectedProj.name : '',
      clientId: selectedProj ? selectedProj.clientId : '',
      clientName: selectedProj ? selectedProj.clientName : '',
      amount: Number(amount),
      milestone: milestone.trim(),
      description: description.trim(),
      generatedBy: user.id,
      status: 'Pending Decision',
      date: new Date().toISOString().split('T')[0],
      dueDate,
      decisionDate: '',
      rejectionReason: ''
    };

    const saved = await api.createBill(billData);

    if (saved && selectedProj?.clientId) {
      await api.createNotification({
        userId: selectedProj.clientId,
        title: 'New Bill Pending',
        body: `Invoice for ${selectedProj.name} (${formatCurrency(Number(amount))}) requires your approval.`,
        time: 'just now',
        read: false
      });
    }

    setGeneratedBillId(saved?.id || billNumber);
    setSuccessModalOpen(true);
  }

  function handleReset() {
    setMilestone('');
    setAmount('');
    setDescription('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
    setErrors({});
    setSuccessModalOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header">
        <h1>Generate Bills</h1>
        <p>Create new project milestone invoices and notify clients</p>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Project <span className="req">*</span>
              </label>
              <select
                className={`form-select ${errors.projectId ? 'input-error' : ''}`}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && <span className="field-error">{errors.projectId}</span>}
            </div>

            {selectedProj && (
              <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <div>Client: <strong>{selectedProj.clientName || 'Assigned Client (Vikram Patel)'}</strong></div>
                <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                  Project Budget: {formatCurrency(selectedProj.budget)} | Billed: {formatCurrency(billedSoFar)} | Remaining: <strong style={{ color: 'var(--green)' }}>{formatCurrency(remainingBudget)}</strong>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Milestone <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.milestone ? 'input-error' : ''}`}
                placeholder="e.g. Foundation Complete, Floor 2 Structural Pouring"
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                maxLength={100}
              />
              {errors.milestone && <span className="field-error">{errors.milestone}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Bill Amount (₹) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${errors.amount ? 'input-error' : ''}`}
                  placeholder="e.g. 5000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                />
                {errors.amount && <span className="field-error">{errors.amount}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Due Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${errors.dueDate ? 'input-error' : ''}`}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Description <span className="req">*</span>
              </label>
              <textarea
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                placeholder="Bill details, scope of work completed, milestone verification notes..."
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ padding: '12px', marginTop: 8 }}
            >
              Generate & Send Bill
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Bill Generated & Sent!"
        subtitle="Invoice has been generated and sent to the client successfully."
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="icon-box icon-box-lg icon-box-green" style={{ margin: '0 auto 16px', borderRadius: '50%' }}>
            <CheckCircle2 size={32} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Invoice {generatedBillId} has been generated and queued for client approval.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => navigate('/finance-manager/bill-decisions')}
            >
              View All Bill Decisions
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleReset}
            >
              Generate Another Bill
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
