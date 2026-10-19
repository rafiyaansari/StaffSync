import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import useClickOutside from '../../hooks/useClickOutside';
import { useData } from '../../context/DataContext';
import { relativeTime } from '../../utils/date';

const TYPE_META = {
  leave: { icon: 'calendar', tone: 'violet' },
  announcement: { icon: 'megaphone', tone: 'blue' },
  training: { icon: 'graduation', tone: 'teal' },
  system: { icon: 'settings', tone: 'amber' },
};

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllNotificationsRead, markNotificationRead } = useData();
  useClickOutside(ref, () => setOpen(false));

  const latest = notifications.slice(0, 6);

  const openNotification = (notification) => {
    if (!notification.read) markNotificationRead(notification.id);
    setOpen(false);
    navigate(notification.href || '/notifications');
  };

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className={`icon-button ${open ? 'is-active' : ''}`.trim()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 ? <span className="icon-button__badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notif-panel">
          <div className="notif-panel__header">
            <div>
              <h3 className="notif-panel__title">Notifications</h3>
              <p className="notif-panel__subtitle">
                {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
              </p>
            </div>
            {unreadCount ? (
              <button type="button" className="link-button" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="notif-panel__list">
            {latest.length ? (
              latest.map((notification) => {
                const meta = TYPE_META[notification.type] || TYPE_META.system;
                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notif-item ${notification.read ? '' : 'is-unread'}`.trim()}
                    onClick={() => openNotification(notification)}
                  >
                    <span className={`notif-item__icon tone-${meta.tone}`}>
                      <Icon name={meta.icon} size={16} />
                    </span>
                    <span className="notif-item__body">
                      <span className="notif-item__title">{notification.title}</span>
                      <span className="notif-item__text">{notification.body}</span>
                      <span className="notif-item__time">{relativeTime(notification.createdAt)}</span>
                    </span>
                    {!notification.read ? <span className="notif-item__dot" aria-label="Unread" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="notif-panel__empty">
                <Icon name="bell" size={22} />
                <p>No notifications yet</p>
                <span>Updates about leaves, announcements and training will land here.</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="notif-panel__footer"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View all notifications
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
