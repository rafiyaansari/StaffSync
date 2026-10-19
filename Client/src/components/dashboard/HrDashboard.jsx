import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icon';
import { Card, CardHeader } from '../ui/Card';
import DataTable from '../ui/DataTable';
import { BarChart, Donut } from '../ui/Charts';
import EmployeeFormModal from '../employees/EmployeeFormModal';
import LeaveDecisionModal from '../leaves/LeaveDecisionModal';
import { useData } from '../../context/DataContext';
import { greeting, formatDate, formatDateLong, relativeTime, todayISO, daysBetween } from '../../utils/date';
import { firstName } from '../../utils/format';
import { TONE_HEX, attendanceTone, announcementTone, leaveTypeLabel } from '../../utils/ui';
import {
  attendanceStats,
  departmentHeadcount,
  employeesOnLeaveToday,
  newJoinersThisMonth,
  todayRecords,
  todayStatusFor,
  weeklyAttendance,
} from '../../utils/selectors';
import { UPCOMING_EVENTS } from '../../data/seed';

export default function HrDashboard() {
  const { employees, leaves, attendance, announcements, currentEmployee } = useData();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const today = todayISO();
  const records = todayRecords(attendance);
  const stats = attendanceStats(records, employees);
  const onLeave = employeesOnLeaveToday(leaves, employees);
  const pending = leaves
    .filter((leave) => leave.status === 'Pending')
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn));
  const weekly = weeklyAttendance(attendance, employees, 10);
  const departments = departmentHeadcount(employees);
  const joiners = newJoinersThisMonth(employees);
  const upcoming = announcements.slice(0, 3);

  const donutSegments = [
    { label: 'In office', value: Math.max(stats.present - stats.wfh, 0), color: TONE_HEX.green },
    { label: 'Remote', value: stats.wfh, color: TONE_HEX.blue },
    { label: 'On leave', value: stats.onLeave, color: TONE_HEX.violet },
    { label: 'Absent', value: stats.absent, color: TONE_HEX.rose },
  ];

  const oldestPendingDays = pending.length
    ? Math.max(...pending.map((leave) => daysBetween(leave.appliedOn, today) - 1))
    : 0;

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="cell-person">
          <Avatar name={row.name} src={row.avatar} size="sm" />
          <div className="cell-person__text">
            <span className="cell-person__name">{row.name}</span>
            <span className="cell-person__meta">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'jobTitle',
      label: 'Role',
      sortable: true,
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-stack__main">{row.jobTitle}</span>
          <span className="cell-stack__sub">{row.department}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Today',
      render: (row) => {
        const record = todayStatusFor(row.id, attendance, leaves);
        const status = record?.status || 'Not logged';
        return (
          <Badge tone={attendanceTone(status)} dot>
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'joinDate',
      label: 'Joined',
      sortable: true,
      render: (row) => <span className="nowrap">{formatDate(row.joinDate)}</span>,
    },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => (
        <span className="row-actions">
          <button
            type="button"
            className="row-action"
            aria-label={`Open ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/employees?focus=${row.id}`);
            }}
          >
            <Icon name="arrowUpRight" size={15} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={formatDateLong(today)}
        title={`${greeting()}, ${firstName(currentEmployee?.name)}`}
        subtitle="Here’s the pulse of Nimbus Labs today — attendance, approvals and what’s next."
        actions={
          <>
            <Button
              variant="secondary"
              icon="megaphone"
              onClick={() => navigate('/announcements', { state: { compose: true } })}
            >
              Post announcement
            </Button>
            <Button variant="primary" icon="userPlus" onClick={() => setAddOpen(true)}>
              Add employee
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Total employees"
          value={employees.filter((employee) => employee.status !== 'Inactive').length}
          icon="users"
          tone="navy"
          trend={{ value: `+${joiners.length}`, direction: 'up' }}
          trendLabel="new this month"
          footnote={`${departments.length} departments · ${employees.length - employees.filter((e) => e.status !== 'Inactive').length} inactive`}
          onClick={() => navigate('/employees')}
        />
        <StatCard
          label="Present today"
          value={stats.present + stats.wfh}
          icon="userCheck"
          tone="green"
          trend={{ value: `${stats.rate}%`, direction: 'up' }}
          trendLabel="attendance rate"
          footnote={`${stats.wfh} remote · ${stats.late} late · ${stats.absent} absent`}
          sparkline={weekly.map((day) => day.rate)}
        />
        <StatCard
          label="On leave"
          value={onLeave.length}
          icon="calendar"
          tone="violet"
          footnote={
            onLeave.length
              ? onLeave.map((entry) => firstName(entry.employee.name)).slice(0, 3).join(', ')
              : 'Everyone is in today'
          }
          onClick={() => navigate('/leaves')}
        />
        <StatCard
          label="Pending approvals"
          value={pending.length}
          icon="clipboard"
          tone="amber"
          footnote={pending.length ? `Oldest waiting ${Math.max(oldestPendingDays, 0)} day${oldestPendingDays === 1 ? '' : 's'}` : 'All caught up'}
          onClick={() => navigate('/leaves')}
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main">
          <Card>
            <CardHeader
              title="Attendance overview"
              subtitle="Company-wide · last 7 working days"
              action={
                <Link to="/attendance" className="link-button">
                  View report <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
            <div className="chart-split">
              <div className="chart-split__chart">
                <BarChart
                  data={weekly.slice(-5).map((day, index, list) => ({
                    label: day.label,
                    value: day.rate,
                    highlight: index === list.length - 1,
                  }))}
                  suffix="%"
                  maxValue={100}
                  height={158}
                  ariaLabel="Weekly attendance rate"
                />
              </div>
              <div className="chart-split__side">
                <Donut
                  segments={donutSegments}
                  size={126}
                  thickness={15}
                  centerValue={`${stats.rate}%`}
                  centerLabel="attendance"
                />
                <div className="legend">
                  {donutSegments.map((segment) => (
                    <div className="legend__item" key={segment.label}>
                      <span className="legend__swatch" style={{ background: segment.color }} />
                      <span className="legend__label">{segment.label}</span>
                      <span className="legend__value">{segment.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="attendance-strip">
              <div className="attendance-strip__item">
                <span className="attendance-strip__value">{stats.accounted}</span>
                <span className="attendance-strip__label">Logged today</span>
              </div>
              <div className="attendance-strip__item">
                <span className="attendance-strip__value">{stats.late}</span>
                <span className="attendance-strip__label">Late arrivals</span>
              </div>
              <div className="attendance-strip__item">
                <span className="attendance-strip__value">{stats.wfh}</span>
                <span className="attendance-strip__label">Working remotely</span>
              </div>
              <div className="attendance-strip__item">
                <span className="attendance-strip__value">{stats.absent}</span>
                <span className="attendance-strip__label">Unaccounted</span>
              </div>
            </div>
          </Card>

          <Card flush>
            <CardHeader
              title="Employee management"
              subtitle="A snapshot of your people directory"
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/employees')}>
                  All employees
                </Button>
              }
            />
            <DataTable
              columns={columns}
              rows={employees.slice(0, 5)}
              pageSize={5}
              pagination={false}
              onRowClick={(row) => navigate(`/employees?focus=${row.id}`)}
              ariaLabel="Recent employees"
            />
          </Card>
        </div>

        <div className="dash-side">
          <Card flush>
            <CardHeader
              title="Leave approvals"
              subtitle={`${pending.length} request${pending.length === 1 ? '' : 's'} waiting`}
              action={
                <Link to="/leaves" className="link-button">
                  View all
                </Link>
              }
            />
            <div className="approval-list">
              {pending.slice(0, 4).map((leave) => (
                <div className="approval-item" key={leave.id}>
                  <Avatar name={leave.employeeName} size="sm" />
                  <div className="approval-item__body">
                    <p className="approval-item__name">{leave.employeeName}</p>
                    <p className="approval-item__meta">
                      {leaveTypeLabel(leave.type)} · {formatDate(leave.from)}
                    </p>
                  </div>
                  <span className="approval-item__age">{relativeTime(leave.appliedOn)}</span>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedLeave(leave)}>
                    Review
                  </Button>
                </div>
              ))}
              {!pending.length ? (
                <p className="approval-list__empty">Nothing waiting — every request is reviewed.</p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Announcements"
              subtitle="Latest from the People team"
              action={
                <Link to="/announcements" className="link-button">
                  View all
                </Link>
              }
            />
            <div className="announce-mini">
              {upcoming.map((announcement) => (
                <Link to="/announcements" className="announce-mini__item" key={announcement.id}>
                  <span className={`announce-mini__dot tone-${announcementTone(announcement.category)}`}>
                    <Icon name="megaphone" size={14} />
                  </span>
                  <span className="announce-mini__body">
                    <span className="announce-mini__title">{announcement.title}</span>
                    <span className="announce-mini__meta">
                      {announcement.authorName} · {relativeTime(announcement.date)}
                    </span>
                  </span>
                  {announcement.pinned ? <Icon name="bookmark" size={13} className="announce-mini__pin" /> : null}
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="This week" subtitle="Events and moments to look forward to" />
            <div className="event-list">
              {UPCOMING_EVENTS.map((event) => (
                <div className="event-item" key={event.id}>
                  <div className={`event-item__date tone-${event.tone}`}>
                    <span>
                      {new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <strong>{new Date(event.date).getDate()}</strong>
                  </div>
                  <div className="event-item__text">
                    <p className="event-item__title">{event.title}</p>
                    <span className="event-item__meta">{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <EmployeeFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <LeaveDecisionModal request={selectedLeave} onClose={() => setSelectedLeave(null)} />
    </>
  );
}
