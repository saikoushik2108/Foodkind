import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Mail, ShieldCheck, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi, uploadApi } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  Input,
  PageHeader,
  StatusBadge,
  formatDate,
  humanize,
} from '../components/ui.jsx';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Choose a password different from your current one',
    path: ['newPassword'],
  });

/** Account settings: identity, password, and integration status. */
export function SettingsPage() {
  const { user, organization, logout, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');

  const uploadConfig = useApi(() => uploadApi.config(), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  async function changePassword(values) {
    setFormError('');
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed. Use it the next time you sign in.');
      reset();
    } catch (error) {
      setFormError(error.message);
    }
  }

  async function signOutEverywhere() {
    try {
      await logout();
      toast.info('Signed out.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Your account details, security, and the integrations this deployment has configured."
      />

      <div className="grid grid-2">
        <Card>
          <CardHeader title="Account" subtitle="Contact a platform administrator to change your name or email address." />
          <div className="card-body">
            <DetailList
              items={[
                { label: 'Name', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Phone', value: user?.phone || '—' },
                { label: 'Role', value: <Badge variant={isAdmin ? 'brand' : 'neutral'}>{humanize(user?.role)}</Badge> },
                { label: 'Membership', value: humanize(user?.membershipRole) },
                { label: 'Status', value: <StatusBadge status={user?.status} /> },
                { label: 'Last sign-in', value: user?.lastLoginAt ? formatDate(user.lastLoginAt, { withTime: true }) : '—' },
                { label: 'Member since', value: user?.createdAt ? formatDate(user.createdAt) : '—' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Organization" subtitle="Update operational details from the organization page." />
          <div className="card-body">
            <DetailList
              items={[
                { label: 'Name', value: organization?.name || '—' },
                { label: 'Type', value: organization ? humanize(organization.type) : '—' },
                { label: 'Verification', value: <StatusBadge status={organization?.verificationStatus} /> },
                { label: 'City', value: organization?.city || '—' },
                { label: 'Service area', value: organization ? `${organization.serviceAreaKm ?? 0} km` : '—' },
              ]}
            />
            <p className="small mt-4">
              <a href="/organization">Open the organization profile</a>
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Change password" subtitle="You are signed in with a secure HTTP-only cookie session." />
          <form className="card-body stack" onSubmit={handleSubmit(changePassword)} noValidate>
            {formError ? (
              <Alert variant="danger" title="Password not changed">
                {formError}
              </Alert>
            ) : null}

            <Input
              label="Current password"
              type="password"
              required
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              hint="At least 8 characters"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" icon={KeyRound} loading={isSubmitting}>
              Update password
            </Button>
            <p className="tiny muted">
              Changing your password does not sign you out of this device. Use the button below to end every session.
            </p>
          </form>
        </Card>

        <div className="stack">
          <Card>
            <CardHeader title="Session" subtitle="Foodkind keeps your session in an HTTP-only cookie, never in browser storage." />
            <div className="card-body stack-sm">
              <div className="row small">
                <ShieldCheck size={16} aria-hidden="true" style={{ color: 'var(--green-dark)' }} />
                <span>Mutations require a same-origin request header, so cross-site actions are rejected.</span>
              </div>
              <Button variant="outline-danger" icon={LogOut} onClick={signOutEverywhere}>
                Sign out
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Integrations" subtitle="Optional services. The platform stays functional without them." />
            <div className="card-body stack-sm">
              {uploadConfig.loading ? (
                <p className="small muted">Checking configuration…</p>
              ) : uploadConfig.error ? (
                <p className="small muted">
                  Configuration could not be read: {uploadConfig.error.message}
                </p>
              ) : (
                <DetailList
                  items={[
                    {
                      label: 'File storage',
                      value: (
                        <Badge variant="info">
                          {humanize(uploadConfig.data?.storage?.driver || uploadConfig.data?.storageDriver || 'local')}
                        </Badge>
                      ),
                    },
                    {
                      label: 'Image analysis',
                      value: (
                        <Badge variant={uploadConfig.data?.vision?.configured ? 'success' : 'neutral'}>
                          {uploadConfig.data?.vision?.configured ? 'Configured' : 'Not configured'}
                        </Badge>
                      ),
                    },
                    {
                      label: 'Email delivery',
                      value: (
                        <Badge variant={uploadConfig.data?.email?.disabled ? 'neutral' : 'success'}>
                          {uploadConfig.data?.email?.disabled ? 'Disabled in dev' : 'Configured'}
                        </Badge>
                      ),
                    },
                  ]}
                />
              )}
              <p className="tiny muted">
                <Mail size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> In-app
                notifications always work. Email and AI-assisted listing need credentials, which are documented in the
                README.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Data and privacy" />
            <div className="card-body stack-sm small muted">
              <p className="row" style={{ alignItems: 'flex-start' }}>
                <User size={15} aria-hidden="true" style={{ marginTop: 3 }} />
                <span>
                  Your details are used to coordinate food redistribution and to keep an auditable record of every
                  handover. Verification documents are visible only to platform administrators.
                </span>
              </p>
              <p>
                Impact figures shown across the platform count only deliveries a recipient has confirmed; nothing is
                inferred into the totals.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
