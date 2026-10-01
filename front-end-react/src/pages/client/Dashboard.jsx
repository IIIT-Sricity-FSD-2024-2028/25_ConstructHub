import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Client Dashboard</h1>

      <p>Welcome, {user?.name}</p>
      <p>Role: {user?.role}</p>

      <button onClick={logout}>
        Logout
      </button>
    </main>
  );
}

export default Dashboard;