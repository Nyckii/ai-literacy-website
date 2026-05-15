import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import './Layout.scss';

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.slice(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="layout">
      <div className="rainbow-strip" aria-hidden />
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">Bias Arcade</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/#games">Games</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/resources">Resources</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark" aria-hidden />
              <span className="brand-name">Bias Arcade</span>
            </Link>
            <p className="footer-tagline">
              An interactive AI literacy project from ETH Zürich, built in
              collaboration with PEACH.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Browse</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#games">Games</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/resources">Resources</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Team — Group 2</h4>
            <ul className="footer-team">
              <li>Xiaozihan Wang</li>
              <li>Akankshya Ingale</li>
              <li>Nagyung Kim</li>
              <li>Leroy Borgeaud dit Avocat</li>
              <li>Nicolas Stucki</li>
            </ul>
            <p className="footer-course">
              FS26 · Design in Educational Technology
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Bias Arcade</p>
          <a
            href="https://github.com/Nyckii/ai-literacy-website"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub →
          </a>
        </div>

        <div className="rainbow-strip rainbow-strip-bottom" aria-hidden />
      </footer>
    </div>
  );
}
