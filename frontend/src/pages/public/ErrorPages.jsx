import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, LinkButton, PageHeader } from '../../components/ui.jsx';

const REASONS = {
  role: {
    title: 'Your account does not have this role',
    body: 'Administrative tools are limited to platform administrators. If you believe you should have access, contact a platform administrator.',
  },
  'org-type': {
    title: 'Your organization type cannot use this area',
    body: 'This area is limited to a specific kind of partner — for example, only recipient organizations can post demand requests, and only donors can publish surplus.',
  },
  unverified: {
    title: 'Your organization is not verified yet',
    body: 'Publishing surplus and claiming food require an approved organization. You can still review your profile and upload verification documents while you wait.',
  },
  default: {
    title: 'You do not have access to this page',
    body: 'Your role or organization is not permitted to open this page. Nothing has gone wrong with your account.',
  },
};

/** Shown when a signed-in user reaches something they may not use. */
export function AccessDeniedPage() {
  const location = useLocation();
  const { organization } = useAuth();
  const reason = REASONS[location.state?.reason] || REASONS.default;

  return (
    <div className="page">
      <PageHeader title="Access denied" subtitle="This page is not available to your account." />

      <Alert variant="warning" title={reason.title}>
        {reason.body}
      </Alert>

      {organization ? (
        <p className="small muted mt-4">
          Signed in as <strong>{organization.name}</strong> ({organization.type.toLowerCase()}
          {organization.verificationStatus !== 'APPROVED'
            ? `, verification ${organization.verificationStatus.toLowerCase()}`
            : ', verified'}
          ).
        </p>
      ) : null}

      <div className="row mt-5">
        <LinkButton to="/dashboard" variant="primary">
          Back to dashboard
        </LinkButton>
        {organization && organization.verificationStatus !== 'APPROVED' ? (
          <LinkButton to="/organization" variant="secondary">
            View verification status
          </LinkButton>
        ) : null}
      </div>
    </div>
  );
}

/** Shown for unknown routes, inside or outside the app shell. */
export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="page">
      <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-5)' }}>
        <span className="empty-state-icon" aria-hidden="true">
          <Compass size={22} />
        </span>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginTop: 'var(--space-2)' }}>Page not found</h1>
        <p>
          The page you asked for does not exist, or it has been moved. Check the address, or head back to
          somewhere useful.
        </p>
        <div className="row mt-3">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Go back
          </button>
          <LinkButton to={isAuthenticated ? '/dashboard' : '/'} variant="primary">
            {isAuthenticated ? 'Go to dashboard' : 'Go to the homepage'}
          </LinkButton>
        </div>
      </div>

      <p className="tiny muted mt-4 text-center">
        <ShieldAlert size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> If you
        followed a link from inside the app, the record may have been removed or renamed.
      </p>
    </div>
  );
}

export default NotFoundPage;
