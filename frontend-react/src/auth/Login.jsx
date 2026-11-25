import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../services/utils';
import Modal from '../components/common/Modal';
import ConstructHubLogo from '../components/common/ConstructHubLogo';
import towerFacadeImg from '../assets/login-architecture.jpg';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem('ch_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('ch_remembered_email')));
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [mailSentModal, setMailSentModal] = useState(false);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser && currentUser.role) {
      const roleMap = {
        superuser: '/superuser/dashboard',
        company_admin: '/company-admin/dashboard',
        project_manager: '/project-manager/dashboard',
        site_engineer: '/site-engineer/dashboard',
        finance_manager: '/finance-manager/dashboard',
        procurement_storekeeper: '/procurement-storekeeper/dashboard',
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
      if (remember) localStorage.setItem('ch_remembered_email', email.trim());
      else localStorage.removeItem('ch_remembered_email');
      const role = res.user.role;
      const roleMap = {
        superuser: '/superuser/dashboard',
        company_admin: '/company-admin/dashboard',
        project_manager: '/project-manager/dashboard',
        site_engineer: '/site-engineer/dashboard',
        finance_manager: '/finance-manager/dashboard',
        procurement_storekeeper: '/procurement-storekeeper/dashboard',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            <Link to="/" aria-label="ConstructHub Home">
              <ConstructHubLogo size={32} textSize={17} />
            </Link>
            <Link to="/" className="back-link" style={{ marginBottom: 0 }}>
              <ArrowLeft size={14} /> Home
            </Link>
          </div>

          <h1 className="login-title">Sign in to your workspace</h1>
          <p className="login-sub">Use your registered email and password to open your role portal.</p>

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
                placeholder="name@company.com"
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
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setForgotModal(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ padding: '12px 18px', fontSize: 14 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            <div>
              New project owner?{' '}
              <Link to="/register-client" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Create a client account
              </Link>
            </div>
            <div>
              Onboarding a construction firm?{' '}
              <Link to="/contact?request=firm" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Request workspace access
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Framed Architectural Panel */}
      <div className="login-right">
        <div className="login-visual-frame">
          <img src={towerFacadeImg} alt="Modern construction tower facade" className="login-visual-img" />
          <div className="login-visual-scrim" />
          <div className="login-visual-content">
            <span className="login-visual-pill">7-Role Construction ERP</span>
            <h2>From tender estimation to verified stage billing.</h2>
            <p>
              Keep project owners, estimators, project managers, storekeepers, site engineers, and finance teams aligned on one milestone-locked ledger.
            </p>
            <div className="login-visual-steps">
              <span>01 · 3-Role Bid Quote</span>
              <span>02 · Mobilization Gate</span>
              <span>03 · Site Stock &amp; Proof</span>
              <span>04 · Stage RA Billing</span>
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
