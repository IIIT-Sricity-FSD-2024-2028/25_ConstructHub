import { useOutletContext } from 'react-router-dom';
import UserSettings from '../../../components/common/UserSettings';

export default function SuperuserSettings() {
  const { user } = useOutletContext();
  return <UserSettings user={user} />;
}
