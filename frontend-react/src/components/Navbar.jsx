import {
  Bell,
  LogOut,
  UserCircle,
} from "lucide-react";

export default function Navbar({ user }) {
  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    window.location.href = "/login.html";
  }

  return (
    <header className="navbar">

      <div className="navbar-brand">
        <h2>ConstructHub</h2>
      </div>

      <div className="navbar-actions">

        <button
          type="button"
          className="icon-button"
        >
          <Bell size={20} />
        </button>

        <div className="user-info">

          <UserCircle size={30} />

          <div>
            <strong>
              {user?.name ||
                user?.fullName ||
                "Project Manager"}
            </strong>

            <small>
              Project Manager
            </small>
          </div>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={logout}
        >
          <LogOut size={18} />
          Logout
        </button>

      </div>

    </header>
  );
}