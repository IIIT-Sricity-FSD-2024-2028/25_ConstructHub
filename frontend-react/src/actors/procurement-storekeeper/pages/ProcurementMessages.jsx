import { useOutletContext } from 'react-router-dom';
import MessagesChat from '../../../components/common/MessagesChat';

export default function ProcurementMessages() {
  const { user } = useOutletContext();
  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Team Messages</h1>
          <p className="page-subtitle">Talk to site engineers, project managers and finance about orders and deliveries</p>
        </div>
      </div>
      <MessagesChat user={user} />
    </div>
  );
}
