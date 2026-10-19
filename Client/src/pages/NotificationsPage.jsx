import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import { useData } from '../context/DataContext';
import { formatDate, relativeTime } from '../utils/date';

const TYPE_META = {
  leave: { icon: 'calendar', tone: 'violet', label: 'Leave' },
  announcement: { icon: 'megaphone', tone: 'blue', label: 'Announcement' },
  training: { icon: 'graduation', tone: 'teal', label: 'Training' },
  system: { icon: 'settings', tone: 'amber', label: 'System' },
};

function dayBucket(iso) {
  const date = new Date(iso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((startToday - startDate) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useData();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All');

  const filtered = useMemo(
    () => notifications.filter((item) => (tab === 'Unread' ? !item.read : true)),
    [notifications, tab],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const bucket = dayBucket(item.createdAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket).push(item);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const openNotification = (notification) => {
    if (!notification.read) markNotificationRead(notification.id);
    if (notification.href) navigate(notification.href);
  };

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Approvals, announcements and training updates in one stream."
        actions={
          unreadCount ? (
            <Button variant="secondary" icon="checkCircle" onClick={markAllNotificationsRead}>
              Mark all as read
            </Button>
          ) : (
            <span className="notification-caughtup">
              <Icon name="checkCircle" size={16} /> You’re all caught up
            </span>
          )
        }
      />

      <div className="notification-panel">
        <div className="notification-panel__head">
          <Tabs
            tabs={[
              { id: 'All', label: 'All', count: notifications.length },
              { id: 'Unread', label: 'Unread', count: unreadCount },
            ]}
            active={tab}
            onChange={setTab}
            ariaLabel="Filter notifications"
          />
          <span className="notification-panel__hint">
            <Icon name="info" size={13} />
            Clicking a notification takes you to the related page.
          </span>
        </div>

        {groups.length ? (
          <div className="notification-groups">
            {groups.map(([bucket, items]) => (
              <section className="notification-group" key={bucket}>
                <div className="notification-group__label">
                  <span>{bucket}</span>
                  <span className="notification-group__line" />
                </div>
                {items.map((notification) => {
                  const meta = TYPE_META[notification.type] || TYPE_META.system;
                  return (
                    <button
                      type="button"
                      className={`notification-row ${notification.read ? '' : 'is-unread'}`.trim()}
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`notification-row__icon tone-${meta.tone}`}>
                        <Icon name={meta.icon} size={17} />
                      </span>
                      <span className="notification-row__body">
                        <span className="notification-row__top">
                          <span className="notification-row__title">{notification.title}</span>
                          {!notification.read ? <span className="notification-row__badge">New</span> : null}
                        </span>
                        <span className="notification-row__text">{notification.body}</span>
                        <span className="notification-row__meta">
                          {meta.label} · {relativeTime(notification.createdAt)} ·{' '}
                          {formatDate(notification.createdAt)}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={16} className="notification-row__chevron" />
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="bell"
            title={tab === 'Unread' ? 'Nothing unread' : 'No notifications yet'}
            description={
              tab === 'Unread'
                ? 'You’ve read everything. New updates will appear here.'
                : 'Leave decisions, announcements and training assignments will show up in this stream.'
            }
          />
        )}
      </div>
    </>
  );
}
