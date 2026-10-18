import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Leaf, MailCheck } from 'lucide-react';
import { authApi } from '../../api/resources.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, Button, Input } from '../../components/ui.jsx';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const resetSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function AuthFrame({ children, title, subtitle }) {
  return (
    <div className="auth-shell" style={{ gridTemplateColumns: '1fr' }}>
      <div className="auth-form-side">
        <div className="auth-card">
          <Link to="/" className="brand" style={{ color: 'var(--forest)', marginBottom: 'var(--space-5)' }}>
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
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{title}</h1>
          {subtitle ? <p className="muted small mt-2">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Request a password reset link. */
export function ForgotPasswordPage() {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  async function onSubmit({ email }) {
    setFormError('');
    try {
      const data = await authApi.forgotPassword(email);
      setSent(true);
      // Outside production the API returns the token so the flow is testable
      // without SMTP credentials configured.
      if (data?.devResetToken) setDevToken(data.devResetToken);
      toast.info(data?.message || 'If an account exists for that email, a reset link has been sent.');
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthFrame
      title="Reset your password"
      subtitle="Enter the email address on your account and we will send instructions to set a new password."
    >
      {formError ? <Alert variant="danger" title="Request failed">{formError}</Alert> : null}

      {sent ? (
        <div className="stack">
          <Alert variant="success" title="Check your inbox">
            If an account exists for that address, a reset link is on its way. The link expires shortly, so
            use it soon.
          </Alert>

          {devToken ? (
            <Alert variant="warning" title="Development token (no email configured)">
              <p className="small">
                This environment has no SMTP configured, so the API returned the token directly. It is shown
                only outside production.
              </p>
              <p className="mono mt-2" style={{ wordBreak: 'break-all' }}>
                {devToken}
              </p>
              <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`}>Continue to set a new password</Link>
            </Alert>
          ) : null}

          <Link to="/login" className="small">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" variant="primary" loading={isSubmitting} icon={MailCheck}>
            Send reset instructions
          </Button>
          <Link to="/login" className="small">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthFrame>
  );
}

/** Complete a password reset with a token. */
export function ResetPasswordPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState(params.get('token') || '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setToken(params.get('token') || '');
  }, [params]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  async function onSubmit({ password }) {
    setFormError('');
    if (!token.trim()) {
      setFormError('A reset token is required. Open the link from your email, or paste the token below.');
      return;
    }
    try {
      await authApi.resetPassword({ token: token.trim(), password });
      toast.success('Password updated. You can sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthFrame title="Set a new password" subtitle="Choose a password you have not used before on this platform.">
      {formError ? <Alert variant="danger" title="Could not reset the password">{formError}</Alert> : null}

      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Reset token"
          required
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            if (params.get('token')) setParams({}, { replace: true });
          }}
          hint="Filled automatically when you open the link from your email."
        />
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" variant="primary" loading={isSubmitting} icon={KeyRound}>
          Update password
        </Button>
        <Link to="/login" className="small">
          Back to sign in
        </Link>
      </form>
    </AuthFrame>
  );
}

export default ForgotPasswordPage;
