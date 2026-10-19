import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Avatar, { AvatarGroup } from '../ui/Avatar';
import Icon from '../ui/Icon';
import { Card, CardHeader } from '../ui/Card';
import DataTable from '../ui/DataTable';
import { Donut } from '../ui/Charts';
import { ProgressBar } from '../ui/Progress';
import LeaveDecisionModal from '../leaves/LeaveDecisionModal';
import AssignTrainingModal from '../training/AssignTrainingModal';
import { useData } from '../../context/DataContext';
import { formatDateLong, formatRange, greeting, relativeTime, todayISO } from '../../utils/date';
import { firstName } from '../../utils/format';
import { attendanceTone, leaveTypeLabel, leaveTypeTone, TONE_HEX } from '../../utils/ui';
import {
  attendanceStats,
  employeesOnLeaveToday,
  leaveBalance,
  pendingLeaves,
  reportsOf,
  todayRecords,
  todayStatusFor,
  trainingStats,
} from '../../utils/selectors';

export default function ManagerDashboard() {
  const { currentEmployee, employees, leaves, attendance, trainings, announcements } = useData();
  const navigate = useNavigate();
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);

  const today = todayISO();
  const team = reportsOf(employees, currentEmployee?.id);
  const teamIds = team.map((employee) => employee.id);
  const records = todayRecords(attendance, today).filter((record) => teamIds.includes(record.employeeId));
  const stats = attendanceStats(records, team);
  const onLeave = employeesOnLeaveToday(leaves, employees).filter((entry) =>
    teamIds.includes(entry.employee.id),
  );
  const approvals = pendingLeaves(leaves, employees, currentEmployee?.id).sort((a, b) =>
    a.appliedOn.localeCompare(b.appliedOn),
  );
  const trainingSummary = trainingStats(trainings, teamIds);
  const teamCourses = useMemo(
    () =>
      trainings
        .map((course) => ({
          ...course,
          teamEnrolled: course.enrolled.filter((entry) => teamIds.includes(entry.employeeId)),
        }))
        .filter((course) => course.teamEnrolled.length)
        .map((course) => ({
          ...course,
          avgProgress: Math.round(
            course.teamEnrolled.reduce((sum, entry) => sum + entry.progress, 0) /
              course.teamEnrolled.length,
          ),
        })),
    [trainings, teamIds.join(',')],
  );
  const upcomingLeave = leaves
    .filter(
      (leave) =>
        teamIds.includes(leave.employeeId) &&
        leave.status === 'Approved' &&
        leave.from >= today,
    )
    .sort((a, b) => a.from.localeCompare(b.from))
    .slice(0, 4);

  const pulseSegments = [
    { label: 'In office', value: Math.max(stats.present - stats.wfh, 0), color: TONE_HEX.green },
    { label: 'Remote', value: stats.wfh, color: TONE_HEX.blue },
    { label: 'On leave', value: stats.onLeave, color: TONE_HEX.violet },
    { label: 'Not in', value: stats.absent, color: TONE_HEX.slate },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Teammate',
      sortable: true,
      render: (row) => (
        <div className="cell-person">
          <Avatar name={row.name} src={row.avatar} size="sm" />
          <div className="cell-person__text">
            <span className="cell-person__name">{row.name}</span>
            <span className="cell-person__meta">{row.jobTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'today',
      label: 'Today',
      render: (row) => {
        const record = todayStatusFor(row.id, attendance, leaves);
        const status = record?.status || 'Not logged';
        return (
          <div className="cell-stack">
            <Badge tone={attendanceTone(status)} dot>{status}</Badge>
            {record?.checkIn ? <span className="cell-stack__sub">since {record.checkIn}</span> : null}
          </div>
        );
      },
    },
    {
      key: 'leave',
      label: 'Leave left',
      render: (row) => {
        const annual = leaveBalance(row).find((balance) => balance.type === 'annual');
        return (
          <div className="cell-stack">
            <span className="cell-stack__main">{annual.remaining}d</span>
            <span className="cell-stack__sub">annual</span>
          </div>
        );
      },
    },
    {
      key: 'training',
      label: 'Training',
      render: (row) => {
        const enrolments = trainings
          .map((course) => ({
            course,
            entry: course.enrolled.find((item) => item.employeeId === row.id),
          }))
          .filter((item) => item.entry);
        if (!enrolments.length) return <span className="text-faint">—</span>;
        const average = Math.round(
          enrolments.reduce((sum, item) => sum + item.entry.progress, 0) / enrolments.length,
        );
        return (
          <div className="table-progress">
            <ProgressBar value={average} size="sm" tone="violet" />
            <span>{average}%</span>
          </div>
        );
      },
    },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          className="row-action"
          aria-label={`View ${row.name}`}
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/team?focus=${row.id}`);
          }}
        >
          <Icon name="arrowUpRight" size={15} />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={formatDateLong(today)}
        title={`${greeting()}, ${firstName(currentEmployee?.name)}`}
        subtitle={`Your team of ${team.length} — attendance, approvals and growth in one place.`}
        actions={
          <>
            <Button variant="secondary" icon="calendarCheck" onClick={() => navigate('/leaves')}>
              Review approvals
            </Button>
            <Button
              variant="primary"
              icon="graduation"
              onClick={() => {
                setAssignCourse(null);
                setAssignOpen(true);
              }}
            >
              Assign training
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Team size"
          value={team.length}
          icon="users"
          tone="navy"
          footnote={`Across ${new Set(team.map((employee) => employee.department)).size} department${
            new Set(team.map((employee) => employee.department)).size === 1 ? '' : 's'
          }`}
          onClick={() => navigate('/team')}
        />
        <StatCard
          label="In today"
          value={stats.present + stats.wfh}
          icon="userCheck"
          tone="green"
          trend={{ value: `${stats.rate}%`, direction: 'up' }}
          trendLabel="team attendance"
          footnote={`${stats.wfh} remote · ${stats.late} late`}
        />
        <StatCard
          label="On leave"
          value={onLeave.length}
          icon="calendar"
          tone="violet"
          footnote={onLeave.length ? onLeave.map((entry) => firstName(entry.employee.name)).join(', ') : 'Full team in today'}
          onClick={() => navigate('/leaves')}
        />
        <StatCard
          label="Pending approvals"
          value={approvals.length}
          icon="clipboard"
          tone="amber"
          footnote={approvals.length ? `Oldest ${relativeTime(approvals[0].appliedOn)}` : 'Nothing waiting'}
          onClick={() => navigate('/leaves')}
        />
      </div>

      <div className="dash-layout">
        <div className="dash-main">
          <Card flush>
            <CardHeader
              title="Pending leave approvals"
              subtitle="Requests from your direct team"
              action={
                <Link to="/leaves" className="link-button">
                  Open approvals <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
            <div className="approval-list approval-list--roomy">
              {approvals.slice(0, 4).map((leave) => (
                <div className="approval-item" key={leave.id}>
                  <Avatar name={leave.employeeName} size="md" />
                  <div className="approval-item__body">
                    <p className="approval-item__name">
                      {leave.employeeName}
                      <span className={`approval-item__type tone-${leaveTypeTone(leave.type)}`}>
                        {leaveTypeLabel(leave.type)}
                      </span>
                    </p>
                    <p className="approval-item__meta">
                      {formatRange(leave.from, leave.to)} · {leave.days || 1}d · applied{' '}
                      {relativeTime(leave.appliedOn)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedLeave(leave)}>
                    Review
                  </Button>
                </div>
              ))}
              {!approvals.length ? (
                <div className="approval-list__empty approval-list__empty--tall">
                  <Icon name="checkCircle" size={20} />
                  <p>All caught up — no pending requests.</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card flush>
            <CardHeader
              title="Team overview"
              subtitle="Availability, balances and learning at a glance"
              action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/team')}>
                  Full team
                </Button>
              }
            />
            <DataTable
              columns={columns}
              rows={team}
              pageSize={6}
              pagination={false}
              onRowClick={(row) => navigate(`/team?focus=${row.id}`)}
              ariaLabel="Team overview"
            />
          </Card>

          <Card>
            <CardHeader
              title="Training management"
              subtitle={`${trainingSummary.inProgress} in progress · ${trainingSummary.completionRate}% completion`}
              action={
                <Link to="/training" className="link-button">
                  All training <Icon name="arrowRight" size={14} />
                </Link>
              }
            />
            <div className="course-mini-list">
              {teamCourses.slice(0, 3).map((course) => (
                <div className="course-mini" key={course.id}>
                  <span className={`course-mini__icon tone-${course.tone || 'blue'}`}>
                    <Icon name="bookOpen" size={17} />
                  </span>
                  <div className="course-mini__body">
                    <p className="course-mini__title">{course.title}</p>
                    <div className="course-mini__meta">
                      <AvatarGroup
                        people={course.teamEnrolled.map((entry) => ({
                          id: entry.employeeId,
                          name: entry.employeeName || 'Teammate',
                        }))}
                        size="xs"
                        max={3}
                      />
                      <span>{course.teamEnrolled.length} enrolled</span>
                      <span>·</span>
                      <span>Due {formatRange(course.dueDate)}</span>
                    </div>
                    <div className="course-mini__progress">
                      <ProgressBar value={course.avgProgress} tone={course.tone || 'blue'} size="sm" />
                      <span>{course.avgProgress}%</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="userPlus"
                    onClick={() => {
                      setAssignCourse(course);
                      setAssignOpen(true);
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="dash-side">
          <Card>
            <CardHeader title="Team pulse" subtitle={`Today · ${stats.accounted} logged`} />
            <div className="pulse">
              <Donut
                segments={pulseSegments}
                size={132}
                thickness={15}
                centerValue={`${stats.present + stats.wfh}/${team.length}`}
                centerLabel="in today"
              />
              <div className="legend legend--roomy">
                {pulseSegments.map((segment) => (
                  <div className="legend__item" key={segment.label}>
                    <span className="legend__swatch" style={{ background: segment.color }} />
                    <span className="legend__label">{segment.label}</span>
                    <span className="legend__value">{segment.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card flush>
            <CardHeader
              title="Upcoming leave"
              subtitle="Approved time off in your team"
              action={
                <Link to="/leaves" className="link-button">
                  View all
                </Link>
              }
            />
            <div className="upcoming-leave">
              {upcomingLeave.map((leave) => {
                const employee = employees.find((item) => item.id === leave.employeeId);
                return (
                  <div className="upcoming-leave__item" key={leave.id}>
                    <Avatar name={employee?.name} src={employee?.avatar} size="sm" />
                    <div className="upcoming-leave__body">
                      <p className="upcoming-leave__name">{employee?.name}</p>
                      <p className="upcoming-leave__meta">
                        {leaveTypeLabel(leave.type)} · {formatRange(leave.from, leave.to)}
                      </p>
                    </div>
                    <span className="upcoming-leave__days">{leave.days || 1}d</span>
                  </div>
                );
              })}
              {!upcomingLeave.length ? <p className="approval-list__empty">No upcoming leave.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Announcements" subtitle="Latest updates" action={<Link to="/announcements" className="link-button">View all</Link>} />
            <div className="announce-mini">
              {announcements.slice(0, 2).map((announcement) => (
                <Link to="/announcements" className="announce-mini__item" key={announcement.id}>
                  <span className="announce-mini__dot tone-blue">
                    <Icon name="megaphone" size={14} />
                  </span>
                  <span className="announce-mini__body">
                    <span className="announce-mini__title">{announcement.title}</span>
                    <span className="announce-mini__meta">{relativeTime(announcement.date)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <LeaveDecisionModal request={selectedLeave} onClose={() => setSelectedLeave(null)} />
      <AssignTrainingModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        courseId={assignCourse?.id || null}
        scope={teamIds}
      />
    </>
  );
}
