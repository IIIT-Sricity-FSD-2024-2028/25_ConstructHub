import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, ShieldCheck, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../services/utils';
import Modal from '../components/common/Modal';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [mailSentModal, setMailSentModal] = useState(false);

  // If already authenticated, redirect straight to the user's dashboard
  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser && currentUser.role) {
      const roleMap = {
        superuser: '/superuser/dashboard',
        company_admin: '/company-admin/dashboard',
        project_manager: '/project-manager/dashboard',
        site_engineer: '/site-engineer/dashboard',
        finance_manager: '/finance-manager/dashboard',
        client: '/client/dashboard'
      };
      if (roleMap[currentUser.role]) {
        navigate(roleMap[currentUser.role], { replace: true });
      }
    }
  }, [navigate]);

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res && res.success && res.user) {
      const role = res.user.role;
      const roleMap = {
        superuser: '/superuser/dashboard',
        company_admin: '/company-admin/dashboard',
        project_manager: '/project-manager/dashboard',
        site_engineer: '/site-engineer/dashboard',
        finance_manager: '/finance-manager/dashboard',
        client: '/client/dashboard'
      };
      navigate(roleMap[role] || '/login', { replace: true });
      return;
    }

    setErrorMsg(res?.message || 'Invalid email or password.');
  }

  function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim() || !isValidEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotModal(false);
    setMailSentModal(true);
  }

  return (
    <div className="login-layout">
      {/* Left Form Panel */}
      <div className="login-left">
        <div className="login-panel">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
          <h1 className="login-title">Sign in to your account</h1>
          <p className="login-sub">Enter your email and password to continue to your workspace.</p>

          <div className="login-form-card">
            <div className="login-helper">
              <div className="icon-box icon-box-orange" style={{ width: 32, height: 32 }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>Secure access</strong>
                Your credentials are required to open your role dashboard.
              </div>
            </div>

            {errorMsg && (
              <div className="error-msg" style={{ display: 'block' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <span
                  onClick={() => { setForgotEmail(email); setForgotModal(true); }}
                  style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Forgot Password?
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ padding: '12px' }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Looking to onboard your firm?{' '}
              <Link to="/contact?request=firm" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Request Enterprise Workspace
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Hero Panel */}
      <div className="login-right">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <div className="icon-box icon-box-lg icon-box-orange" style={{ width: 64, height: 64 }}>
              <HardHat size={36} color="var(--primary)" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '34px', fontWeight: 800, marginBottom: '8px' }}>
            ConstructHub
          </h2>
          <div style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', lineHeight: 1.8, opacity: 0.9 }}>
            Build Smarter.<br />Manage Better.<br />Deliver Faster.
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', marginTop: '20px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.7 }}>
            The all-in-one construction management platform designed to streamline your projects from planning to completion.
          </p>
          <div style={{ display: 'flex', gap: '36px', marginTop: '44px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 800, color: 'var(--primary)' }}>500+</div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>Projects</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>98%</div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>On Time</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 800, color: '#10b981' }}>50K+</div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModal}
        onClose={() => setForgotModal(false)}
        title="Get Password Reset Mail"
        subtitle="Enter your Mail ID below and we'll send you a link to reset your password."
      >
        <form onSubmit={handleForgotSubmit}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">
              Email Address <span className="req">*</span>
            </label>
            <input
              type="email"
              className={`form-input ${forgotError ? 'input-error' : ''}`}
              placeholder="your.email@company.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
            {forgotError && <span className="field-error">{forgotError}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setForgotModal(false)}>
              Dismiss
            </button>
            <button type="submit" className="btn btn-primary btn-full">
              Submit
            </button>
          </div>
        </form>
      </Modal>

      {/* Mail Sent Modal */}
      <Modal
        isOpen={mailSentModal}
        onClose={() => setMailSentModal(false)}
        title="Mail Sent Successfully!"
        subtitle="Check your inbox for the password reset link."
        footer={
          <button
            type="button"
            className="btn btn-success btn-full"
            onClick={() => setMailSentModal(false)}
          >
            Go to Login
          </button>
        }
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="icon-box icon-box-lg icon-box-green" style={{ margin: '0 auto 16px', borderRadius: '50%' }}>
            <CheckCircle2 size={28} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            A password reset email has been dispatched to <strong>{forgotEmail}</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
