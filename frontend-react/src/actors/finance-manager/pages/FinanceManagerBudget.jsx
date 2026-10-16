import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HardHat, Wrench, Package, Edit2 } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../services/utils';
import Modal from '../../../components/common/Modal';

export default function FinanceManagerBudget() {
  const { user } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Edit Budget Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProj, setSelectedProj] = useState(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [labor, setLabor] = useState(0);
  const [materials, setMaterials] = useState(0);
  const [equipment, setEquipment] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadBudgets();
  }, [user]);

  async function loadBudgets() {
    if (!user) return;
    const [pList, eList] = await Promise.all([
      api.getProjects(user.companyId),
      api.getExpenses(user.companyId)
    ]);
    const myProjects = (pList || []).filter(
      (p) => p.financeManagerId === user.id || (!p.financeManagerId && user.role === 'superuser')
    );
    const myProjectIds = new Set(myProjects.map((p) => p.id));
    const myExpenses = (eList || []).filter((e) => myProjectIds.has(e.projectId));

    setProjects(myProjects);
    setExpenses(myExpenses);
  }

  function openEditBudget(p) {
    setSelectedProj(p);
    const alloc = p.allocations || {};
    setTotalBudget(p.budget || 0);
    setLabor(alloc.Labor || 0);
    setMaterials(alloc.Materials || 0);
    setEquipment(alloc.Equipment || 0);
    setErrorMsg('');
    setModalOpen(true);
  }

  const otherAlloc = Math.max(0, Number(totalBudget) - (Number(labor) + Number(materials) + Number(equipment)));

  async function handleSaveBudget(e) {
    e.preventDefault();
    setErrorMsg('');

    const t = Number(totalBudget);
    const l = Number(labor);
    const m = Number(materials);
    const eq = Number(equipment);

    if (t <= 0) {
      setErrorMsg('Total budget must be greater than zero.');
      return;
    }
    if (l + m + eq > t) {
      setErrorMsg(`Allocated sum (${formatCurrency(l + m + eq)}) exceeds Total Budget (${formatCurrency(t)}).`);
      return;
    }

    const newAlloc = {
      Labor: l,
      Materials: m,
      Equipment: eq,
      Other: t - (l + m + eq)
    };

    await api.updateProject(selectedProj.id, {
      budget: t,
      allocations: newAlloc
    });

    setModalOpen(false);
    loadBudgets();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Project Budgets</h1>
        <p>Monitor budget allocation and expenses across all active projects</p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {projects.map((p) => {
          const pExpenses = expenses.filter((e) => e.projectId === p.id);
          const totalSpent = pExpenses.length > 0
            ? pExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
            : (Number(p.spent) || 0);
          const budgetPct = p.budget > 0 ? Math.min(100, Math.round((totalSpent / p.budget) * 100)) : 0;
          const alloc = p.allocations || { Labor: 0, Materials: 0, Equipment: 0, Other: 0 };
          const catSpent = {
            Labor: pExpenses.filter((e) => e.category === 'Labor').reduce((s, e) => s + (Number(e.amount) || 0), 0),
            Materials: pExpenses.filter((e) => e.category === 'Materials').reduce((s, e) => s + (Number(e.amount) || 0), 0),
            Equipment: pExpenses.filter((e) => e.category === 'Equipment').reduce((s, e) => s + (Number(e.amount) || 0), 0),
            Other: pExpenses.filter((e) => e.category === 'Other').reduce((s, e) => s + (Number(e.amount) || 0), 0)
          };

          return (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: 0 }}>
                      {p.name}
                    </h3>
                    {(Number(alloc.Labor) === 0 && Number(alloc.Materials) === 0 && Number(alloc.Equipment) === 0) && (
                      <span className="badge badge-orange" style={{ fontSize: 11, padding: '2px 8px' }}>
                        Awaiting Category Allocation
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Client: {p.clientName} | Location: {p.location}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Budget</div>
                    <strong style={{ fontSize: 17, color: 'var(--primary)' }}>{formatCurrency(p.budget)}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditBudget(p)}
                  >
                    <Edit2 size={13} /> Edit Budget
                  </button>
                </div>
              </div>

              {/* Overall budget spent */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <span>Spent: <strong>{formatCurrency(totalSpent)}</strong></span>
                  <span>Remaining: <strong>{formatCurrency(Math.max(0, p.budget - totalSpent))}</strong> ({100 - budgetPct}%)</span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${budgetPct}%`,
                      background: budgetPct > 90 ? 'var(--red)' : budgetPct > 70 ? 'var(--orange)' : 'var(--green)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Categories Allocation */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                  Budget Category Breakdown
                </div>
                <div className="grid-4" style={{ gap: 12 }}>
                  <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <HardHat size={14} color="#f97316" /> Labor
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Allocated: <strong>{formatCurrency(alloc.Labor)}</strong></div>
                    <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 2 }}>Spent: <strong>{formatCurrency(catSpent.Labor)}</strong></div>
                  </div>

                  <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Package size={14} color="#3b82f6" /> Materials
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Allocated: <strong>{formatCurrency(alloc.Materials)}</strong></div>
                    <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 2 }}>Spent: <strong>{formatCurrency(catSpent.Materials)}</strong></div>
                  </div>

                  <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Wrench size={14} color="#10b981" /> Equipment
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Allocated: <strong>{formatCurrency(alloc.Equipment)}</strong></div>
                    <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 2 }}>Spent: <strong>{formatCurrency(catSpent.Equipment)}</strong></div>
                  </div>

                  <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Package size={14} color="#8b5cf6" /> Other / Unallocated Reserve
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Allocated: <strong>{formatCurrency(alloc.Other)}</strong></div>
                    <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 2 }}>Spent: <strong>{formatCurrency(catSpent.Other)}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Project Budget"
        subtitle={`Allocations for ${selectedProj?.name}`}
      >
        <form onSubmit={handleSaveBudget}>
          {errorMsg && <div className="error-msg" style={{ display: 'block' }}>{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">
              Total Budget (₹) <span className="req">*</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              min={1}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allocated for Labor (₹)</label>
            <input
              type="number"
              className="form-input"
              value={labor}
              onChange={(e) => setLabor(e.target.value)}
              min={0}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allocated for Materials (₹)</label>
            <input
              type="number"
              className="form-input"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              min={0}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allocated for Equipment (₹)</label>
            <input
              type="number"
              className="form-input"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              min={0}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Other / Unallocated Reserve (₹)</label>
            <input
              type="number"
              className="form-input"
              value={otherAlloc}
              readOnly
              disabled
              style={{ background: 'var(--bg)', fontWeight: 600 }}
            />
            <span className="form-hint">Remaining unallocated budget: Total − (Labor + Materials + Equipment). All unassigned funds remain reserved here.</span>
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
              Save Budget
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
