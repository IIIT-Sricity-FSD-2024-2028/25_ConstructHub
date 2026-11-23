import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConstructHubLogo from '../components/common/ConstructHubLogo';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../services/utils';

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
    // Sign the new client straight in.
    const loginRes = await login(form.email.trim().toLowerCase(), form.password);
    setLoading(false);
    if (loginRes && loginRes.success) navigate('/client/requirements', { replace: true });
    else navigate('/login');
  }

  return (
    <div className="login-layout">
      <div className="login-left">
        <div className="login-panel">
          <Link to="/login" className="back-link">← Back to sign in</Link>
          <h1 className="login-title">Create a client account</h1>
          <p className="login-sub">Post your construction requirement and compare quotations from verified companies.</p>

          <div className="login-form-card">
            {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={form.name} onChange={set('name')} maxLength={80} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10 digits" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" value={form.confirm} onChange={set('confirm')} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ padding: 12 }} disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
      <div className="login-right">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <ConstructHubLogo size={64} textSize={32} variant="light" stacked />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 1.8, opacity: 0.9 }}>
            Post once.<br />Compare quotations.<br />Track your build.
          </div>
        </div>
      </div>
    </div>
  );
}
