import React from 'react';
import { useOutletContext } from 'react-router-dom';
import UserSettings from '../../../components/common/UserSettings';

export default function SuperuserSettings() {
  const { user, setUser } = useOutletContext();
  return <UserSettings user={user} onUserUpdated={setUser} />;
}
