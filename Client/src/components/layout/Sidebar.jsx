import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { navForRole } from '../../config/navigation';

export default function Sidebar({ collapsed, mobileOpen, onNavigate }) {
  const { role } = useAuth();
  const { leaves, registrations, pendingApprovals } = useData();
  const sections = navForRole(role);

  const counts = {
    registrations: registrations.filter((request) => request.status === 'Pending').length,
    pendingLeaves:
      role === 'hr'
        ? leaves.filter((leave) => leave.status === 'Pending').length
        : pendingApprovals.length,
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`.trim()}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        <NavLink to="/dashboard" className="sidebar__logo" aria-label="StaffSync dashboard" onClick={onNavigate}>
          <Logo showWordmark={!collapsed} />
        </NavLink>
        <button
          type="button"
          className="sidebar__close"
          onClick={onNavigate}
          aria-label="Close navigation"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="sidebar__workspace">
        <span className="sidebar__workspace-mark">NL</span>
        {!collapsed ? (
          <div className="sidebar__workspace-text">
            <span className="sidebar__workspace-name">Nimbus Labs</span>
            <span className="sidebar__workspace-plan">Scale workspace</span>
          </div>
        ) : null}
      </div>

      <nav className="sidebar__nav">
        {sections.map((section) => (
          <div className="sidebar__section" key={section.label}>
            {!collapsed ? <p className="sidebar__section-label">{section.label}</p> : null}
            {section.items.map((item) => {
              const badge = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`.trim()}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {!collapsed ? <span className="sidebar__label">{item.label}</span> : null}
                  {badge > 0 ? (
                    <span className={`sidebar__badge ${collapsed ? 'sidebar__badge--dot' : ''}`.trim()}>
                      {collapsed ? '' : badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__bottom">
        {!collapsed ? (
          <div className="sidebar-help">
            <span className="sidebar-help__icon">
              <Icon name="sparkles" size={15} />
            </span>
            <p className="sidebar-help__title">Need a hand?</p>
            <p className="sidebar-help__text">The People team is one message away.</p>
            <a className="sidebar-help__link" href="mailto:people@nimbuslabs.com">
              people@nimbuslabs.com
              <Icon name="arrowUpRight" size={13} />
            </a>
          </div>
        ) : null}
        <div className="sidebar__meta">
          <span>StaffSync v1.0</span>
          {!collapsed ? <span className="sidebar__meta-dot">·</span> : null}
          {!collapsed ? <span>Demo workspace</span> : null}
        </div>
      </div>
    </aside>
  );
}
