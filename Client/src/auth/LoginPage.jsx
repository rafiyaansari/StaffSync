import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import Avatar from '../components/ui/Avatar';
import { TextField, PasswordField, Checkbox } from '../components/ui/FormFields';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEMO_ACCOUNTS } from '../data/seed';
import { firstName } from '../utils/format';
import { homeForRole, ROLE_LABELS } from '../config/navigation';
import { DEMO_LOGINS_ENABLED } from '../config/demo';
import { USING_MOCK_API } from '../services/api';

const ROLE_ICONS = { hr: 'shield', manager: 'users', employee: 'user' };
const REMEMBER_KEY = 'staffsync.remember';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [error, setError] = useState(() => {
    // Show a one-time notice when the API rejected an expired session.
    // (Read only — React may call this initializer twice in development.)
    try {
      if (sessionStorage.getItem('staffsync.sessionExpired')) {
        return 'Your session expired. Please sign in again.';
      }
    } catch {
      /* storage unavailable */
    }
    return '';
  });

  useEffect(() => {
    try {
      sessionStorage.removeItem('staffsync.sessionExpired');
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('staffsync.apiOffline')) {
        sessionStorage.removeItem('staffsync.apiOffline');
        setError('We couldn’t reach the StaffSync API. Check that the server is running, then reload.');
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Clear validation errors only when the user actually edits a field, so the
  // one-time expiry notice survives the first render (and StrictMode re-runs).
  const lastFields = useRef({ email, password });
  useEffect(() => {
    if (lastFields.current.email === email && lastFields.current.password === password) return;
    lastFields.current = { email, password };
    setError('');
  }, [email, password]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const completeLogin = (user) => {
    // Never dereference `user` blindly: if a backend ever answers 200 without a
    // profile we show a readable message instead of a TypeError.
    if (!user || typeof user !== 'object') {
      setError('We signed you in but could not load your profile. Please try again.');
      return;
    }
    const role = user.systemRole || user.role;
    const redirectTo = location.state?.from || homeForRole(role);
    toast.success(`Signed in as ${ROLE_LABELS[role] || 'Employee'}.`, {
      title: `Welcome back, ${firstName(user.name || user.email)}`,
    });
    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your work email and password to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(email.trim(), password);
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      completeLogin(user);
    } catch (loginError) {
      setError(loginError.message || 'We couldn’t sign you in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (account) => {
    setDemoLoading(account.role);
    setError('');
    try {
      const user = await login(account.email, account.password);
      completeLogin(user);
    } catch (demoError) {
      setError(demoError.message || 'Demo sign-in failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  const submitForgot = (event) => {
    event.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    if (USING_MOCK_API) {
      toast.info('In mock mode, use one of the demo accounts or your registered password.', {
        title: 'Reset link sent (demo)',
      });
    } else {
      toast.info('Password reset email isn’t configured in this build. Ask HR to reset it from the employee directory.', {
        title: 'Reset not available',
      });
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <p className="auth-eyebrow">
          <span className="auth-eyebrow__dot" /> Welcome back
        </p>
        <h1 className="auth-title">Sign in to StaffSync</h1>
        <p className="auth-sub">
          Your team, your time off, your growth — in one calm workspace.
        </p>

        {DEMO_LOGINS_ENABLED ? (
          <>
          <div className="demo-logins">
            <div className="demo-logins__head">
              <span>Explore a demo role</span>
              <span className="demo-logins__hint">one click, no password</span>
            </div>
            <div className="demo-logins__grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  className="demo-card"
                  onClick={() => handleDemo(account)}
                  disabled={Boolean(demoLoading) || loading}
                >
                  <span className="demo-card__avatar">
                    {demoLoading === account.role ? (
                      <span className="btn__spinner demo-card__spinner" />
                    ) : (
                      <Avatar name={account.name} size="md" />
                    )}
                  </span>
                  <span className="demo-card__text">
                    <span className="demo-card__role">
                      <Icon name={ROLE_ICONS[account.role]} size={12} />
                      {account.label}
                    </span>
                    <span className="demo-card__name">{account.name.split(' ')[0]}</span>
                    <span className="demo-card__title">{account.title}</span>
                  </span>
                  <Icon name="arrowRight" size={14} className="demo-card__arrow" />
                </button>
              ))}
            </div>
          </div>

          </>
        ) : null}

        <div className="auth-divider">
          <span>or sign in manually</span>
        </div>

        {error ? (
          <div className="auth-error" role="alert">
            <Icon name="alertCircle" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Work email"
            type="email"
            name="email"
            icon="mail"
            placeholder="you@nimbuslabs.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <div className="auth-form__row">
            <Checkbox
              label="Remember me"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setForgotOpen(true);
                setForgotSent(false);
                setForgotEmail(email);
              }}
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" variant="primary" size="lg" className="btn--block" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="auth-switch">
          New to StaffSync? <Link to="/register">Create your account</Link>
        </p>

        {DEMO_LOGINS_ENABLED ? (
          <div className="auth-demo-note">
            <Icon name="info" size={14} />
            <span>
              Demo workspace: every seeded account uses <strong>StaffSync@123</strong>. Use a role
              button above, or sign in manually with <code>priya.sharma@nimbuslabs.com</code>.
            </span>
          </div>
        ) : null}
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={forgotSent ? 'Check your inbox' : 'Reset your password'}
        subtitle={
          forgotSent
            ? 'If an account exists for that address, a reset link is on its way.'
            : 'We’ll email you a secure link to choose a new password.'
        }
        size="sm"
      >
        {forgotSent ? (
          <div className="auth-success-inline">
            <span className="auth-success-inline__icon">
              <Icon name="checkCircle" size={22} />
            </span>
            <p>
              Reset instructions were sent to <strong>{forgotEmail}</strong>. The link expires in 30
              minutes.
            </p>
            <Button variant="secondary" onClick={() => setForgotOpen(false)}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form
            onSubmit={submitForgot}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <TextField
              label="Work email"
              type="email"
              icon="mail"
              placeholder="you@nimbuslabs.com"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              required
            />
            <Button type="submit" variant="primary" icon="send">
              Send reset link
            </Button>
          </form>
        )}
      </Modal>
    </AuthShell>
  );
}
