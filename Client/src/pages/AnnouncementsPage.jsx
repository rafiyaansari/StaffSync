import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { SearchField, SelectField } from '../components/ui/FormFields';
import AnnouncementComposer from '../components/announcements/AnnouncementComposer';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateLong, relativeTime } from '../utils/date';
import { announcementTone, ANNOUNCEMENT_CATEGORIES } from '../utils/ui';

function excerpt(text, length = 170) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

export default function AnnouncementsPage() {
  const { announcements, currentEmployee, markAnnouncementRead, deleteAnnouncement, updateAnnouncement } = useData();
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const employeeId = currentEmployee?.id;
  const isHR = role === 'hr';

  useEffect(() => {
    if (location.state?.compose && isHR) {
      setEditing(null);
      setComposerOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, isHR, navigate]);

  const unread = announcements.filter((item) => !item.readBy.includes(employeeId));

  const filtered = useMemo(
    () =>
      announcements.filter((item) => {
        const isUnread = !item.readBy.includes(employeeId);
        const matchesTab = tab === 'All' || isUnread;
        const term = query.trim().toLowerCase();
        const matchesSearch =
          !term ||
          item.title.toLowerCase().includes(term) ||
          item.body.toLowerCase().includes(term) ||
          item.authorName.toLowerCase().includes(term);
        const matchesCategory = !category || item.category === category;
        return matchesTab && matchesSearch && matchesCategory;
      }),
    [announcements, employeeId, tab, query, category],
  );

  const openDetail = (announcement) => {
    setDetail(announcement);
    if (!announcement.readBy.includes(employeeId)) markAnnouncementRead(announcement.id);
  };

  const markAllRead = () => {
    unread.forEach((announcement) => markAnnouncementRead(announcement.id));
  };

  const togglePin = (announcement) => {
    updateAnnouncement(announcement.id, { pinned: !announcement.pinned });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      setDetail(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Stay in the loop"
        title="Announcements"
        subtitle="News, policies and moments from across Nimbus Labs."
        actions={
          <>
            {unread.length ? (
              <Button variant="secondary" icon="checkCircle" onClick={markAllRead}>
                Mark all read
              </Button>
            ) : null}
            {isHR ? (
              <Button
                variant="primary"
                icon="plus"
                onClick={() => {
                  setEditing(null);
                  setComposerOpen(true);
                }}
              >
                New announcement
              </Button>
            ) : null}
          </>
        }
      />

      <div className="filter-bar">
        <Tabs
          tabs={[
            { id: 'All', label: 'All announcements', count: announcements.length },
            { id: 'Unread', label: 'Unread', count: unread.length },
          ]}
          active={tab}
          onChange={setTab}
          className="filter-bar__tabs"
          ariaLabel="Filter announcements"
        />
        <div className="filter-bar__spacer" />
        <SelectField
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={ANNOUNCEMENT_CATEGORIES}
          placeholder="All categories"
          wrapClassName="filter-control"
        />
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search announcements…"
          className="filter-bar__search"
        />
      </div>

      {filtered.length ? (
        <div className="announcement-grid">
          {filtered.map((announcement) => {
            const isUnread = !announcement.readBy.includes(employeeId);
            return (
              <article
                className={`announcement-card ${announcement.pinned ? 'is-pinned' : ''}`.trim()}
                key={announcement.id}
                onClick={() => openDetail(announcement)}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetail(announcement);
                  }
                }}
              >
                <div className="announcement-card__top">
                  <div className="announcement-card__badges">
                    <Badge tone={announcementTone(announcement.category)}>
                      {announcement.category}
                    </Badge>
                    {announcement.pinned ? (
                      <span className="announcement-card__pin">
                        <Icon name="bookmark" size={12} /> Pinned
                      </span>
                    ) : null}
                    {isUnread ? <span className="announcement-card__unread">New</span> : null}
                  </div>
                  {isHR ? (
                    <div className="announcement-card__admin" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="row-action"
                        aria-label={announcement.pinned ? 'Unpin announcement' : 'Pin announcement'}
                        title={announcement.pinned ? 'Unpin' : 'Pin'}
                        onClick={() => togglePin(announcement)}
                      >
                        <Icon name="bookmark" size={15} />
                      </button>
                      <button
                        type="button"
                        className="row-action"
                        aria-label="Edit announcement"
                        title="Edit"
                        onClick={() => {
                          setEditing(announcement);
                          setComposerOpen(true);
                        }}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        className="row-action row-action--danger"
                        aria-label="Delete announcement"
                        title="Delete"
                        onClick={() => setDeleteTarget(announcement)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>

                <h2 className="announcement-card__title">{announcement.title}</h2>
                <p className="announcement-card__excerpt">{excerpt(announcement.body)}</p>

                <div className="announcement-card__foot">
                  <div className="announcement-card__author">
                    <Avatar name={announcement.authorName} size="xs" />
                    <span>
                      <strong>{announcement.authorName}</strong>
                      <span>
                        {announcement.authorRole} · {relativeTime(announcement.date)}
                      </span>
                    </span>
                  </div>
                  <span className="announcement-card__more">
                    Read <Icon name="arrowRight" size={13} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface">
          <EmptyState
            icon="megaphone"
            title={tab === 'Unread' ? 'You’re all caught up' : 'No announcements match'}
            description={
              tab === 'Unread'
                ? 'Every announcement has been read. New posts will show up here.'
                : 'Try a different search or category.'
            }
          />
        </div>
      )}

      <AnnouncementComposer
        open={composerOpen}
        announcement={editing}
        onClose={() => {
          setComposerOpen(false);
          setEditing(null);
        }}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title}
        subtitle={detail ? `${detail.category} · ${formatDateLong(detail.date)}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
            {isHR && detail ? (
              <>
                <Button
                  variant="ghost"
                  icon={detail.pinned ? 'bookmark' : 'bookmark'}
                  onClick={() => {
                    togglePin(detail);
                    setDetail({ ...detail, pinned: !detail.pinned });
                  }}
                >
                  {detail.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  variant="primary"
                  icon="edit"
                  onClick={() => {
                    setEditing(detail);
                    setDetail(null);
                    setComposerOpen(true);
                  }}
                >
                  Edit
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="announcement-detail">
            <div className="announcement-detail__meta">
              <div className="announcement-detail__author">
                <Avatar name={detail.authorName} size="md" />
                <div>
                  <p>{detail.authorName}</p>
                  <span>
                    {detail.authorRole} · {relativeTime(detail.date)}
                  </span>
                </div>
              </div>
              <div className="announcement-detail__badges">
                <Badge tone={announcementTone(detail.category)}>{detail.category}</Badge>
                <Badge tone="outline">{detail.audience}</Badge>
              </div>
            </div>
            <div className="announcement-detail__body">
              {detail.body.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <p className="announcement-detail__read-note">
              <Icon name="checkCircle" size={14} />
              Marked as read for you.
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this announcement?"
        description={`“${deleteTarget?.title || ''}” will be removed for everyone. This can’t be undone.`}
        confirmLabel="Delete announcement"
      />
    </>
  );
}
