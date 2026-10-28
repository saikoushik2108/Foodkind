import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Search,
  ClipboardList,
  Truck,
  HeartHandshake,
  Bell,
  BarChart3,
  Building2,
  Settings,
  Users,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Menu,
  LogOut,
  Sparkles,
  Leaf,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { notificationApi } from '../api/resources.js';
import { Badge, Button } from './ui.jsx';

/**
 * Main navigation entries.
 *
 * Navigation is assembled from the viewer's role and organization type, so an
 * unauthorized user never even sees administrative links, and the API enforces
 * the same rules independently.
 */
function useNavigation() {
  const { role, organization, isDonor, isRecipient, isPartner, isVolunteer, isAgent } = useAuth();
  const isAdmin = role === 'ADMIN';

  const groups = [];

  const main = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

  if (isDonor) {
    main.push({ to: '/donations/new', label: 'Publish surplus', icon: Package });
    main.push({ to: '/donations/mine', label: 'My listings', icon: ClipboardList });
    main.push({ to: '/predictions', label: 'Surplus forecast', icon: Sparkles });
  }

  if (isRecipient || isAgent || isVolunteer) {
    main.push({ to: '/marketplace', label: 'Find surplus', icon: Search });
  }

  if (isRecipient) {
    main.push({ to: '/demand-requests', label: 'Our demand', icon: HeartHandshake });
  }

  main.push({ to: '/reservations', label: isDonor ? 'Reservations' : (isAgent ? 'Reservations' : 'Our reservations'), icon: ClipboardList });

  main.push({ to: '/pickups', label: isAgent ? 'Rescue pickups' : 'Pickups', icon: Truck });

  groups.push({ label: 'Operations', items: main });

  groups.push({
    label: 'Insights',
    items: [
      { to: '/impact', label: 'Impact analytics', icon: BarChart3 },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
    ],
  });

  groups.push({
    label: 'Account',
    items: [
      { to: '/organization', label: 'Organization', icon: Building2 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  });

  if (isAdmin) {
    groups.push({
      label: 'Administration',
      items: [
        { to: '/admin', label: 'Platform overview', icon: ShieldCheck },
        { to: '/admin/verification', label: 'Verification queue', icon: Building2 },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/donations', label: 'Donation monitoring', icon: Package },
        { to: '/admin/pickups', label: 'Pickup monitoring', icon: Truck },
        { to: '/admin/incidents', label: 'Incidents', icon: AlertTriangle },
        { to: '/admin/analytics', label: 'Platform analytics', icon: BarChart3 },
        { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
      ],
    });
  }

  void organization;
  return groups;
}

export function AppLayout() {
  const { user, organization, logout, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const groups = useNavigation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const { items } = await notificationApi.list({ limit: 20, unread: 'true' });
        if (!cancelled) setUnread(items.filter((n) => !n.readAt).length);
      } catch (error) {
        // A missing badge is not worth interrupting the user; log for diagnosis.
        console.warn('Could not load unread notifications:', error.message);
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await logout();
      toast.success('You have been signed out.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message);
    }
  }

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {drawerOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} aria-label="Main navigation">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Foodkind</span>
            <span className="brand-tagline">Rescue · Nourish</span>
          </span>
        </Link>

        {organization ? (
          <div className="sidebar-org">
            <div className="sidebar-org-name">{organization.name}</div>
            <div className="sidebar-org-meta">
              {organization.type ? organization.type.toLowerCase() : 'member'}
              {' · '}
              {organization.verificationStatus === 'APPROVED' ? 'verified' : organization.verificationStatus?.toLowerCase()}
            </div>
          </div>
        ) : null}

        <nav className="stack" style={{ gap: 'var(--space-5)' }}>
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin' || item.to === '/dashboard'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge && unread > 0 ? <span className="nav-badge">{unread}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="small strong" style={{ display: 'block' }}>
                {user?.name}
              </span>
              <span className="tiny" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {isAdmin ? 'Platform administrator' : user?.membershipRole?.toLowerCase()}
              </span>
            </span>
          </div>
          <Button variant="secondary" size="sm" icon={LogOut} className="btn-block" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <Button
            variant="ghost"
            size="sm"
            className="menu-toggle btn-icon"
            icon={drawerOpen ? X : Menu}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
          />
          <div>
            <div className="topbar-title">
              {groups.flatMap((g) => g.items).find((item) => location.pathname.startsWith(item.to) && item.to !== '/dashboard')?.label ||
                'Dashboard'}
            </div>
            <div className="topbar-subtitle">{organization?.name || 'Foodkind'}</div>
          </div>

          <div className="user-menu">
            {organization && organization.verificationStatus !== 'APPROVED' ? (
              <Badge variant="warning">
                {organization.verificationStatus === 'PENDING' ? 'Verification pending' : organization.verificationStatus}
              </Badge>
            ) : null}
            <NavLink to="/notifications" className="btn btn-ghost btn-icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell size={19} aria-hidden="true" />
            </NavLink>
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
          </div>
        </header>

        <main id="main-content" className="grow">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
