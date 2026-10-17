import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, TrendingUp, CreditCard, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../services/utils';
import Modal from '../../../components/common/Modal';

const planLimits = { Basic: 10, Pro: 50, Enterprise: 500 };
const projLimits = { Basic: 3, Pro: 15, Enterprise: 100 };
const planPrices = { Basic: 4999, Pro: 9999, Enterprise: 19999 };
const planRank = { Basic: 1, Pro: 2, Enterprise: 3 };

export default function CompanyAdminSubscription() {
  const { user } = useOutletContext();
  const [subData, setSubData] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, [user]);

  async function loadSubscription() {
    if (!user) return;
    setLoading(true);
    const data = await api.getCompanySubscription(user.companyId);
    const [uList, pList] = await Promise.all([
      api.getUsers(user.companyId),
      api.getProjects(user.companyId)
    ]);
    setSubData(data);
    setUserCount(uList?.length || 0);
    setProjectCount(pList?.length || 0);
    setLoading(false);
  }

  // Downgrade confirmation modal state
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState('Basic');
  const [submittingDowngrade, setSubmittingDowngrade] = useState(false);

  const plan = subData?.plan || 'Basic';
  const overage = !!subData?.overageEnabled;
  const userLimit = subData?.planConfig?.userLimit || planLimits[plan] || 10;
  const projectLimit = subData?.planConfig?.projectLimit || projLimits[plan] || 3;

  async function handleToggleOverage(enabled) {
    if (!user) return;
    const extraProj = enabled ? Math.max(0, projectCount - projectLimit) : 0;
    const extraUsr = enabled ? Math.max(0, userCount - userLimit) : 0;
    await api.toggleOverage(user.companyId, {
      overageEnabled: enabled,
      extraProjects: extraProj,
      extraUsers: extraUsr
    });
    await api.updateCompany(user.companyId, {
      overageEnabled: enabled,
      extraProjects: extraProj,
      extraUsers: extraUsr
    });
    await loadSubscription();
  }

  async function executePlanChange(newPlan, turnOverageOn = false) {
    if (!user) return;
    setSubmittingDowngrade(true);
    const targetUserLimit = planLimits[newPlan] || 10;
    const targetProjLimit = projLimits[newPlan] || 3;
    const willHaveOverage = turnOverageOn || overage;

    const extraProj = willHaveOverage ? Math.max(0, projectCount - targetProjLimit) : 0;
    const extraUsr = willHaveOverage ? Math.max(0, userCount - targetUserLimit) : 0;

    const updatePayload = {
      plan: newPlan,
      customUserLimit: targetUserLimit,
      customProjectLimit: targetProjLimit,
      overageEnabled: willHaveOverage,
      extraProjects: extraProj,
      extraUsers: extraUsr
    };

    await api.updateCompany(user.companyId, updatePayload);
    await api.toggleOverage(user.companyId, {
      overageEnabled: willHaveOverage,
      extraProjects: extraProj,
      extraUsers: extraUsr
    });

    setSubmittingDowngrade(false);
    setDowngradeModalOpen(false);
    await loadSubscription();
  }

  async function handleSelectPlan(newPlan) {
    if (!user) return;
    const currentPlan = subData?.plan || 'Basic';
    const targetProjLimit = projLimits[newPlan] || 3;
    const targetUserLimit = planLimits[newPlan] || 10;

    const isDowngrade = (planRank[newPlan] || 0) < (planRank[currentPlan] || 0);
    const isLimitExceeded = projectCount > targetProjLimit || userCount > targetUserLimit;

    // Warning popup ONLY appears when downgrading plan limit is less than current entities (and overages off)
    if (isDowngrade && isLimitExceeded && !overage) {
      setPendingPlan(newPlan);
      setDowngradeModalOpen(true);
      return;
    }

    if (window.confirm(`Switch company subscription to ${newPlan} plan?`)) {
      await executePlanChange(newPlan, false);
    }
  }

  if (loading && !subData) {
    return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading SaaS subscription...</div>;
  }

  const userPct = Math.min(100, Math.round((userCount / userLimit) * 100));
  const projectPct = Math.min(100, Math.round((projectCount / projectLimit) * 100));

  // Dynamic overage calculation ensuring tiles and total monthly fee reflect active entities & tier
  const displayExtraUsers = overage ? Math.max(0, userCount - userLimit, subData?.extraUsers || 0) : 0;
  const displayExtraProjects = overage ? Math.max(0, projectCount - projectLimit, subData?.extraProjects || 0) : 0;
  const displayUserOverageFee = displayExtraUsers * 499;
  const displayProjectOverageFee = displayExtraProjects * 1999;
  const displayBaseMonthlyPrice = subData?.baseMonthlyPrice || planPrices[plan] || 4999;
  const displayTotalMonthlyFee = displayBaseMonthlyPrice + displayUserOverageFee + displayProjectOverageFee;

  return (
    <div>
      {/* Hero Banner */}
      <div className="sub-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="badge badge-orange" style={{ letterSpacing: '0.05em' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              SAAS BILLING PORTAL
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            Subscription & Usage Management
          </h2>
          <p style={{ fontSize: 13, opacity: 0.75 }}>
            Manage {subData?.companyName || 'your firm\'s'} SaaS tier, quotas, and overage billing
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>
            Active Subscription
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)' }}>
            {plan} Plan
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
            Billing Cycle: {subData?.billingCycle === 'annual' ? 'Annual (Save 15%)' : 'Monthly'}
          </div>
        </div>
      </div>

      {/* Usage-Based Overage Billing Card */}
      <div className="overage-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 800, margin: 0 }}>
              Usage-Based Overage Billing
            </h3>
            <span className={`badge ${overage ? 'badge-green' : 'badge-gray'}`}>
              {overage ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Allow adding team members & projects beyond tier limits without forced plan upgrades.
          </p>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '8px', display: 'flex', gap: '16px' }}>
            <span><strong>Extra User:</strong> ₹499 / user / month</span>
            <span><strong>Extra Project:</strong> ₹1,999 / project / month</span>
          </div>
        </div>
        <div>
          <label className="switch">
            <input
              type="checkbox"
              checked={overage}
              onChange={(e) => handleToggleOverage(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Subscription Breakdown Card */}
      <div className="card mb-16" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, margin: 0 }}>
              Current Subscription Breakdown
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Base Plan Subscription Fee + Active Usage Overages
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Monthly Fee
            </span>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
              {formatCurrency(displayTotalMonthlyFee)} / mo
            </div>
          </div>
        </div>

        <div className="grid-3" style={{ gap: 16 }}>
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Base SaaS Plan
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
              {formatCurrency(displayBaseMonthlyPrice)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {plan} Tier Base Pricing
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              User Overages
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)', marginTop: 4 }}>
              {formatCurrency(displayUserOverageFee)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {displayExtraUsers} Extra Users @ ₹499/mo
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Project Overages
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
              {formatCurrency(displayProjectOverageFee)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {displayExtraProjects} Extra Projects @ ₹1,999/mo
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <strong>Team Users Quota</strong>
            <span>{userCount} / {userLimit} ({userPct}%)</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${userPct}%`,
                background: userPct > 90 ? 'var(--red)' : 'var(--primary)'
              }}
            ></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {userCount >= userLimit && !overage && (
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                Limit reached! Enable overage billing or upgrade plan.
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <strong>Active Projects Quota</strong>
            <span>{projectCount} / {projectLimit} ({projectPct}%)</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${projectPct}%`,
                background: projectPct > 90 ? 'var(--red)' : 'var(--blue)'
              }}
            ></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {projectCount >= projectLimit && !overage && (
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                Limit reached! Enable overage billing or upgrade plan.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <h3 className="section-title" style={{ marginBottom: 16 }}>Available Subscription Tiers</h3>
      <div className="plan-grid">
        <div className={`plan-card ${plan === 'Basic' ? 'active-plan' : ''}`}>
          {plan === 'Basic' && <div className="plan-badge-top">Current Plan</div>}
          <div>
            <h4 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: 0 }}>Basic</h4>
            <div className="plan-price">₹4,999<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/mo</span></div>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> 10 Team Members</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> 3 Active Projects</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Site Logs & Photos</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Invoicing & Approvals</li>
            </ul>
          </div>
          <button
            type="button"
            className={`btn ${plan === 'Basic' ? 'btn-secondary' : 'btn-outline'} btn-full`}
            disabled={plan === 'Basic'}
            onClick={() => handleSelectPlan('Basic')}
          >
            {plan === 'Basic' ? 'Active Plan' : 'Downgrade to Basic'}
          </button>
        </div>

        <div className={`plan-card ${plan === 'Pro' ? 'active-plan' : ''}`}>
          {plan === 'Pro' && <div className="plan-badge-top">Current Plan</div>}
          <div>
            <h4 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: 0 }}>Pro</h4>
            <div className="plan-price">₹9,999<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/mo</span></div>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> 50 Team Members</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> 15 Active Projects</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Budget Allocations & Categories</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Overage Billing Protection</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Priority Support</li>
            </ul>
          </div>
          <button
            type="button"
            className={`btn ${plan === 'Pro' ? 'btn-secondary' : 'btn-primary'} btn-full`}
            disabled={plan === 'Pro'}
            onClick={() => handleSelectPlan('Pro')}
          >
            {plan === 'Pro' ? 'Active Plan' : 'Switch to Pro'}
          </button>
        </div>

        <div className={`plan-card ${plan === 'Enterprise' ? 'active-plan' : ''}`}>
          {plan === 'Enterprise' && <div className="plan-badge-top">Current Plan</div>}
          <div>
            <h4 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, margin: 0 }}>Enterprise</h4>
            <div className="plan-price">₹19,999<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/mo</span></div>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} color="var(--primary)" /> 500 Team Members</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> 100 Active Projects</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Unlimited Storage & Photo Logs</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Custom Approved Domain</li>
              <li><CheckCircle2 size={16} color="var(--primary)" /> Dedicated Success Manager</li>
            </ul>
          </div>
          <button
            type="button"
            className={`btn ${plan === 'Enterprise' ? 'btn-secondary' : 'btn-primary'} btn-full`}
            disabled={plan === 'Enterprise'}
            onClick={() => handleSelectPlan('Enterprise')}
          >
            {plan === 'Enterprise' ? 'Active Plan' : 'Upgrade to Enterprise'}
          </button>
        </div>
      </div>

      {/* Modal: Downgrade Warning & Overage Option */}
      <Modal
        isOpen={downgradeModalOpen}
        onClose={() => !submittingDowngrade && setDowngradeModalOpen(false)}
        title="Downgrade Plan Warning"
        subtitle={`Downgrading from ${plan} to ${pendingPlan}`}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submittingDowngrade}
              onClick={() => setDowngradeModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submittingDowngrade}
              onClick={() => executePlanChange(pendingPlan, true)}
            >
              {submittingDowngrade ? 'Processing...' : 'Downgrade with Overages'}
            </button>
          </div>
        }
      >
        {(() => {
          const targetProjLimit = projLimits[pendingPlan] || 3;
          const targetUserLimit = planLimits[pendingPlan] || 10;
          const excessProjects = Math.max(0, projectCount - targetProjLimit);
          const excessUsers = Math.max(0, userCount - targetUserLimit);

          return (
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <AlertTriangle size={24} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: 'var(--red)', fontSize: '14px' }}>
                    Current usage exceeds {pendingPlan} plan limits
                  </strong>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-main)' }}>
                    The <strong>{pendingPlan} plan</strong> allows up to <strong>{targetProjLimit} projects</strong> and <strong>{targetUserLimit} team members</strong>.
                  </p>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-main)' }}>
                    {excessProjects > 0 && (
                      <li>
                        Active Projects: <strong>{projectCount}</strong> (Plan limit: {targetProjLimit} &mdash; <span style={{ color: 'var(--red)', fontWeight: 600 }}>{excessProjects} excess</span>)
                      </li>
                    )}
                    {excessUsers > 0 && (
                      <li>
                        Team Members: <strong>{userCount}</strong> (Plan limit: {targetUserLimit} &mdash; <span style={{ color: 'var(--red)', fontWeight: 600 }}>{excessUsers} excess</span>)
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius)', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Downgrade with Overages</div>
                <p style={{ margin: '0 0 8px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  To downgrade to <strong>{pendingPlan}</strong> without deleting active projects or team members, <strong>Usage-Based Overages must be turned ON</strong>.
                </p>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {excessProjects > 0 && (
                    <div>&bull; {excessProjects} Extra Project(s) @ ₹1,999/mo = <strong>{formatCurrency(excessProjects * 1999)}/mo</strong></div>
                  )}
                  {excessUsers > 0 && (
                    <div>&bull; {excessUsers} Extra User(s) @ ₹499/mo = <strong>{formatCurrency(excessUsers * 499)}/mo</strong></div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
