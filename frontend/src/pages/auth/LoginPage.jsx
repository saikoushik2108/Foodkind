import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, Button, Input } from '../../components/ui.jsx';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** Sign-in page. */
export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const redirectTo = location.state?.from || '/dashboard';

  async function onSubmit(values) {
    setFormError('');
    try {
      const data = await login(values);
      toast.success(`Welcome back, ${data.user?.name?.split(' ')[0] || 'there'}.`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Foodkind</span>
            <span className="brand-tagline">Rescue · Nourish</span>
          </span>
        </Link>
        <h2>Turn today&apos;s surplus into tonight&apos;s meals.</h2>
        <p>
          Sign in to publish surplus food, claim what your kitchen can use, coordinate collections, and see
          the impact you have actually delivered.
        </p>
        <ul className="auth-aside-list" style={{ listStyle: 'none', padding: 0 }}>
          <li>Verified partners only — every organization is reviewed before it can trade food.</li>
          <li>Atomic allocation, so a portion is never promised twice.</li>
          <li>Code-verified handovers and an auditable trail of every delivery.</li>
        </ul>
      </aside>

      <div className="auth-form-side">
        <div className="auth-card">
          <span className="eyebrow">Welcome back</span>
          <h1 className="mt-2" style={{ fontSize: 'var(--text-2xl)' }}>
            Sign in to Foodkind
          </h1>
          <p className="muted mt-2 small">
            New here? <Link to="/register">Register your organization</Link>.
          </p>

          {formError ? (
            <div className="mt-4">
              <Alert variant="danger" title="Could not sign you in">
                {formError}
              </Alert>
            </div>
          ) : null}

          <form className="stack mt-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@organization.org"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="spread">
              <Link to="/forgot-password" className="small">
                Forgot your password?
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} icon={LogIn} className="btn-block">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
