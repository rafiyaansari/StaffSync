import Logo from '../ui/Logo';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import { ProgressRing } from '../ui/Progress';

const FEATURES = [
  'One home for leave, attendance and growth',
  'Role-aware dashboards for HR, managers and teams',
  'Approvals that take seconds, not days',
];

export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__pattern" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="authGlow" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#2f6fed" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2f6fed" stopOpacity="0" />
              </radialGradient>
              <pattern id="authGrid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M44 0H0v44" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="700" height="900" fill="url(#authGrid)" />
            <circle cx="560" cy="160" r="300" fill="url(#authGlow)" />
            <circle cx="600" cy="120" r="190" fill="none" stroke="#ffffff" strokeOpacity="0.07" />
            <circle cx="600" cy="120" r="250" fill="none" stroke="#ffffff" strokeOpacity="0.05" />
            <circle cx="100" cy="760" r="220" fill="none" stroke="#ffffff" strokeOpacity="0.05" />
          </svg>
        </div>

        <div className="auth__aside-inner">
          <div className="auth__aside-top">
            <Logo theme="dark" size="md" />
            <span className="auth__pill">People ops, simplified</span>
          </div>

          <div className="auth__aside-content">
            <h2 className="auth__headline">
              People operations,
              <br />
              <span className="auth__headline-accent">in sync.</span>
            </h2>
            <p className="auth__lede">
              StaffSync gives your team one calm place for people, time off and growth — with the
              clarity to make every people decision a good one.
            </p>

            <ul className="auth__features">
              {FEATURES.map((feature) => (
                <li key={feature}>
                  <span className="auth__feature-check">
                    <Icon name="check" size={12} strokeWidth={2.6} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="auth__preview">
              <div className="auth__preview-head">
                <div>
                  <p className="auth__preview-eyebrow">Today at Nimbus Labs</p>
                  <p className="auth__preview-title">21 of 24 checked in</p>
                </div>
                <ProgressRing value={88} size={54} stroke={6} tone="teal">
                  <span className="auth__preview-ring">88%</span>
                </ProgressRing>
              </div>
              <div className="auth__preview-bars" aria-hidden="true">
                {[86, 92, 78, 96, 88, 90, 94].map((value, index) => (
                  <span key={index} style={{ height: `${value}%` }} />
                ))}
              </div>
              <div className="auth__preview-foot">
                <div className="auth__preview-avatars">
                  <Avatar name="Aarav Mehta" size="xs" />
                  <Avatar name="Neha Verma" size="xs" />
                  <Avatar name="Kabir Shah" size="xs" />
                  <span className="auth__preview-more">+18</span>
                </div>
                <span className="auth__preview-status">
                  <span className="auth__preview-dot" /> Live attendance
                </span>
              </div>
            </div>
          </div>

          <div className="auth__aside-bottom">
            <blockquote className="auth__quote">
              “We replaced four spreadsheets and a group chat with StaffSync. Our Mondays finally
              feel calm.”
            </blockquote>
            <div className="auth__quote-person">
              <Avatar name="Priya Sharma" size="sm" />
              <div>
                <p className="auth__quote-name">Priya Sharma</p>
                <p className="auth__quote-role">HR Manager, Nimbus Labs</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__main-top">
          <Logo />
          <a className="auth__main-help" href="mailto:people@nimbuslabs.com">
            <Icon name="helpCircle" size={16} />
            Need help?
          </a>
        </div>
        <div className="auth__content">{children}</div>
        <p className="auth__footnote">
          <Icon name="shield" size={13} />
          Protected with enterprise-grade security · SOC 2 Type II
        </p>
      </main>
    </div>
  );
}
