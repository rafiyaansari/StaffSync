import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageSkeleton from './PageSkeleton';
import Icon from '../ui/Icon';
import { useData } from '../../context/DataContext';

const SIDEBAR_KEY = 'staffsync.sidebar.collapsed';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, loadError, refresh } = useData();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`.trim()}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <div className="app-main">
        <Topbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="page" id="main-content">
          {loadError ? (
            <div className="inline-alert inline-alert--danger" role="alert" style={{ marginBottom: 18 }}>
              <Icon name="alertCircle" size={16} />
              <span>{loadError} Check that the API is running, then retry.</span>
              <button type="button" className="link-button" onClick={() => refresh()} style={{ marginLeft: 'auto' }}>
                Try again
              </button>
            </div>
          ) : null}
          {loading ? <PageSkeleton /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
