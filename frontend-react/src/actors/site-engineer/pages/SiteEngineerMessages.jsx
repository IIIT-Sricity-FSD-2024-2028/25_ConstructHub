import React from 'react';
import { useOutletContext } from 'react-router-dom';
import MessagesChat from '../../../components/common/MessagesChat';

export default function SiteEngineerMessages() {
  const { user } = useOutletContext();
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Team Messages</h1>
          <p className="page-subtitle">Chat with project managers, colleagues, and administrators</p>
        </div>
      </div>
      <MessagesChat user={user} />
    </div>
  );
}
