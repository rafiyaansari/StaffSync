import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import { Card, CardHeader } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import { Toggle, PasswordField } from '../components/ui/FormFields';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { api, USING_MOCK_API } from '../services/api';
import { DEMO_ACCOUNTS, COMPANY } from '../data/seed';
import { DEMO_LOGINS_ENABLED } from '../config/demo';
import { ROLE_LABELS } from '../config/navigation';
import { firstName } from '../utils/format';

const TABS = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'workspace', label: 'Workspace' },
];

export default function SettingsPage() {
  const { role, changePassword, logout } = useAuth();
  const { preferences, savePreferences, currentEmployee, employees, resetDemoData } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('notifications');
  const [prefs, setPrefs] = useState(preferences);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setPrefs(preferences);
  }, [preferences]);

  const togglePref = (key) => (event) => {
    setPrefs((current) => ({ ...current, [key]: event.target.checked }));
  };

  const saveNotifications = async () => {
    setSavingPrefs(true);
    try {
      await savePreferences(prefs);
    } finally {
      setSavingPrefs(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!passwords.current) errors.current = 'Enter your current password.';
    if (!passwords.next) errors.next = 'Choose a new password.';
    else if (passwords.next.length < 8) errors.next = 'Use at least 8 characters.';
    else if (passwords.next === passwords.current) errors.next = 'Choose something different from your current password.';
    if (passwords.confirm !== passwords.next) errors.confirm = 'Passwords don’t match.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Use your new password the next time you sign in.', {
        title: 'Password updated',
      });
    } catch (error) {
      setPasswordErrors({ current: error.message || 'Could not update your password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await resetDemoData();
      logout();
      toast.info('Demo data has been restored. Sign in again to explore.', {
        title: 'Workspace reset',
      });
      navigate('/login', { replace: true });
    } finally {
      setResetting(false);
      setResetOpen(false);
    }
  };

  const sessionInfo = api.auth.currentSession?.();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage notifications, security and this demo workspace."
        actions={
          <Badge tone="outline">
            <Icon name="shield" size={12} /> {ROLE_LABELS[role]} access
          </Badge>
        }
      />

      <div className="settings-layout">
        <aside className="settings-nav">
          <Tabs
            tabs={TABS}
            active={tab}
            onChange={setTab}
            className="settings-nav__tabs"
            ariaLabel="Settings sections"
          />
          <Card className="settings-help">
            <CardHeader title="Need a hand?" subtitle="The People team can help." icon={<Icon name="helpCircle" size={16} />} />
            <a href="mailto:people@nimbuslabs.com" className="settings-help__link">
              people@nimbuslabs.com
              <Icon name="arrowUpRight" size={13} />
            </a>
            <p className="settings-help__note">
              Typical response time: under one working day.
            </p>
          </Card>
        </aside>

        <div className="settings-main">
          {tab === 'notifications' ? (
            <Card>
              <CardHeader
                title="Notifications"
                subtitle="Choose what lands in your inbox and what stays in-app."
              />
              <div className="settings-toggles">
                <Toggle
                  label="Leave updates by email"
                  description="Approvals, declines and requests that need your review."
                  checked={Boolean(prefs.emailOnLeave)}
                  onChange={togglePref('emailOnLeave')}
                />
                <Toggle
                  label="Announcements by email"
                  description="Company news and policy updates from the People team."
                  checked={Boolean(prefs.emailOnAnnouncement)}
                  onChange={togglePref('emailOnAnnouncement')}
                />
                <Toggle
                  label="Weekly digest"
                  description="A Monday summary of attendance, approvals and birthdays."
                  checked={Boolean(prefs.weeklyDigest)}
                  onChange={togglePref('weeklyDigest')}
                />
                <Toggle
                  label="Push notifications"
                  description="Browser alerts for time-sensitive updates."
                  checked={Boolean(prefs.pushNotifications)}
                  onChange={togglePref('pushNotifications')}
                />
              </div>
              <div className="settings-actions">
                <p className="settings-actions__hint">
                  <Icon name="info" size={13} />
                  In this prototype, preferences are saved to your local workspace.
                </p>
                <Button variant="primary" icon="check" onClick={saveNotifications} loading={savingPrefs}>
                  Save preferences
                </Button>
              </div>
            </Card>
          ) : null}

          {tab === 'security' ? (
            <div className="settings-stack">
              <Card>
                <CardHeader
                  title="Change password"
                  subtitle={USING_MOCK_API ? "Use at least 8 characters. Demo accounts start with StaffSync@123." : "Use at least 8 characters. This updates your own sign-in password."}
                />
                <form className="settings-form" onSubmit={submitPassword} noValidate>
                  <PasswordField
                    label="Current password"
                    value={passwords.current}
                    onChange={(event) => {
                      setPasswords((p) => ({ ...p, current: event.target.value }));
                      setPasswordErrors((e) => ({ ...e, current: undefined }));
                    }}
                    error={passwordErrors.current}
                    autoComplete="current-password"
                    required
                  />
                  <div className="form-grid form-grid--2">
                    <PasswordField
                      label="New password"
                      value={passwords.next}
                      onChange={(event) => {
                        setPasswords((p) => ({ ...p, next: event.target.value }));
                        setPasswordErrors((e) => ({ ...e, next: undefined }));
                      }}
                      error={passwordErrors.next}
                      autoComplete="new-password"
                      required
                    />
                    <PasswordField
                      label="Confirm new password"
                      value={passwords.confirm}
                      onChange={(event) => {
                        setPasswords((p) => ({ ...p, confirm: event.target.value }));
                        setPasswordErrors((e) => ({ ...e, confirm: undefined }));
                      }}
                      error={passwordErrors.confirm}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="settings-actions">
                    <p className="settings-actions__hint">
                      <Icon name="lock" size={13} />
                      You’ll stay signed in on this device after updating.
                    </p>
                    <Button type="submit" variant="primary" icon="lock" loading={changingPassword}>
                      Update password
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <CardHeader
                  title="Active session"
                  subtitle="Where you’re currently signed in."
                  action={<Badge tone="green" dot>This device</Badge>}
                />
                <div className="device-row">
                  <span className="icon-tile tone-navy">
                    <Icon name="globe" size={18} />
                  </span>
                  <div className="device-row__text">
                    <p>Chrome · {navigator.platform || 'Desktop'}</p>
                    <span>
                      Bengaluru, IN · signed in {firstName(currentEmployee?.name)}’s workspace
                      {sessionInfo?.issuedAt ? ' · session active' : ''}
                    </span>
                  </div>
                  {USING_MOCK_API ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        toast.info('Mock mode keeps a single browser session.', {
                          title: 'Sessions',
                        })
                      }
                    >
                      Sign out other devices
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled title="Signing out other devices isn’t enabled in this build">
                      Sign out other devices
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'workspace' ? (
            <div className="settings-stack">
              <Card>
                <CardHeader title="Workspace" subtitle="Company profile and plan" />
                <div className="workspace-card">
                  <span className="workspace-card__mark">NL</span>
                  <div className="workspace-card__identity">
                    <h3>{COMPANY.name}</h3>
                    <p>{COMPANY.tagline} · {COMPANY.hq}</p>
                  </div>
                  <Badge tone="navy">{COMPANY.plan} plan</Badge>
                </div>
                <dl className="detail-grid detail-grid--3 workspace-facts">
                  <div><dt>Domain</dt><dd>{COMPANY.domain}</dd></div>
                  <div><dt>Founded</dt><dd>{COMPANY.founded}</dd></div>
                  <div><dt>People</dt><dd>{employees.length} employees</dd></div>
                  <div><dt>Your role</dt><dd>{ROLE_LABELS[role]}</dd></div>
                  <div><dt>Payroll cycle</dt><dd>Monthly · 28th</dd></div>
                  <div><dt>Time zone</dt><dd>IST (UTC +5:30)</dd></div>
                </dl>
              </Card>

              {DEMO_LOGINS_ENABLED ? (
              <Card>
                <CardHeader
                  title="Demo accounts"
                  subtitle="Switch roles to explore every dashboard."
                  action={<Badge tone="outline">{USING_MOCK_API ? 'Mock data' : 'Live API'}</Badge>}
                />
                <div className="demo-table">
                  {DEMO_ACCOUNTS.map((account) => (
                    <div className="demo-table__row" key={account.role}>
                      <Badge tone={account.role === 'hr' ? 'violet' : account.role === 'manager' ? 'blue' : 'green'}>
                        {account.label}
                      </Badge>
                      <span className="demo-table__name">{account.name}</span>
                      <code className="demo-table__email">{account.email}</code>
                      <code className="demo-table__password">{account.password}</code>
                    </div>
                  ))}
                </div>
                <p className="settings-actions__hint" style={{ marginTop: 12 }}>
                  <Icon name="info" size={13} />
                  {USING_MOCK_API
                    ? 'Mock mode: all actions are stored in your browser.'
                    : 'Live mode: requests go to your Express API.'}
                </p>
              </Card>
              ) : null}

              {USING_MOCK_API ? (
                <Card className="danger-zone">
                  <CardHeader
                    title="Demo data"
                    subtitle="Reset employees, leaves and announcements to their original state."
                  />
                  <div className="danger-zone__row">
                    <div>
                      <p className="danger-zone__title">Reset workspace</p>
                      <span>This clears all changes made in this browser and restores the seed data. You’ll be signed out.</span>
                    </div>
                    <Button variant="danger" icon="refresh" onClick={() => setResetOpen(true)}>
                      Reset demo data
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title="Database"
                    subtitle="Data lives in MongoDB and is shared by every signed-in user."
                  />
                  <div className="danger-zone__row">
                    <div>
                      <p className="danger-zone__title">Reset the workspace</p>
                      <span>
                        Browser resets aren’t available in live mode. To rebuild the demo workspace, run
                        <code className="demo-table__password"> npm run seed -- --reset </code>
                        inside the Server folder.
                      </span>
                    </div>
                    <Badge tone="green">MongoDB connected</Badge>
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
        loading={resetting}
        title="Reset the demo workspace?"
        description="All employees, leave decisions, announcements and registrations you’ve created will be cleared. This can’t be undone."
        confirmLabel="Reset everything"
        icon="refresh"
      />
    </>
  );
}
