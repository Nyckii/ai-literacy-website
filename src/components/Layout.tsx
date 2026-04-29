import { Link, NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          <span>AI Literacy</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/#about">About</NavLink>
          <NavLink to="/#games">Games</NavLink>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>ETH Zürich · FS26 · Design in Educational Technology</p>
        <p>
          <a
            href="https://github.com/Nyckii/ai-literacy-website"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
