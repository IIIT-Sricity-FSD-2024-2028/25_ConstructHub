import React from 'react';
import { useOutletContext } from 'react-router-dom';
import UserSettings from '../../../components/common/UserSettings';

export default function ProjectManagerSettings() {
  const { user, setUser } = useOutletContext();
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your personal profile and security preferences</p>
        </div>
      </div>
      <UserSettings user={user} onUpdateUser={setUser} />
    </div>
  );
}
