import React, { useState } from 'react';
import { User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { isValidEmail, isValidPhone } from '../../services/utils';
import Modal from './Modal';

export default function UserSettings({ user, onUserUpdated, onUpdateUser }) {
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : '');
  const [lastName, setLastName] = useState(user?.name ? user.name.split(' ').slice(1).join(' ') : '');
  const [phone, setPhone] = useState(user?.phone ? user.phone.replace(/[^0-9]/g, '').slice(-10) : '');

  // Errors
  const [errors, setErrors] = useState({});

  // Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  // Modals
  const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });

  async function handleSaveProfile(e) {
    e.preventDefault();
    const newErrors = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    if (phone && !isValidPhone(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const updatedName = `${firstName.trim()} ${lastName.trim()}`;
    const changes = {
      name: updatedName,
      phone: phone ? `+91 ${phone}` : user?.phone || ''
    };

    const res = await api.updateUser(user.id, changes);
    const updatedUser = { ...user, ...changes };
    api.setCurrentUser(updatedUser);
    if (onUserUpdated) onUserUpdated(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);

    setSuccessModal({
      open: true,
      title: 'Profile Updated',
      message: 'Your personal information has been successfully saved.'
    });
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setPwError('');

    if (!currentPw) {
      setPwError('Please enter your current password.');
      return;
    }

    // Verify current password against auth API
    const verifyRes = await api.login(user.email, currentPw);
    if (verifyRes && verifyRes.error) {
      setPwError('Current password does not match.');
      return;
    }

    if (!newPw || newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    const updateRes = await api.updateUser(user.id, { password: newPw });
    if (updateRes && updateRes.error) {
      setPwError(Array.isArray(updateRes.message) ? updateRes.message.join(', ') : (updateRes.message || 'Failed to update password.'));
      return;
    }

    const updatedUser = { ...user, password: newPw };
    api.setCurrentUser(updatedUser);
    if (onUserUpdated) onUserUpdated(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);

    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');

    setSuccessModal({
      open: true,
      title: 'Password Updated',
      message: 'Your account password has been updated successfully.'
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your personal profile and security credentials</p>
      </div>

      {/* Profile Section */}
      <div className="card mb-16">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div className="icon-box icon-box-orange">
            <User size={20} />
          </div>
          <h3 className="card-title" style={{ marginBottom: 0 }}>Profile Information</h3>
        </div>

        <form onSubmit={handleSaveProfile}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                First Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {errors.firstName && <span className="field-error">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Last Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {errors.lastName && <span className="field-error">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address <span style={{ fontSize: 11, fontWeight: 'normal', color: 'var(--text-muted)' }}>(View Only)</span>
            </label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              readOnly
              style={{
                backgroundColor: 'var(--bg-card-hover, rgba(0, 0, 0, 0.04))',
                cursor: 'not-allowed',
                opacity: 0.85,
                color: 'var(--text-muted)'
              }}
              title="Email address is associated with your company domain and cannot be modified."
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Email address is associated with your account and cannot be modified.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="10-digit phone number"
              value={phone}
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div className="icon-box icon-box-green">
            <ShieldCheck size={20} />
          </div>
          <h3 className="card-title" style={{ marginBottom: 0 }}>Security & Password</h3>
        </div>

        <form onSubmit={handleUpdatePassword}>
          {pwError && <div className="error-msg" style={{ display: 'block' }}>{pwError}</div>}

          <div className="form-group">
            <label className="form-label">
              Current Password <span className="req">*</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                New Password <span className="req">*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Confirm New Password <span className="req">*</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModal.open}
        onClose={() => setSuccessModal({ open: false, title: '', message: '' })}
        title={successModal.title}
        subtitle={successModal.message}
        footer={
          <button
            type="button"
            className="btn btn-success"
            onClick={() => setSuccessModal({ open: false, title: '', message: '' })}
          >
            Done
          </button>
        }
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="icon-box icon-box-lg icon-box-green" style={{ margin: '0 auto 12px', borderRadius: '50%' }}>
            <CheckCircle2 size={26} />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{successModal.message}</p>
        </div>
      </Modal>
    </div>
  );
}
