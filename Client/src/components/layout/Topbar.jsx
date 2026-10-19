import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../ui/Icon';
import NotificationsMenu from './NotificationsMenu';
import ProfileMenu from './ProfileMenu';
import CommandPalette from './CommandPalette';
import useHotkeys from '../../hooks/useHotkeys';
import { useToast } from '../../context/ToastContext';
import { ROUTE_META } from '../../config/navigation';

export default function Topbar({ collapsed, onToggleSidebar, onOpenMobile }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const title = ROUTE_META[location.pathname]?.title || 'StaffSync';

  useHotkeys('mod+k', (event) => {
    event.preventDefault();
    setSearchOpen(true);
  });

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="icon-button topbar__menu"
          onClick={onOpenMobile}
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>
        <button
          type="button"
          className="icon-button topbar__collapse"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="panelLeft" size={18} />
        </button>
        <nav className="topbar__crumb" aria-label="Breadcrumb">
          <span className="topbar__crumb-root">
            <Icon name="building" size={13} />
            Nimbus Labs
          </span>
          <span className="topbar__crumb-sep">/</span>
          <span className="topbar__crumb-current">{title}</span>
        </nav>
      </div>

      <div className="topbar__right">
        <button
          type="button"
          className="topbar-search"
          onClick={() => setSearchOpen(true)}
          aria-label="Search people and pages"
        >
          <Icon name="search" size={16} />
          <span className="topbar-search__text">Search people, pages…</span>
          <span className="topbar-search__kbd">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </span>
        </button>
        <button
          type="button"
          className="icon-button topbar-search__mobile"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          <Icon name="search" size={19} />
        </button>
        <button
          type="button"
          className="icon-button topbar__help"
          aria-label="Help and support"
          onClick={() =>
            toast.info('Questions? Write to people@nimbuslabs.com — we reply within a day.', {
              title: 'Help & support',
            })
          }
        >
          <Icon name="helpCircle" size={19} />
        </button>
        <NotificationsMenu />
        <span className="topbar__divider" aria-hidden="true" />
        <ProfileMenu />
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
