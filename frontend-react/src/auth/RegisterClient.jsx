import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../services/utils';
import ConstructHubLogo from '../components/common/ConstructHubLogo';
import commercialComplexImg from '../assets/signup-architecture.jpg';

export default function RegisterClient() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(form.name.trim())) return setError('Enter your full name (letters only).');
    if (!isValidEmail(form.email.trim())) return setError('Enter a valid email address.');
    if (form.phone && !/^(?!0{10})\d{10}$/.test(form.phone)) return setError('Phone number must be exactly 10 digits.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');

    setLoading(true);
    const res = await api.registerClient({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone || undefined
    });
    if (res && res.error) {
      setLoading(false);
      setError(res.message);
      return;
    }
    const loginRes = await login(form.email.trim().toLowerCase(), form.password);
    setLoading(false);
    if (loginRes && loginRes.success) navigate('/client/requirements', { replace: true });
    else navigate('/login');
  }

  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <Link to="/" aria-label="ConstructHub Home">
              <ConstructHubLogo size={32} textSize={17} />
            </Link>
            <Link to="/login" className="back-link" style={{ marginBottom: 0 }}>
              <ArrowLeft size={14} /> Sign in
            </Link>
          </div>

          <h1 className="login-title">Create a client account</h1>
          <p className="login-sub">Post your construction requirement, compare firm quotations, and track milestone billing.</p>

          {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" placeholder="e.g. Vikram Patel" value={form.name} onChange={set('name')} maxLength={80} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@domain.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10-digit mobile number" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 chars" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ padding: '12px 18px', fontSize: 14, marginTop: 4 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Client Account'}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-visual-frame">
          <img src={commercialComplexImg} alt="Modern commercial construction complex" className="login-visual-img" />
          <div className="login-visual-scrim" />
          <div className="login-visual-content">
            <span className="login-visual-pill">Client Marketplace Portal</span>
            <h2>Post once. Compare verified quotations.</h2>
            <p>
              Award a contract with milestone-locked stages, review site reports with photo proof, and pay invoices transparently through your project workspace.
            </p>
            <div className="login-visual-steps">
              <span>01 · Post Requirement</span>
              <span>02 · Compare Bids</span>
              <span>03 · Award &amp; Track</span>
              <span>04 · Verified Billing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
