import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import { Card, CardHeader } from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Tabs from '../components/ui/Tabs';
import { SearchField, SelectField } from '../components/ui/FormFields';
import AttendanceCalendar from '../components/attendance/AttendanceCalendar';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  daysBetween,
  formatDate,
  formatDateLong,
  formatTime12h,
  hoursBetween,
  todayISO,
  weekdayShort,
} from '../utils/date';
import { downloadCSV } from '../utils/format';
import {
  TONE_HEX,
  attendanceTone,
  leaveTypeLabel,
  leaveTypeShort,
} from '../utils/ui';
import {
  attendanceForEmployee,
  attendanceStats,
  employeesOnLeaveToday,
  monthAttendanceStats,
  reportsOf,
  todayRecords,
  todayStatusFor,
  weeklyAttendance,
} from '../utils/selectors';
import { BarChart, Donut } from '../components/ui/Charts';

/* ------------------------------------------------------------------ */
/* Employee view                                                      */
/* ------------------------------------------------------------------ */

function EmployeeAttendance() {
  const { currentEmployee, attendance, leaves, clockIn, clockOut } = useData();
  const [clockLoading, setClockLoading] = useState(null);

  const today = todayISO();
  const employeeId = currentEmployee?.id;
  const record = todayStatusFor(employeeId, attendance, leaves);
  const monthStats = monthAttendanceStats(attendance, employeeId, new Date());
  const records = attendanceForEmployee(attendance, employeeId);
  const recordMap = useMemo(() => {
    const map = {};
    records.forEach((item) => {
      map[item.date] = item;
    });
    return map;
  }, [records]);

  if (!currentEmployee) return null;

  const onLeaveToday = record?.status === 'On leave';
  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const checkInMinutes = record?.checkIn
    ? Number(record.checkIn.split(':')[0]) * 60 + Number(record.checkIn.split(':')[1])
    : 0;
  const liveHours = checkedIn ? Math.max(0, (currentMinutes - checkInMinutes) / 60 - 0.5) : 0;

  const handleClock = async (mode) => {
    setClockLoading(mode);
    try {
      if (mode === 'out') await clockOut();
      else await clockIn(mode);
    } finally {
      setClockLoading(null);
    }
  };

  const exportRows = () =>
    downloadCSV(
      'my-attendance.csv',
      records.map((item) => ({
        Date: item.date,
        Status: item.status,
        'Check in': item.checkIn || '',
        'Check out': item.checkOut || '',
        Hours: item.hours || 0,
        Note: item.note || '',
      })),
    );

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-stack__main">
            {weekdayShort(row.date)}, {formatDate(row.date)}
          </span>
          <span className="cell-stack__sub">
            {row.leaveType ? leaveTypeLabel(row.leaveType) : row.hours ? 'Shift completed' : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge tone={attendanceTone(row.status)} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'checkIn',
      label: 'Check in',
      render: (row) => (row.checkIn ? formatTime12h(row.checkIn) : '—'),
    },
    {
      key: 'checkOut',
      label: 'Check out',
      render: (row) => (row.checkOut ? formatTime12h(row.checkOut) : '—'),
    },
    {
      key: 'hours',
      label: 'Hours',
      align: 'right',
      sortable: true,
      render: (row) => (row.hours ? `${row.hours}h` : '—'),
    },
    {
      key: 'note',
      label: 'Note',
      render: (row) => <span className="text-sm text-muted">{row.note || '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Time & attendance"
        title="My attendance"
        subtitle="Your check-ins, calendar and monthly summary — all in one place."
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportRows}>
              Export log
            </Button>
            <Link to="/leaves" className="btn btn--primary">
              <Icon name="calendar" size={16} />
              Apply for leave
            </Link>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Present this month"
          value={monthStats.present + monthStats.late}
          icon="userCheck"
          tone="green"
          footnote={`${monthStats.workingDaysSoFar} working days so far`}
        />
        <StatCard
          label="Remote days"
          value={monthStats.wfh}
          icon="home"
          tone="blue"
          footnote="Worked from home"
        />
        <StatCard
          label="Late check-ins"
          value={monthStats.late}
          icon="clock"
          tone="amber"
          footnote="After 9:45 AM"
        />
        <StatCard
          label="Avg. hours"
          value={`${monthStats.avgHours}h`}
          icon="timer"
          tone="violet"
          footnote="Per logged day"
        />
      </div>

      <Card className="today-card">
        <div className="today-card__left">
          <span className={`today-card__icon tone-${attendanceTone(record?.status || 'Present')}`}>
            <Icon name={record?.checkIn ? 'clock' : 'sun'} size={22} />
          </span>
          <div>
            <p className="today-card__eyebrow">Today · {formatDateLong(today)}</p>
            <h2 className="today-card__title">
              {onLeaveToday
                ? 'You’re on approved leave'
                : checkedOut
                  ? 'Your day is complete'
                  : checkedIn
                    ? 'You’re checked in'
                    : 'Ready to start the day?'}
            </h2>
            <p className="today-card__meta">
              {onLeaveToday
                ? `${leaveTypeLabel(record.leaveType)} · back soon`
                : checkedIn
                  ? `In at ${formatTime12h(record.checkIn)}${
                      record.checkOut ? ` · out at ${formatTime12h(record.checkOut)}` : ` · ${liveHours.toFixed(1)}h so far`
                    }`
                  : 'Shift starts at 9:00 AM · hybrid schedule'}
            </p>
          </div>
        </div>
        <div className="today-card__right">
          {onLeaveToday ? (
            <Badge tone="violet" dot>
              On leave
            </Badge>
          ) : checkedIn && !checkedOut ? (
            <Button variant="primary" icon="clock" onClick={() => handleClock('out')} loading={clockLoading === 'out'}>
              Clock out
            </Button>
          ) : checkedOut ? (
            <Badge tone="green" dot>
              {record.hours}h logged
            </Badge>
          ) : (
            <>
              <Button variant="primary" icon="clock" onClick={() => handleClock('office')} loading={clockLoading === 'office'}>
                Clock in
              </Button>
              <Button variant="secondary" icon="home" onClick={() => handleClock('remote')} disabled={Boolean(clockLoading)}>
                Work from home
              </Button>
            </>
          )}
        </div>
      </Card>

      <div className="attendance-layout">
        <Card>
          <CardHeader
            title="Attendance calendar"
            subtitle="Every logged day this month"
            action={
              <div className="attendance-legend-inline">
                <span><span className="att-dot att-dot--green" /> Present</span>
                <span><span className="att-dot att-dot--blue" /> Remote</span>
                <span><span className="att-dot att-dot--violet" /> Leave</span>
              </div>
            }
          />
          <AttendanceCalendar recordsByDate={recordMap} />
          <div className="attendance-month-strip">
            <div>
              <span>Attendance rate</span>
              <strong>{monthStats.rate}%</strong>
            </div>
            <div>
              <span>Logged days</span>
              <strong>{monthStats.loggedDays}</strong>
            </div>
            <div>
              <span>On leave</span>
              <strong>{monthStats.onLeave}</strong>
            </div>
            <div>
              <span>Absent</span>
              <strong>{monthStats.absent}</strong>
            </div>
          </div>
        </Card>

        <Card flush>
          <CardHeader
            title="Recent activity"
            subtitle="Your last check-ins"
            action={
              <Link to="/leaves" className="link-button">
                Leaves <Icon name="arrowRight" size={14} />
              </Link>
            }
          />
          <DataTable
            columns={columns}
            rows={records.slice(0, 8)}
            pageSize={8}
            pagination={false}
            ariaLabel="My attendance log"
            emptyState={
              <EmptyState
                icon="clock"
                title="No attendance yet"
                description="Clock in to start building your history."
                compact
              />
            }
          />
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* HR / manager view                                                  */
/* ------------------------------------------------------------------ */

function OrganizationAttendance({ mode }) {
  const { employees, leaves, attendance } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('today');

  const scope = useMemo(() => {
    if (mode === 'manager') return reportsOf(employees, user?.id);
    return employees;
  }, [employees, mode, user?.id]);

  const today = todayISO();
  const todayForScope = todayRecords(attendance, today).filter((record) =>
    scope.some((employee) => employee.id === record.employeeId),
  );
  const stats = attendanceStats(todayForScope, scope);
  const weekly = weeklyAttendance(attendance, scope, 12);
  const onLeave = employeesOnLeaveToday(leaves, employees).filter((entry) =>
    scope.some((employee) => employee.id === entry.employee.id),
  );

  const rows = scope
    .map((employee) => ({
      employee,
      record: todayStatusFor(employee.id, attendance, leaves),
    }))
    .filter(({ employee, record }) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        employee.name.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term);
      const matchesDepartment = !department || employee.department === department;
      const effectiveStatus = record?.status || 'Not logged';
      const matchesStatus = !status || effectiveStatus === status;
      return matchesSearch && matchesDepartment && matchesStatus;
    });

  const departments = [...new Set(scope.map((employee) => employee.department))];

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      sortable: true,
      sortValue: (row) => row.employee.name,
      render: ({ employee }) => (
        <div className="cell-person">
          <Avatar name={employee.name} src={employee.avatar} size="sm" />
          <div className="cell-person__text">
            <span className="cell-person__name">{employee.name}</span>
            <span className="cell-person__meta">{employee.jobTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      sortValue: (row) => row.employee.department,
      render: ({ employee }) => <span className="text-sm">{employee.department}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: ({ record }) => (
        <Badge tone={attendanceTone(record?.status || 'Not logged')} dot>
          {record?.status || 'Not logged'}
        </Badge>
      ),
    },
    {
      key: 'checkIn',
      label: 'Check in',
      render: ({ record }) => (record?.checkIn ? formatTime12h(record.checkIn) : '—'),
    },
    {
      key: 'checkOut',
      label: 'Check out',
      render: ({ record }) => (record?.checkOut ? formatTime12h(record.checkOut) : '—'),
    },
    {
      key: 'hours',
      label: 'Hours',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.record?.hours || 0,
      render: ({ record }) => (record?.hours ? `${record.hours}h` : '—'),
    },
    {
      key: 'note',
      label: 'Note',
      render: ({ record }) => (
        <span className="text-sm text-muted">
          {record?.leaveType ? leaveTypeLabel(record.leaveType) : record?.note || '—'}
        </span>
      ),
    },
  ];

  const exportRows = () =>
    downloadCSV(
      'staffsync-attendance.csv',
      rows.map(({ employee, record }) => ({
        Employee: employee.name,
        Department: employee.department,
        Status: record?.status || 'Not logged',
        'Check in': record?.checkIn || '',
        'Check out': record?.checkOut || '',
        Hours: record?.hours || 0,
        Note: record?.note || '',
      })),
    );

  const donutSegments = [
    { label: 'In office', value: Math.max(stats.present - stats.wfh, 0), color: TONE_HEX.green },
    { label: 'Remote', value: stats.wfh, color: TONE_HEX.blue },
    { label: 'On leave', value: stats.onLeave, color: TONE_HEX.violet },
    { label: 'Not in', value: stats.absent, color: TONE_HEX.rose },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Time & attendance"
        title={mode === 'manager' ? 'Team attendance' : 'Attendance'}
        subtitle={`${formatDateLong(today)} · ${stats.present + stats.wfh} of ${scope.length} ${
          mode === 'manager' ? 'teammates' : 'employees'
        } checked in.`}
        actions={
          <Button variant="secondary" icon="download" onClick={exportRows}>
            Export CSV
          </Button>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Attendance rate"
          value={`${stats.rate}%`}
          icon="userCheck"
          tone="green"
          trend={{ value: `${stats.present + stats.wfh}/${scope.length}`, direction: 'up' }}
          trendLabel="in today"
          sparkline={weekly.map((day) => day.rate)}
        />
        <StatCard
          label="In office"
          value={Math.max(stats.present - stats.wfh, 0)}
          icon="building"
          tone="navy"
          footnote={`${stats.late} late check-in${stats.late === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Working remotely"
          value={stats.wfh}
          icon="home"
          tone="blue"
          footnote="Approved WFH today"
        />
        <StatCard
          label="Off today"
          value={stats.onLeave + stats.absent}
          icon="calendar"
          tone="violet"
          footnote={`${stats.onLeave} on leave · ${stats.absent} unaccounted`}
          onClick={() => undefined}
        />
      </div>

      <Card>
        <CardHeader
          title="How the week is shaping up"
          subtitle="Attendance rate across recent working days"
          action={
            <div className="attendance-legend-inline">
              <span><span className="att-dot att-dot--green" /> In office</span>
              <span><span className="att-dot att-dot--blue" /> Remote</span>
            </div>
          }
        />
        <div className="chart-split">
          <div className="chart-split__chart">
            <BarChart
              data={weekly.slice(-6).map((day) => ({ label: day.label, value: day.rate }))}
              suffix="%"
              maxValue={100}
              height={170}
              ariaLabel="Attendance rate over recent working days"
            />
          </div>
          <div className="chart-split__side">
            <Donut
              segments={donutSegments}
              size={132}
              thickness={15}
              centerValue={`${stats.rate}%`}
              centerLabel="today"
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
      </Card>

      <Card flush>
        <div className="table-toolbar">
          <Tabs
            tabs={[
              { id: 'today', label: 'Today', count: scope.length },
              { id: 'leave', label: 'On leave today', count: onLeave.length },
            ]}
            active={tab}
            onChange={setTab}
            className="table-toolbar__tabs"
          />
          <div className="table-toolbar__filters">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people…"
              className="table-toolbar__search"
            />
            <SelectField
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              options={departments}
              placeholder="All departments"
              wrapClassName="filter-control"
            />
            <SelectField
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={['Present', 'Late', 'WFH', 'On leave', 'Absent', 'Not logged']}
              placeholder="All statuses"
              wrapClassName="filter-control"
            />
          </div>
        </div>
        {tab === 'today' ? (
          <DataTable
            columns={columns}
            rows={rows}
            pageSize={10}
            ariaLabel="Today's attendance"
            emptyState={
              <EmptyState
                icon="clock"
                title="No attendance records"
                description="Nobody matches these filters yet."
              />
            }
          />
        ) : (
          <div className="leave-today-list">
            {onLeave.length ? (
              onLeave.map(({ employee, leave }) => (
                <div className="leave-today" key={employee.id}>
                  <Avatar name={employee.name} src={employee.avatar} size="md" />
                  <div className="leave-today__body">
                    <p className="leave-today__name">{employee.name}</p>
                    <p className="leave-today__meta">
                      {employee.jobTitle} · {leaveTypeLabel(leave.type)}
                    </p>
                  </div>
                  <Badge tone={leave.status === 'Approved' ? 'violet' : 'amber'} dot>
                    Approved leave
                  </Badge>
                  <span className="leave-today__dates">
                    {formatDate(leave.from)} – {formatDate(leave.to)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon="calendar"
                title="Everyone is in today"
                description="No approved leave overlaps with today."
                compact
              />
            )}
          </div>
        )}
      </Card>
    </>
  );
}

export default function AttendancePage() {
  const { role } = useAuth();
  if (role === 'employee') return <EmployeeAttendance />;
  return <OrganizationAttendance mode={role} />;
}
