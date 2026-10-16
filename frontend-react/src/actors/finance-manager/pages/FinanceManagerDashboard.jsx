import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency, formatDate, statusBadgeClass, normalizeBillStatus } from '../../../services/utils';

export default function FinanceManagerDashboard() {
  const { user } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    if (!user) return;
    const [pList, bList, eList] = await Promise.all([
      api.getProjects(user.companyId),
      api.getBills(user.companyId),
      api.getExpenses(user.companyId)
    ]);

    const myProjects = (pList || []).filter(
      (p) => p.financeManagerId === user.id || (!p.financeManagerId && user.role === 'superuser')
    );
    const myProjectIds = new Set(myProjects.map((p) => p.id));
    const myBills = (bList || []).filter((b) => myProjectIds.has(b.projectId));
    const myExpenses = (eList || []).filter((e) => myProjectIds.has(e.projectId));

    setProjects(myProjects);
    setBills(myBills);
    setExpenses(myExpenses);
  }

  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalUtilized = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingBills = bills.filter((b) => normalizeBillStatus(b.status) === 'Pending Decision');
  const overdueBills = bills.filter(
    (b) => normalizeBillStatus(b.status) === 'Pending Decision' && b.dueDate && new Date(b.dueDate) < new Date()
  );

  // Allocations breakdown
  let allocations = { Labor: 0, Materials: 0, Equipment: 0, Other: 0 };
  projects.forEach((p) => {
    if (p.allocations) {
      allocations.Labor += Number(p.allocations.Labor) || 0;
      allocations.Materials += Number(p.allocations.Materials) || 0;
      allocations.Equipment += Number(p.allocations.Equipment) || 0;
      allocations.Other += Number(p.allocations.Other) || 0;
    }
  });

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const pLabor = totalAllocated > 0 ? Math.round((allocations.Labor / totalAllocated) * 100) : 0;
  const pMat = totalAllocated > 0 ? Math.round((allocations.Materials / totalAllocated) * 100) : 0;
  const pEq = totalAllocated > 0 ? Math.round((allocations.Equipment / totalAllocated) * 100) : 0;
  const pOth = totalAllocated > 0 ? Math.round((allocations.Other / totalAllocated) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Finance Manager Dashboard</h1>
        <p>Monitor budgets, expenses, and financial operations</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-orange">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>
            {formatCurrency(totalBudget)}
          </div>
          <div className="stat-label">Total Budget</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-blue">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>
            {formatCurrency(totalUtilized)}
          </div>
          <div className="stat-label">Utilized Budget</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-green">
              <Receipt size={20} />
            </div>
          </div>
          <div className="stat-value">{pendingBills.length}</div>
          <div className="stat-label">Pending Invoices</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <div className="icon-box icon-box-red">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value">{overdueBills.length}</div>
          <div className="stat-label">Overdue Payments</div>
        </div>
      </div>

      {/* Budget Breakdown Donut Chart */}
      <div className="card mb-16">
        <div className="card-title">Budget Allocation Breakdown</div>
        <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {totalAllocated === 0 ? (
            <div className="empty-state">
              <p>No project budgets allocated yet.</p>
            </div>
          ) : (
            <>
              <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#e5e7eb" strokeWidth="3.5" />
                {pLabor > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="#f97316"
                    strokeWidth="3.5"
                    strokeDasharray={`${pLabor} ${100 - pLabor}`}
                    strokeDashoffset="0"
                  />
                )}
                {pMat > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    strokeDasharray={`${pMat} ${100 - pMat}`}
                    strokeDashoffset={`${-pLabor}`}
                  />
                )}
                {pEq > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray={`${pEq} ${100 - pEq}`}
                    strokeDashoffset={`${-(pLabor + pMat)}`}
                  />
                )}
                {pOth > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeDasharray={`${pOth} ${100 - pOth}`}
                    strokeDashoffset={`${-(pLabor + pMat + pEq)}`}
                  />
                )}
              </svg>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f97316' }}></div>
                  <span style={{ fontSize: 13 }}>Labor: <strong>{pLabor}%</strong> ({formatCurrency(allocations.Labor)})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }}></div>
                  <span style={{ fontSize: 13 }}>Materials: <strong>{pMat}%</strong> ({formatCurrency(allocations.Materials)})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }}></div>
                  <span style={{ fontSize: 13 }}>Equipment: <strong>{pEq}%</strong> ({formatCurrency(allocations.Equipment)})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#8b5cf6' }}></div>
                  <span style={{ fontSize: 13 }}>Other: <strong>{pOth}%</strong> ({formatCurrency(allocations.Other)})</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pending Payment Approvals */}
      <div className="card mb-16">
        <div className="section-header">
          <div className="section-title">Pending Payment Invoices</div>
          {pendingBills.length > 0 && <span className="badge badge-orange">{pendingBills.length} Pending Decision</span>}
        </div>
        <div>
          {pendingBills.length > 0 ? (
            pendingBills.slice(0, 3).map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-light)'
                }}
              >
                <div>
                  <strong>{b.billNumber || b.id}</strong> — {b.projectName}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Client: {b.clientName} | Due: {formatDate(b.dueDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(b.amount)}</strong>
                  <Link to="/finance-manager/bill-decisions" className="btn btn-secondary btn-sm">
                    Review
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending invoices requiring review.</p>
          )}
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Recent Expenses</div>
          <Link to="/finance-manager/expenses" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Project</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.projectName || e.projectId}</td>
                    <td>
                      <span className="badge badge-orange">{e.category}</span>
                    </td>
                    <td>
                      <strong>{formatCurrency(e.amount)}</strong>
                    </td>
                    <td>{formatDate(e.date)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
