import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="navbar-wrapper">
      <div className="header-top">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🏛️</div>
          <div>
            <span className="logo-text">TRUST</span>
            <span className="logo-subtext">INHERITANCE</span>
          </div>
        </Link>
        <div className="navbar-actions">
          {user ? (
            <div className="user-menu">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span className="user-name" style={{ color: "var(--color-primary)" }}>{user.name}</span>
              <button className="btn-logout-header" style={{ color: "var(--color-muted)" }} onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="navbar">
        <div className="nav-links">
          {/* Add nav links if needed */}
        </div>
        <div className="navbar-actions">
          {!user && (
            <Link to="/login" className="btn-auth-header">
              LOG IN / SIGN UP
            </Link>
          )}
          {user && (
             <div className="user-menu">
                <span className="user-name">Welcome back, {user.name.split(" ")[0]}</span>
                <button className="btn-logout-header" onClick={handleLogout}>
                  DISCONNECT
                </button>
             </div>
          )}
        </div>
      </nav>
    </div>
  );
}
