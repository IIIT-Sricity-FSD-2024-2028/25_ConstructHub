import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { isValidDomain, isValidEmail, isValidPhone } from '../services/utils';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [domain, setDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(val) {
    setCompanyName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    setCompanyCode(slug);
    setDomain(slug ? `${slug}.com` : 'company.com');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const newErrors = {};

    if (!companyName.trim()) newErrors.companyName = 'Company Name is required';
    if (!companyCode.trim()) newErrors.companyCode = 'Company Code is required';
    else if (!/^[a-zA-Z0-9_-]+$/.test(companyCode.trim())) {
      newErrors.companyCode = 'Code must contain only letters, numbers, hyphens or underscores';
    }

    if (!domain.trim()) newErrors.domain = 'Company Email Domain is required';
    else if (!isValidDomain(domain.trim())) {
      newErrors.domain = 'Enter a valid domain name (e.g. apex.com)';
    }

    if (!adminName.trim()) newErrors.adminName = 'Admin Full Name is required';
    if (!adminEmail.trim()) newErrors.adminEmail = 'Admin Email Address is required';
    else if (!isValidEmail(adminEmail.trim())) {
      newErrors.adminEmail = 'Enter a valid email address';
    }

    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (phone && !isValidPhone(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (domain && adminEmail && isValidDomain(domain) && isValidEmail(adminEmail)) {
      const emailDomain = adminEmail.split('@')[1] || '';
      if (emailDomain.toLowerCase() !== domain.toLowerCase()) {
        newErrors.adminEmail = `Admin email domain (@${emailDomain}) must match company domain (@${domain})`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const payload = {
      company: {
        name: companyName.trim(),
        code: companyCode.trim().toLowerCase(),
        domain: domain.trim().toLowerCase(),
        phone: phone || '9800011111',
        plan: 'Basic'
      },
      admin: {
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password,
        phone: phone || '9800011111'
      }
    };

    const res = await api.registerCompany(payload);
    setLoading(false);

    if (res && res.error) {
      const msg = res.message || 'Registration failed.';
      if (msg.toLowerCase().includes('domain')) setErrors({ domain: msg });
      else if (msg.toLowerCase().includes('email')) setErrors({ adminEmail: msg });
      else if (msg.toLowerCase().includes('code')) setErrors({ companyCode: msg });
      else setServerError(msg);
      return;
    }

    setSuccessMsg('Company Workspace registered successfully! Redirecting to login...');
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="reg-card">
        <div className="reg-header">
          <div className="reg-logo">
            <Building2 size={28} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
            Register Your Construction Firm
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Create a dedicated company workspace on ConstructHub
          </p>
        </div>

        {serverError && <div className="error-msg" style={{ display: 'block' }}>{serverError}</div>}
        {successMsg && <div className="badge badge-green" style={{ width: '100%', padding: '12px', marginBottom: '16px', fontSize: '13px', display: 'block', textAlign: 'center' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Company Name <span className="req">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.companyName ? 'input-error' : ''}`}
              placeholder="e.g. Apex Constructions Ltd"
              value={companyName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            {errors.companyName && <span className="field-error">{errors.companyName}</span>}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Company Code / Tag <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.companyCode ? 'input-error' : ''}`}
                placeholder="e.g. apex"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toLowerCase())}
                style={{ fontWeight: 700 }}
                required
              />
              {errors.companyCode && <span className="field-error">{errors.companyCode}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Company Email Domain <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.domain ? 'input-error' : ''}`}
                placeholder="e.g. apex.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                required
              />
              {errors.domain && <span className="field-error">{errors.domain}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Admin Full Name <span className="req">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.adminName ? 'input-error' : ''}`}
              placeholder="e.g. Siva Sathwik"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
            {errors.adminName && <span className="field-error">{errors.adminName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Admin Email Address <span className="req">*</span>
            </label>
            <input
              type="email"
              className={`form-input ${errors.adminEmail ? 'input-error' : ''}`}
              placeholder="admin@apex.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
            {errors.adminEmail && <span className="field-error">{errors.adminEmail}</span>}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
              Emails added by your firm will default to this domain.
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Password <span className="req">*</span>
              </label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'input-error' : ''}`}
                placeholder="10-digit number"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Creating Workspace...' : 'Create Company Workspace'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already registered your firm?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
