import { usePlans, formatINR } from '../hooks/usePlans';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Send,
  ArrowLeft,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { isValidEmail } from '../services/utils';
import ConstructHubLogo from '../components/common/ConstructHubLogo';
import contactArchitectureImg from '../assets/contact-architecture.jpg';

export default function Contact() {
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || '';
  const isFirmRequest = searchParams.get('request') === 'firm' || Boolean(initialPlan);

  const [requestType, setRequestType] = useState(isFirmRequest ? 'firm_onboarding' : 'inquiry');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [plan, setPlan] = useState(
    initialPlan ? (initialPlan.includes('Plan') ? initialPlan : `${initialPlan} Plan`) : 'Pro Plan'
  );
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraProjects, setExtraProjects] = useState(0);
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { planPrices, planLimits, projLimits } = usePlans();
  const planDetails = {
    'Basic Plan': { users: planLimits.Basic, projects: projLimits.Basic, baseFee: planPrices.Basic },
    'Pro Plan': { users: planLimits.Pro, projects: projLimits.Pro, baseFee: planPrices.Pro },
    'Enterprise Plan': { users: planLimits.Enterprise, projects: projLimits.Enterprise, baseFee: planPrices.Enterprise }
  };
  const activePlanInfo = planDetails[plan] || planDetails['Pro Plan'];
  const extraU = Math.max(0, Number(extraUsers) || 0);
  const extraP = Math.max(0, Number(extraProjects) || 0);
  const totalUsers = activePlanInfo.users + extraU;
  const totalProjects = activePlanInfo.projects + extraP;
  const estimatedMonthly = activePlanInfo.baseFee + extraU * 199 + extraP * 799;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full Name is required';
    if (!email.trim()) newErrors.email = 'Email Address is required';
    else if (!isValidEmail(email)) newErrors.email = 'Please enter a valid email address';

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) newErrors.phone = 'Phone Number is required';
    else if (cleanPhone.length !== 10) newErrors.phone = 'Please enter a valid 10-digit phone number';

    if (requestType === 'firm_onboarding' && !company.trim()) {
      newErrors.company = 'Firm / Organization Name is required for onboarding requests';
    }

    if (!message.trim()) newErrors.message = 'Please provide details or requirements';
    else if (message.trim().length < 5) newErrors.message = 'Message must be at least 5 characters long';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const parsedExtraU = Math.max(0, parseInt(extraUsers, 10) || 0);
    const parsedExtraP = Math.max(0, parseInt(extraProjects, 10) || 0);

    const fullMessage = requestType === 'firm_onboarding'
      ? `[Firm Onboarding Request | Plan: ${plan} | Base: ${activePlanInfo.users} Users, ${activePlanInfo.projects} Projects | Extra: +${parsedExtraU} Users, +${parsedExtraP} Projects | Total Capacity: ${activePlanInfo.users + parsedExtraU} Users, ${activePlanInfo.projects + parsedExtraP} Projects] ${company ? `Company: ${company.trim()} | ` : ''}${message.trim()}`
      : message.trim();

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: cleanPhone,
      company: requestType === 'firm_onboarding' ? company.trim() : (company.trim() || ''),
      type: requestType === 'firm_onboarding' ? 'firm_request' : 'general_inquiry',
      message: fullMessage
    };

    const res = await api.createInquiry(payload);
    setLoading(false);

    if (res && res.error) {
      setServerError(res.message || 'Failed to submit inquiry. Please try again.');
      return;
    }

    setSubmitted(true);
  }

  function handleReset() {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setExtraUsers(0);
    setExtraProjects(0);
    setMessage('');
    setErrors({});
    setSubmitted(false);
  }

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Clean Top Bar (no duplicate Home link) */}
      <nav className="landing-nav" style={{ borderBottom: '1px solid #eceef2', background: 'rgba(255,255,255,0.92)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>
          <ConstructHubLogo size={32} textSize={17} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" className="back-link" style={{ marginBottom: 0, fontSize: 13.5 }}>
            <ArrowLeft size={14} /> Home
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1220,
          margin: '0 auto',
          padding: '104px 28px 64px',
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 0.95fr) minmax(420px, 1.15fr)',
          gap: 36,
          alignItems: 'start'
        }}
      >
        {/* Left Column: Editorial Visual Showcase + Contact Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 11px',
                borderRadius: 999,
                background: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.03em',
                marginBottom: 12
              }}
            >
              <ShieldCheck size={13} />
              {requestType === 'firm_onboarding' ? 'Enterprise Workspace Provisioning' : 'Platform Sales & Support'}
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: 'clamp(28px, 3vw, 36px)',
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                color: 'var(--text)',
                marginBottom: 12
              }}
            >
              {requestType === 'firm_onboarding'
                ? 'Onboard your construction firm.'
                : 'Talk to the ConstructHub team.'}
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0 }}>
              {requestType === 'firm_onboarding'
                ? 'Submit your workspace requirements and target capacity. Our Platform Super Admin verifies your organization and provisions your dedicated tenant with Company Admin credentials.'
                : 'Have questions about multi-project ERP workflows, milestone billing, or enterprise pricing? Reach out directly and we will respond within one business day.'}
            </p>
          </div>

          {/* Framed Architectural Photo + Onboarding Overlay */}
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 14px 36px rgba(15, 23, 42, 0.08)',
              minHeight: 330,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              background: '#0f172a'
            }}
          >
            <img
              src={contactArchitectureImg}
              alt="ConstructHub Enterprise Headquarters"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.68) 55%, rgba(15,23,42,0.92) 100%)'
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px', color: '#fff' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#fdba74',
                  marginBottom: 10
                }}
              >
                Super Admin Onboarding Process
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 14px', fontSize: 12.5, color: 'rgba(255,255,255,0.92)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={14} style={{ color: '#fb923c', flexShrink: 0, marginTop: 2 }} />
                  <span>Routed directly to Platform Super Admin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={14} style={{ color: '#fb923c', flexShrink: 0, marginTop: 2 }} />
                  <span>Direct verification call &amp; scope check</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={14} style={{ color: '#fb923c', flexShrink: 0, marginTop: 2 }} />
                  <span>Dedicated company code &amp; domain setup</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={14} style={{ color: '#fb923c', flexShrink: 0, marginTop: 2 }} />
                  <span>Company Admin credentials initialized</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Contact Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.35fr 1fr',
              gap: 12
            }}
          >
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>
                <Phone size={13} /> Direct Sales
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>+91 98765 43210</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Mon–Sat, 9am–7pm</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>
                <Mail size={13} /> Email Desk
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>sales@constructhub.com</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Reply within 24 hrs</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>
                <MapPin size={13} /> Headquarters
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>123 Business Park</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Mumbai, India</div>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Interactive Request Form */}
        <div>
          {!submitted ? (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
                padding: '28px 30px'
              }}
            >
              {/* Segmented Mode Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  padding: 5,
                  borderRadius: 12,
                  background: '#f3f4f6',
                  marginBottom: 22
                }}
              >
                <button
                  type="button"
                  onClick={() => setRequestType('firm_onboarding')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    background: requestType === 'firm_onboarding' ? '#111827' : 'transparent',
                    color: requestType === 'firm_onboarding' ? '#fff' : '#4b5563',
                    boxShadow: requestType === 'firm_onboarding' ? '0 2px 6px rgba(17,24,39,0.18)' : 'none'
                  }}
                >
                  <Building2 size={14} /> Register Firm Request
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('inquiry')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 9,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    background: requestType === 'inquiry' ? '#111827' : 'transparent',
                    color: requestType === 'inquiry' ? '#fff' : '#4b5563',
                    boxShadow: requestType === 'inquiry' ? '0 2px 6px rgba(17,24,39,0.18)' : 'none'
                  }}
                >
                  <Mail size={14} /> General Inquiry
                </button>
              </div>

              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
                {requestType === 'firm_onboarding' ? 'Register Your Construction Firm' : 'Send an Inquiry'}
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                {requestType === 'firm_onboarding'
                  ? 'Provide your organization details and desired plan capacity for Super Admin provisioning.'
                  : 'Fill in your details and our team will get in touch shortly.'}
              </p>

              {serverError && <div className="error-msg" style={{ display: 'block', marginBottom: 14 }}>{serverError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Authorized Representative Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Rajesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Corporate Email <span className="req">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="admin@yourfirm.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Phone Number <span className="req">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`form-input ${errors.phone ? 'input-error' : ''}`}
                      placeholder="10-digit mobile"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    />
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Firm / Construction Company Name {requestType === 'firm_onboarding' && <span className="req">*</span>}
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.company ? 'input-error' : ''}`}
                    placeholder="e.g. Apex Builders Ltd"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                  {errors.company && <span className="field-error">{errors.company}</span>}
                </div>

                {requestType === 'firm_onboarding' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Target Subscription Plan</span>
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                          Base: {activePlanInfo.users} Users · {activePlanInfo.projects} Projects
                        </span>
                      </label>
                      <select
                        className="form-select"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="Basic Plan">{`Basic Plan (${planLimits.Basic} Users · ${projLimits.Basic} Projects · ${formatINR(planPrices.Basic)}/mo)`}</option>
                        <option value="Pro Plan">{`Pro Plan (${planLimits.Pro} Users · ${projLimits.Pro} Projects · ${formatINR(planPrices.Pro)}/mo)`}</option>
                        <option value="Enterprise Plan">{`Enterprise Plan (${planLimits.Enterprise} Users · ${projLimits.Enterprise} Projects · ${formatINR(planPrices.Enterprise)}/mo)`}</option>
                      </select>
                    </div>

                    {/* Unified Extra Capacity + Quota & Estimate Summary Panel */}
                    <div
                      style={{
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        marginBottom: 16,
                        background: '#f8fafc'
                      }}
                    >
                      <div style={{ padding: '14px 16px' }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            marginBottom: 10
                          }}
                        >
                          Optional Pre-Purchased Extra Capacity
                        </div>
                        <div className="grid-2">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label
                              className="form-label"
                              style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}
                            >
                              <span style={{ fontWeight: 600 }}>Extra Users</span>
                              <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>+₹199/user/mo</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="form-input"
                              placeholder="0"
                              value={extraUsers === 0 ? '' : extraUsers}
                              onChange={(e) => setExtraUsers(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              style={{ background: '#fff' }}
                            />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              Saves 60% vs ₹499 overage
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label
                              className="form-label"
                              style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}
                            >
                              <span style={{ fontWeight: 600 }}>Extra Projects</span>
                              <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>+₹799/project/mo</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="form-input"
                              placeholder="0"
                              value={extraProjects === 0 ? '' : extraProjects}
                              onChange={(e) => setExtraProjects(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              style={{ background: '#fff' }}
                            />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              Saves 60% vs ₹1,999 overage
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Clean Non-Wrapping Summary Bar */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          alignItems: 'center',
                          gap: 16,
                          padding: '13px 16px',
                          background: '#fff7ed',
                          borderTop: '1px solid #fed7aa'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Total Requested Quota
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                            {totalUsers} Users · {totalProjects} Projects
                          </div>
                          <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>
                            {activePlanInfo.users} base + {extraU} extra users · {activePlanInfo.projects} base + {extraP} extra projects
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 10.5, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Estimated Monthly
                          </div>
                          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginTop: 1 }}>
                            ₹{estimatedMonthly.toLocaleString('en-IN')}
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#9a3412' }}>/mo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">
                    {requestType === 'firm_onboarding' ? 'Workspace Requirements & Notes' : 'Message'} <span className="req">*</span>
                  </label>
                  <textarea
                    className={`form-textarea ${errors.message ? 'input-error' : ''}`}
                    placeholder={
                      requestType === 'firm_onboarding'
                        ? 'Describe your ongoing projects, expected sites, and any special onboarding requirements...'
                        : 'Tell us how we can assist you...'
                    }
                    style={{ minHeight: '88px' }}
                    value={message}
                    maxLength={1000}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                  {errors.message && <span className="field-error">{errors.message}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 14 }}
                  disabled={loading}
                >
                  <Send size={15} />
                  {loading
                    ? 'Submitting Request...'
                    : (requestType === 'firm_onboarding' ? 'Submit Firm Creation Request' : 'Send Message')}
                </button>

                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', marginBottom: 0 }}>
                  {requestType === 'firm_onboarding'
                    ? 'Forwarded directly to the Platform Super Admin for manual verification and workspace onboarding.'
                    : 'Your inquiry will be routed directly to our platform support desk.'}
                </p>
              </form>
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
                padding: '32px',
                textAlign: 'center'
              }}
            >
              <div className="icon-box icon-box-green icon-box-lg" style={{ margin: '0 auto 16px', borderRadius: '50%' }}>
                <CheckCircle2 size={28} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '8px' }}>
                {requestType === 'firm_onboarding' ? 'Firm Request Submitted Successfully!' : 'Inquiry Sent Successfully!'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '20px' }}>
                {requestType === 'firm_onboarding' ? (
                  <>Your firm creation request for <strong>{company || name}</strong> has been logged and forwarded directly to the Platform Super Admin.</>
                ) : (
                  <>Thank you <strong>{name}</strong>, your inquiry has been received. Our support team will get back to you shortly.</>
                )}
              </p>
              {requestType === 'firm_onboarding' ? (
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <strong style={{ fontSize: '13px' }}>Next steps for firm creation:</strong>
                  <ul style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '18px', lineHeight: 1.8 }}>
                    <li>The Super Admin will review your company details and verify domain parameters</li>
                    <li>Our representative will contact you via phone ({phone}) or email ({email})</li>
                    <li>Upon approval, your firm workspace will be provisioned with full admin credentials</li>
                  </ul>
                </div>
              ) : (
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <strong style={{ fontSize: '13px' }}>What happens next:</strong>
                  <ul style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '18px', lineHeight: 1.8 }}>
                    <li>Our support specialist will review your question</li>
                    <li>We will reach out to <strong>{email}</strong> or <strong>{phone}</strong> within 1 business day</li>
                  </ul>
                </div>
              )}
              <Link to="/" className="btn btn-primary btn-full">
                Back to Home
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary btn-full"
                style={{ marginTop: '8px' }}
              >
                Submit Another Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
