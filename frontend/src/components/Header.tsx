type HeaderProps = {
  onGoHome: () => void;
  inStudio: boolean;
};

export function Header({ onGoHome, inStudio }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand" onClick={onGoHome} role="button" tabIndex={0}>
        <span className="brand-dot" />
        <span>LiveStream</span>
      </div>

      <nav className="topnav">
        <button className={!inStudio ? "topnav-btn active" : "topnav-btn"} onClick={onGoHome}>
          Home
        </button>
        <button className={inStudio ? "topnav-btn active" : "topnav-btn"} disabled>
          Studio
        </button>
      </nav>

      <div className="avatar">JD</div>
    </header>
  );
}
