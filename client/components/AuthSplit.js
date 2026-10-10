import ThemeToggle from './ThemeToggle';

// Two-panel layout shared by the login and register screens.
export default function AuthSplit({ children }) {
  return (
    <div className="auth-split">
      <div className="auth-theme"><ThemeToggle /></div>

      <section className="auth-hero">
        <div>
          <div className="logo">DesignHub</div>
          <h2>Manage your creative business in one place.</h2>
          <div className="pillars">Clients • Projects • Payments • Reports</div>
          <div className="mock-card" aria-hidden="true">
            <span className="w1" />
            <span className="w2" />
            <span className="w3" />
            <span className="w4" />
            <span className="w5" />
            <i className="bubble" />
          </div>
        </div>
        <div className="foot">A simple workspace for modern designers.</div>
      </section>

      <section className="auth-form-side">{children}</section>
    </div>
  );
}
