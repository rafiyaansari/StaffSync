import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icon';
import { Card, CardHeader } from '../ui/Card';
import { ProgressBar, ProgressRing } from '../ui/Progress';
import AttendanceCalendar from '../attendance/AttendanceCalendar';
import LeaveRequestForm from '../leaves/LeaveRequestForm';
import LeaveRequestModal from '../leaves/LeaveRequestModal';
import LeaveDetailsModal from '../leaves/LeaveDetailsModal';
import { useData } from '../../context/DataContext';
import { formatDate, formatDateLong, formatRange, formatTime12h, greeting, hoursBetween, relativeTime, todayISO } from '../../utils/date';
import { firstName } from '../../utils/format';
import {
  leaveStatusTone,
  leaveTypeLabel,
  leaveTypeTone,
  announcementTone,
} from '../../utils/ui';
import {
  attendanceForEmployee,
  leaveBalance,
  monthAttendanceStats,
  myCourses,
  todayStatusFor,
} from '../../utils/selectors';

export default function EmployeeDashboard() {
  const { currentEmployee, attendance, leaves, trainings, announcements, clockIn, clockOut } = useData();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [clockLoading, setClockLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [detailLeave, setDetailLeave] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const employeeId = currentEmployee?.id;
  const myLeaves = useMemo(
    () =>
      leaves
        .filter((leave) => leave.employeeId === employeeId)
        .slice()
        .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [leaves, employeeId],
  );
  const recordMap = useMemo(() => {
    const map = {};
    attendance
      .filter((record) => record.employeeId === employeeId)
      .forEach((record) => {
        map[record.date] = record;
      });
    return map;
  }, [attendance, employeeId]);

  if (!currentEmployee) return null;

  const balances = leaveBalance(currentEmployee);
  const annual = balances.find((balance) => balance.type === 'annual');
  const monthStats = monthAttendanceStats(attendance, employeeId, new Date());
  const todayRecord = todayStatusFor(employeeId, attendance, leaves);
  const onLeaveToday = todayRecord?.status === 'On leave';
  const checkedIn = Boolean(todayRecord?.checkIn);
  const checkedOut = Boolean(todayRecord?.checkOut);
  const pendingOwn = myLeaves.filter((leave) => leave.status === 'Pending');
  const courses = myCourses(trainings, employeeId);
  const completedCourses = courses.filter((course) => course.enrollment.status === 'Completed');
  const avgCourseProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + course.enrollment.progress, 0) / courses.length)
    : 0;
  const unreadAnnouncements = announcements.filter(
    (announcement) => !announcement.readBy.includes(employeeId),
  );

  const elapsed = todayRecord?.checkIn
    ? Math.max(0, hoursBetween(todayRecord.checkIn, `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`))
    : 0;

  const handleClock = async (mode) => {
    setClockLoading(true);
    try {
      if (mode === 'out') await clockOut();
      else await clockIn(mode);
    } finally {
      setClockLoading(false);
    }
  };

  const todayLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const today = todayISO();

  return (
    <>
      <div className="welcome-hero">
        <div className="welcome-hero__pattern" aria-hidden="true" />
        <div className="welcome-hero__content">
          <p className="welcome-hero__eyebrow">{formatDateLong(today)}</p>
          <h1 className="welcome-hero__title">
            {greeting()}, {firstName(currentEmployee?.name)}.
          </h1>
          <p className="welcome-hero__sub">
            {onLeaveToday
              ? 'You’re on approved leave today — enjoy the break.'
              : checkedOut
                ? 'Your day is logged. Nice work — go enjoy the evening.'
                : 'Here’s your day at a glance. You’ve got this.'}
          </p>
          <div className="welcome-hero__meta">
            <span className="welcome-hero__meta-item">
              <Avatar name={currentEmployee.name} src={currentEmployee.avatar} size="xs" />
              {currentEmployee.jobTitle}
            </span>
            <span className="welcome-hero__meta-item">
              <Icon name="mapPin" size={14} /> {currentEmployee.workMode} · {currentEmployee.location}
            </span>
          </div>
        </div>

        <div className="clock-panel">
          <div className="clock-panel__top">
            <span className="clock-panel__date">{todayLabel}</span>
            <span className={`clock-panel__status ${checkedIn && !checkedOut ? 'is-live' : ''}`.trim()}>
              <span className="clock-panel__status-dot" />
              {onLeaveToday
                ? 'On leave'
                : checkedOut
                  ? 'Day complete'
                  : checkedIn
                    ? 'Working now'
                    : 'Not checked in'}
            </span>
          </div>
          <p className="clock-panel__time">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {checkedIn ? (
            <p className="clock-panel__detail">
              In at {formatTime12h(todayRecord.checkIn)}
              {checkedOut ? ` · Out at ${formatTime12h(todayRecord.checkOut)}` : ''}
              {!checkedOut && elapsed > 0 ? ` · ${elapsed.toFixed(1)}h so far` : ''}
            </p>
          ) : (
            <p className="clock-panel__detail">Shift starts at 9:00 AM · hybrid</p>
          )}

          <div className="clock-panel__actions">
            {onLeaveToday ? (
              <span className="clock-panel__leave-note">
                <Icon name="calendar" size={15} />
                Approved leave · {leaveTypeLabel(todayRecord.leaveType)}
              </span>
            ) : checkedIn && !checkedOut ? (
              <Button variant="primary" size="sm" icon="clock" onClick={() => handleClock('out')} loading={clockLoading}>
                Clock out
              </Button>
            ) : checkedOut ? (
              <Button variant="secondary" size="sm" icon="check" disabled>
                Logged {todayRecord.hours}h today
              </Button>
            ) : (
              <>
                <Button variant="primary" size="sm" icon="clock" onClick={() => handleClock('office')} loading={clockLoading}>
                  Clock in
                </Button>
                <Button variant="secondary" size="sm" icon="home" onClick={() => handleClock('remote')} disabled={clockLoading}>
                  WFH
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Annual leave left"
          value={`${annual.remaining}d`}
          icon="calendar"
          tone="blue"
          footnote={`${annual.used} used of ${annual.total} this year`}
          onClick={() => navigate('/leaves')}
        />
        <StatCard
          label="Attendance this month"
          value={`${monthStats.rate}%`}
          icon="userCheck"
          tone="green"
          footnote={`${monthStats.present + monthStats.late} present · ${monthStats.wfh} remote`}
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          label="Pending requests"
          value={pendingOwn.length}
          icon="clock"
          tone="amber"
          footnote={pendingOwn.length ? `Applied ${relativeTime(pendingOwn[0].appliedOn)}` : 'No requests awaiting review'}
          onClick={() => navigate('/leaves')}
        />
        <StatCard
          label="Learning progress"
          value={`${avgCourseProgress}%`}
          icon="graduation"
          tone="violet"
          footnote={`${completedCourses.length} of ${courses.length} courses completed`}
          onClick={() => navigate('/training')}
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main">
          <Card>
            <CardHeader
              title="Attendance summary"
              subtitle="This month so far"
              action={
                <Link to="/attendance" className="link-button">
                  View log <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
            <div className="att-summary">
              <AttendanceCalendar recordsByDate={recordMap} compact />
              <div className="att-summary__stats">
                <ProgressRing value={monthStats.rate} size={98} stroke={9} tone="green">
                  <span className="att-summary__ring-value">{monthStats.rate}%</span>
                  <span className="att-summary__ring-label">rate</span>
                </ProgressRing>
                <div className="att-summary__list">
                  <div className="att-summary__row">
                    <span><span className="att-dot att-dot--green" /> Present</span>
                    <strong>{monthStats.present + monthStats.late}</strong>
                  </div>
                  <div className="att-summary__row">
                    <span><span className="att-dot att-dot--blue" /> Remote</span>
                    <strong>{monthStats.wfh}</strong>
                  </div>
                  <div className="att-summary__row">
                    <span><span className="att-dot att-dot--violet" /> Leave</span>
                    <strong>{monthStats.onLeave}</strong>
                  </div>
                  <div className="att-summary__row">
                    <span><span className="att-dot att-dot--amber" /> Late</span>
                    <strong>{monthStats.late}</strong>
                  </div>
                  <div className="att-summary__row att-summary__row--hours">
                    <span><Icon name="timer" size={14} /> Avg. hours</span>
                    <strong>{monthStats.avgHours}h</strong>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card flush>
            <CardHeader
              title="My leave requests"
              subtitle="Status of your time-off requests"
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setApplyOpen(true)}>
                  Apply
                </Button>
              }
            />
            <div className="leave-rows">
              {myLeaves.slice(0, 4).map((leave) => (
                <button
                  type="button"
                  className="leave-row"
                  key={leave.id}
                  onClick={() => setDetailLeave(leave)}
                >
                  <span className={`leave-row__type tone-${leaveTypeTone(leave.type)}`}>
                    <Icon name="calendar" size={15} />
                  </span>
                  <span className="leave-row__main">
                    <span className="leave-row__title">{leaveTypeLabel(leave.type)}</span>
                    <span className="leave-row__meta">
                      {formatRange(leave.from, leave.to)} · {leave.days || 1}d
                    </span>
                  </span>
                  <Badge tone={leaveStatusTone(leave.status)} dot>
                    {leave.status}
                  </Badge>
                  <Icon name="chevronRight" size={15} className="leave-row__chevron" />
                </button>
              ))}
              {!myLeaves.length ? (
                <div className="leave-rows__empty">
                  <p>No leave requests yet.</p>
                  <button type="button" className="link-button" onClick={() => setApplyOpen(true)}>
                    Plan your first break <Icon name="arrowRight" size={13} />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="card-footer">
              <Link to="/leaves" className="link-button">
                All my leaves <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Announcements"
              subtitle={`${unreadAnnouncements.length} unread`}
              action={
                <Link to="/announcements" className="link-button">
                  View all <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
            <div className="announce-feed">
              {announcements.slice(0, 3).map((announcement) => {
                const unread = !announcement.readBy.includes(employeeId);
                return (
                  <Link to="/announcements" className="announce-feed__item" key={announcement.id}>
                    <span className={`announce-feed__icon tone-${announcementTone(announcement.category)}`}>
                      <Icon name="megaphone" size={15} />
                    </span>
                    <span className="announce-feed__body">
                      <span className="announce-feed__title">
                        {announcement.title}
                        {unread ? <span className="announce-feed__unread" /> : null}
                      </span>
                      <span className="announce-feed__meta">
                        {announcement.authorName} · {relativeTime(announcement.date)}
                      </span>
                    </span>
                    {announcement.pinned ? <Badge tone="outline" size="sm">Pinned</Badge> : null}
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="dash-side">
          <Card>
            <div className="profile-mini">
              <Avatar name={currentEmployee.name} src={currentEmployee.avatar} size="xl" ring />
              <div className="profile-mini__identity">
                <h3 className="profile-mini__name">{currentEmployee.name}</h3>
                <p className="profile-mini__role">{currentEmployee.jobTitle}</p>
                <div className="profile-mini__badges">
                  <Badge tone="navy">{currentEmployee.department}</Badge>
                  <Badge tone="neutral">{currentEmployee.employeeCode || currentEmployee.id}</Badge>
                </div>
              </div>
            </div>
            <dl className="profile-mini__facts">
              <div>
                <dt><Icon name="users" size={14} /> Reports to</dt>
                <dd>{currentEmployee.managerName || '—'}</dd>
              </div>
              <div>
                <dt><Icon name="calendar" size={14} /> Joined</dt>
                <dd>{formatDate(currentEmployee.joinDate)}</dd>
              </div>
              <div>
                <dt><Icon name="mapPin" size={14} /> Base</dt>
                <dd>{currentEmployee.location}</dd>
              </div>
              <div>
                <dt><Icon name="mail" size={14} /> Email</dt>
                <dd className="truncate">{currentEmployee.email}</dd>
              </div>
            </dl>
            {currentEmployee.skills?.length ? (
              <div className="chip-list chip-list--tight">
                {currentEmployee.skills.slice(0, 3).map((skill) => (
                  <span className="chip" key={skill}>{skill}</span>
                ))}
                {currentEmployee.skills.length > 3 ? (
                  <span className="chip chip--muted">+{currentEmployee.skills.length - 3}</span>
                ) : null}
              </div>
            ) : null}
            <div className="profile-mini__actions">
              <Link to="/profile" className="btn btn--secondary btn--sm">
                View profile
              </Link>
              <a href={`mailto:${currentEmployee.email}`} className="btn btn--ghost btn--sm btn--icon" aria-label="Email">
                <Icon name="mail" size={16} />
              </a>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Leave balance"
              subtitle="Your remaining allowance"
              action={<Link to="/leaves" className="link-button">Details</Link>}
            />
            <div className="balance-list">
              {balances.map((balance) => (
                <div className="balance-row" key={balance.type}>
                  <div className="balance-row__top">
                    <span className="balance-row__label">{leaveTypeLabel(balance.type)}</span>
                    <span className="balance-row__value">
                      <strong>{balance.remaining}</strong> / {balance.total}
                    </span>
                  </div>
                  <ProgressBar value={balance.percent} tone={leaveTypeTone(balance.type)} size="sm" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Request time off"
              subtitle="We’ll route it to your manager"
            />
            <LeaveRequestForm employee={currentEmployee} compact />
          </Card>
        </div>
      </div>

      <LeaveDetailsModal
        leave={detailLeave}
        onClose={() => setDetailLeave(null)}
        onApplyAgain={() => {
          setDetailLeave(null);
          setApplyOpen(true);
        }}
      />
      <LeaveRequestModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  );
}
