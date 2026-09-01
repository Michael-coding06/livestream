import { useLocation, useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/";

  return (
    <header className="topbar">
      <div className="brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
        <span className="brand-dot" />
        <span>LiveStream</span>
      </div>

      <nav className="topnav">
        <button
          className={isDashboard ? "topnav-btn active" : "topnav-btn"}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
      </nav>

      <div className="avatar">JD</div>
    </header>
  );
}
