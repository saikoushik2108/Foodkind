import { Link, NavLink, Outlet } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LinkButton } from '../../components/ui.jsx';

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/food-safety', label: 'Food safety' },
  { to: '/about', label: 'About' },
];

/** Public shell: marketing navigation and footer around public pages. */
export function PublicLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="public-shell">
      <a className="skip-link" href="#public-content">
        Skip to main content
      </a>

      <header className="public-nav">
        <Link to="/" className="brand" style={{ color: 'var(--forest)' }}>
          <span className="brand-mark" aria-hidden="true" style={{ background: 'var(--green-tint)', color: 'var(--forest)' }}>
            <Leaf size={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Foodkind</span>
            <span className="brand-tagline" style={{ color: 'var(--text-faint)' }}>
              Rescue · Nourish
            </span>
          </span>
        </Link>

        <nav className="public-nav-links" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <LinkButton to="/dashboard" variant="primary" size="sm">
              Go to dashboard
            </LinkButton>
          ) : (
            <>
              <NavLink to="/login" className="hide-mobile">
                Sign in
              </NavLink>
              <LinkButton to="/register" variant="primary" size="sm">
                Register your organization
              </LinkButton>
            </>
          )}
        </nav>
      </header>

      <main id="public-content" className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div>
            <strong>Foodkind</strong>
            <p className="small muted" style={{ maxWidth: '48ch' }}>
              A community-first platform that turns surplus food into social impact. Built for canteens,
              restaurants, hostels, event organisers, NGOs, shelters, community kitchens, and volunteer
              delivery partners.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
              <li>
                <Link to="/how-it-works">How it works</Link>
              </li>
              <li>
                <Link to="/food-safety">Food safety</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/register">Partner registration</Link>
              </li>
            </ul>
          </nav>
          <div className="small muted">
            <p>Maps © OpenStreetMap contributors.</p>
            <p className="tiny">
              Foodkind records declarations made by donors and does not certify food safety compliance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
