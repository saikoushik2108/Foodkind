import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingBlock } from './ui.jsx';

/**
 * Route guard.
 *
 * `roles` restricts by global role (ADMIN…), `orgTypes` by the signed-in
 * organization's type, and `requireVerified` blocks pending organizations.
 * Unauthenticated visitors are sent to sign in; authenticated visitors who
 * lack permission get the access-denied page rather than a silent redirect,
 * so the reason is never hidden.
 */
export function ProtectedRoute({ children, roles, orgTypes, requireVerified = false }) {
  const { isAuthenticated, isLoading, role, organization } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="page">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to="/access-denied" replace state={{ reason: 'role' }} />;
  }

  if (orgTypes?.length && !orgTypes.includes(organization?.type)) {
    return <Navigate to="/access-denied" replace state={{ reason: 'org-type' }} />;
  }

  if (requireVerified && organization?.verificationStatus !== 'APPROVED') {
    return <Navigate to="/access-denied" replace state={{ reason: 'unverified' }} />;
  }

  return children;
}

/** Guard for signed-out-only pages (login, register). */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default ProtectedRoute;
