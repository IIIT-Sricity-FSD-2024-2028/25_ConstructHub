import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HardHat,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { isValidEmail } from '../services/utils';

export default function Contact() {
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || '';
  const isFirmRequest = searchParams.get('request') === 'firm' || Boolean(initialPlan);

  const [requestType, setRequestType] = useState(isFirmRequest ? 'firm_onboarding' : 'inquiry');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [plan, setPlan] = useState(initialPlan ? (initialPlan.includes('Plan') ? initialPlan : `${initialPlan} Plan`) : 'Pro Plan');
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraProjects, setExtraProjects] = useState(0);
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const planDetails = {
    'Basic Plan': { users: 10, projects: 3, baseFee: 4999 },
    'Pro Plan': { users: 50, projects: 15, baseFee: 9999 },
    'Enterprise Plan': { users: 500, projects: 100, baseFee: 19999 }
  };
  const activePlanInfo = planDetails[plan] || planDetails['Pro Plan'];

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

    const extraU = Math.max(0, parseInt(extraUsers, 10) || 0);
    const extraP = Math.max(0, parseInt(extraProjects, 10) || 0);

    const fullMessage = requestType === 'firm_onboarding'
      ? `[Firm Onboarding Request | Plan: ${plan} | Base: ${activePlanInfo.users} Users, ${activePlanInfo.projects} Projects | Extra: +${extraU} Users, +${extraP} Projects | Total Capacity: ${activePlanInfo.users + extraU} Users, ${activePlanInfo.projects + extraP} Projects] ${company ? `Company: ${company.trim()} | ` : ''}${message.trim()}`
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
    <div style={{ background: '#fdf5ef', minHeight: '100vh' }}>
      <nav className="landing-nav">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit' }}>
          <HardHat size={20} color="var(--primary)" />
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>ConstructHub</span>
        </Link>
        <div className="landing-nav-links">
          <Link to="/">Home</Link>
          <Link to="/login">Sign In</Link>
        </div>
        <Link to="/" className="btn btn-primary btn-sm">
          ← Back to Home
        </Link>
      </nav>

      <div className="contact-layout">
        <div className="contact-info">
          <h1>
            {requestType === 'firm_onboarding'
              ? 'Request Enterprise Firm Onboarding'
              : 'Get in Touch with Our Platform Team'}
          </h1>
          <p>
            {requestType === 'firm_onboarding'
              ? 'Submit your firm creation request to ConstructHub administration. Our Platform Super Admin will review your requirements, reach out directly to your authorized contact, and establish your dedicated workspace.'
              : 'Let us discuss how ConstructHub can transform your construction project operations and financial oversight.'}
          </p>

          <div className="contact-card">
            <div className="icon-box icon-box-orange">
              <Phone size={20} />
            </div>
            <div>
              <h4>Call Direct Sales</h4>
              <p>+91 98765 43210</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="icon-box icon-box-blue">
              <Mail size={20} />
            </div>
            <div>
              <h4>Email Support & Inquiries</h4>
              <p>sales@constructhub.com</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="icon-box icon-box-green">
              <Building2 size={20} />
            </div>
            <div>
              <h4>Headquarters</h4>
              <p>123 Business Park, Mumbai, India</p>
            </div>
          </div>

          <div className="expect-box">
            <h4>Super Admin Onboarding Process:</h4>
            <div className="expect-item"><CheckCircle2 size={16} /> Request routed directly to Platform Super Admin</div>
            <div className="expect-item"><CheckCircle2 size={16} /> Direct contact call & requirements verification</div>
            <div className="expect-item"><CheckCircle2 size={16} /> Dedicated Company Code & Domain configuration</div>
            <div className="expect-item"><CheckCircle2 size={16} /> Company Administrator credentials initialized</div>
          </div>
        </div>

        <div>
          {!submitted ? (
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${requestType === 'firm_onboarding' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRequestType('firm_onboarding')}
                  style={{ flex: 1 }}
                >
                  <Building2 size={14} style={{ marginRight: 4 }} /> Register Firm Request
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${requestType === 'inquiry' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRequestType('inquiry')}
                  style={{ flex: 1 }}
                >
                  <Mail size={14} style={{ marginRight: 4 }} /> General Inquiry
                </button>
              </div>

              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {requestType === 'firm_onboarding' ? 'Register Your Firm' : 'Send an Inquiry'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                {requestType === 'firm_onboarding'
                  ? 'Provide your organization details for platform verification and workspace provisioning'
                  : 'Fill in your details and our team will get in touch shortly'}
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
                          Base Quota: {activePlanInfo.users} Users · {activePlanInfo.projects} Projects
                        </span>
                      </label>
                      <select
                        className="form-select"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="Basic Plan">Basic Plan (Base: 10 Users · 3 Projects · ₹4,999/mo)</option>
                        <option value="Pro Plan">Pro Plan (Base: 50 Users · 15 Projects · ₹9,999/mo)</option>
                        <option value="Enterprise Plan">Enterprise Plan (Base: 500 Users · 100 Projects · ₹19,999/mo)</option>
                      </select>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                        Optional Pre-Purchased Extra Capacity
                      </div>
                      <div className="grid-2">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
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
                          />
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Discounted (saves 60% vs ₹499 overage)
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
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
                          />
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Discounted (saves 60% vs ₹1,999 overage)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#eef2ff', padding: '12px 14px', borderRadius: 8, border: '1px solid #c7d2fe', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#4338ca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total Requested Quota
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginTop: 2 }}>
                          {activePlanInfo.users + (Number(extraUsers) || 0)} Users ({activePlanInfo.users} base + {Number(extraUsers) || 0} extra) · {activePlanInfo.projects + (Number(extraProjects) || 0)} Projects ({activePlanInfo.projects} base + {Number(extraProjects) || 0} extra)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#4338ca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Estimated Monthly
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
                          ₹{(activePlanInfo.baseFee + (Number(extraUsers) || 0) * 199 + (Number(extraProjects) || 0) * 799).toLocaleString('en-IN')}/mo
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
                    style={{ minHeight: '90px' }}
                    value={message}
                    maxLength={1000}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                  {errors.message && <span className="field-error">{errors.message}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={loading}
                >
                  <Send size={15} />
                  {loading
                    ? 'Submitting Request...'
                    : (requestType === 'firm_onboarding' ? 'Submit Firm Creation Request' : 'Send Message')}
                </button>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                  {requestType === 'firm_onboarding'
                    ? 'Requests are forwarded directly to the Platform Super Admin for manual verification and workspace onboarding.'
                    : 'Your inquiry will be routed to our customer support desk.'}
                </p>
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
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
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <strong style={{ fontSize: '13px' }}>Next steps for firm creation:</strong>
                  <ul style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', paddingLeft: '18px', lineHeight: 1.8 }}>
                    <li>The Super Admin will review your company details and verify domain parameters</li>
                    <li>Our representative will contact you via phone ({phone}) or email ({email})</li>
                    <li>Upon approval, your firm workspace will be provisioned with full admin credentials</li>
                  </ul>
                </div>
              ) : (
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
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
