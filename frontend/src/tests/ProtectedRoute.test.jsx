import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// The guard reads the session from the auth context; mocking that keeps these
// tests focused on the routing decision rather than on network behaviour.
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderRoute(children, { path = '/dashboard' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={children} />
        <Route path="/login" element={<div>Sign in page</div>} />
        <Route path="/access-denied" element={<div>Access denied page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function session(overrides = {}) {
  return {
    isAuthenticated: true,
    isLoading: false,
    role: 'ORG_OWNER',
    organization: { type: 'DONOR', verificationStatus: 'APPROVED' },
    user: { id: 'u1', name: 'Test User' },
    ...overrides,
  };
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('shows a loading state while the session resolves', () => {
    useAuth.mockReturnValue(session({ isLoading: true, isAuthenticated: false }));
    renderRoute(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to sign in', () => {
    useAuth.mockReturnValue(session({ isAuthenticated: false }));
    renderRoute(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('sends a wrong-role user to access denied rather than hiding the reason', () => {
    useAuth.mockReturnValue(session({ role: 'ORG_OWNER' }));
    renderRoute(
      <ProtectedRoute roles={['ADMIN']}>
        <div>Admin tools</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Access denied page')).toBeInTheDocument();
    expect(screen.queryByText('Admin tools')).not.toBeInTheDocument();
  });

  it('allows the matching role through', () => {
    useAuth.mockReturnValue(session({ role: 'ADMIN' }));
    renderRoute(
      <ProtectedRoute roles={['ADMIN']}>
        <div>Admin tools</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Admin tools')).toBeInTheDocument();
  });

  it('blocks a recipient from donor-only routes', () => {
    useAuth.mockReturnValue(session({ organization: { type: 'RECIPIENT', verificationStatus: 'APPROVED' } }));
    renderRoute(
      <ProtectedRoute orgTypes={['DONOR']}>
        <div>Publish surplus</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Access denied page')).toBeInTheDocument();
  });

  it('blocks an unverified organization when verification is required', () => {
    useAuth.mockReturnValue(session({ organization: { type: 'DONOR', verificationStatus: 'PENDING' } }));
    renderRoute(
      <ProtectedRoute orgTypes={['DONOR']} requireVerified>
        <div>Publish surplus</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Access denied page')).toBeInTheDocument();
  });

  it('allows a verified organization of the right type', () => {
    useAuth.mockReturnValue(session());
    renderRoute(
      <ProtectedRoute orgTypes={['DONOR']} requireVerified>
        <div>Publish surplus</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Publish surplus')).toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('shows the page to signed-out visitors', () => {
    useAuth.mockReturnValue(session({ isAuthenticated: false }));
    renderRoute(
      <PublicOnlyRoute>
        <div>Sign in form</div>
      </PublicOnlyRoute>,
      { path: '/login' }
    );
    expect(screen.getByText('Sign in form')).toBeInTheDocument();
  });

  it('sends an already signed-in user to the dashboard', () => {
    useAuth.mockReturnValue(session());
    renderRoute(
      <PublicOnlyRoute>
        <div>Sign in form</div>
      </PublicOnlyRoute>,
      { path: '/login' }
    );
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Sign in form')).not.toBeInTheDocument();
  });
});
