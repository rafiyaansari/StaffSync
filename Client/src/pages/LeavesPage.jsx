import { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import Tabs from '../components/ui/Tabs';
import { ProgressBar } from '../components/ui/Progress';
import { SearchField, SelectField } from '../components/ui/FormFields';
import LeaveRequestModal from '../components/leaves/LeaveRequestModal';
import LeaveDecisionModal from '../components/leaves/LeaveDecisionModal';
import LeaveDetailsModal from '../components/leaves/LeaveDetailsModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LEAVE_TYPES } from '../data/seed';
import { daysBetween, formatDate, formatRange, relativeTime, todayISO } from '../utils/date';
import { downloadCSV, firstName } from '../utils/format';
import {
  attendanceTone,
  leaveStatusTone,
  leaveTypeLabel,
  leaveTypeTone,
} from '../utils/ui';
import {
  employeesOnLeaveToday,
  leaveBalance,
  pendingLeaves,
  reportsOf,
} from '../utils/selectors';

/* ------------------------------------------------------------------ */
/* Employee                                                           */
/* ------------------------------------------------------------------ */

function MyLeaves() {
  const { currentEmployee, leaves } = useData();
  const [applyOpen, setApplyOpen] = useState(false);
  const [tab, setTab] = useState('All');
  const [detailLeave, setDetailLeave] = useState(null);

  const myLeaves = useMemo(
    () =>
      leaves
        .filter((leave) => leave.employeeId === currentEmployee?.id)
        .slice()
        .sort((a, b) => b.from.localeCompare(a.from)),
    [leaves, currentEmployee?.id],
  );
  const balances = leaveBalance(currentEmployee);
  const counts = {
    All: myLeaves.length,
    Pending: myLeaves.filter((leave) => leave.status === 'Pending').length,
    Approved: myLeaves.filter((leave) => leave.status === 'Approved').length,
    Rejected: myLeaves.filter((leave) => leave.status === 'Rejected').length,
    Cancelled: myLeaves.filter((leave) => leave.status === 'Cancelled').length,
  };

  const filtered = tab === 'All' ? myLeaves : myLeaves.filter((leave) => leave.status === tab);
  const upcoming = myLeaves
    .filter((leave) => leave.status === 'Approved' && leave.from >= todayISO())
    .sort((a, b) => a.from.localeCompare(b.from))[0];
  const usedDays = balances.reduce((sum, balance) => sum + balance.used, 0);

  const columns = [
    {
      key: 'type',
      label: 'Leave type',
      sortable: true,
      render: (row) => (
        <div className="leave-type-cell">
          <span className={`leave-type-cell__icon tone-${leaveTypeTone(row.type)}`}>
            <Icon name="calendar" size={14} />
          </span>
          <span>{leaveTypeLabel(row.type)}</span>
        </div>
      ),
    },
    {
      key: 'from',
      label: 'Dates',
      sortable: true,
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-stack__main">{formatRange(row.from, row.to)}</span>
          <span className="cell-stack__sub">
            {row.days || daysBetween(row.from, row.to)} day
            {(row.days || daysBetween(row.from, row.to)) === 1 ? '' : 's'}
          </span>
        </div>
      ),
    },
    {
      key: 'appliedOn',
      label: 'Applied',
      sortable: true,
      render: (row) => <span className="text-sm">{relativeTime(row.appliedOn)}</span>,
    },
    {
      key: 'reviewedBy',
      label: 'Reviewed by',
      render: (row) => <span className="text-sm">{row.reviewedBy || 'Awaiting review'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge tone={leaveStatusTone(row.status)} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          className="link-button"
          onClick={(event) => {
            event.stopPropagation();
            setDetailLeave(row);
          }}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Time off"
        title="My leaves"
        subtitle="Plan time away, track approvals and keep an eye on your balances."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setApplyOpen(true)}>
            Apply for leave
          </Button>
        }
      />

      <div className="leave-balance-grid">
        {balances.map((balance) => (
          <div className={`leave-balance-card tone-${leaveTypeTone(balance.type)}`} key={balance.type}>
            <div className="leave-balance-card__head">
              <span className="leave-balance-card__label">{leaveTypeLabel(balance.type)}</span>
              <span className="leave-balance-card__icon">
                <Icon
                  name={
                    balance.type === 'wfh'
                      ? 'home'
                      : balance.type === 'sick'
                        ? 'heart'
                        : 'calendar'
                  }
                  size={16}
                />
              </span>
            </div>
            <p className="leave-balance-card__value">
              {balance.remaining}
              <span> days left</span>
            </p>
            <ProgressBar value={balance.percent} tone={leaveTypeTone(balance.type)} size="sm" />
            <p className="leave-balance-card__meta">
              {balance.used} used · {balance.total} allocated
            </p>
          </div>
        ))}
      </div>

      <div className="leave-summary-line">
        <Icon name="sparkles" size={15} />
        <span>
          You’ve used <strong>{usedDays} days</strong> across all leave types this year.
          {upcoming
            ? ` Your next break starts ${formatDate(upcoming.from)}.`
            : ' No upcoming leave planned yet.'}
        </span>
        <button type="button" className="link-button" onClick={() => setApplyOpen(true)}>
          Plan a break <Icon name="arrowRight" size={13} />
        </button>
      </div>

      <Card flush>
        <div className="leave-table-head">
          <Tabs
            tabs={[
              { id: 'All', label: 'All', count: counts.All },
              { id: 'Pending', label: 'Pending', count: counts.Pending },
              { id: 'Approved', label: 'Approved', count: counts.Approved },
              { id: 'Rejected', label: 'Declined', count: counts.Rejected },
              { id: 'Cancelled', label: 'Withdrawn', count: counts.Cancelled },
            ]}
            active={tab}
            onChange={setTab}
            ariaLabel="Filter my leaves"
          />
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          pageSize={7}
          initialSort={{ key: 'from', direction: 'desc' }}
          onRowClick={(row) => setDetailLeave(row)}
          ariaLabel="My leave requests"
          emptyState={
            <EmptyState
              icon="calendar"
              title="No requests in this view"
              description="When you apply for leave, its status will show up here."
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setApplyOpen(true)}>
                  Apply for leave
                </Button>
              }
            />
          }
        />
      </Card>

      <LeaveRequestModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <LeaveDetailsModal leave={detailLeave} onClose={() => setDetailLeave(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* HR & manager                                                       */
/* ------------------------------------------------------------------ */

function LeaveApprovals({ mode }) {
  const { employees, leaves, currentEmployee } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [department, setDepartment] = useState('');
  const [decision, setDecision] = useState(null);
  const [detailLeave, setDetailLeave] = useState(null);

  const scope = useMemo(
    () => (mode === 'manager' ? reportsOf(employees, user?.id) : employees),
    [employees, mode, user?.id],
  );
  const scopeIds = scope.map((employee) => employee.id);
  const scopedLeaves = leaves.filter((leave) => scopeIds.includes(leave.employeeId));

  const counts = {
    Pending: scopedLeaves.filter((leave) => leave.status === 'Pending').length,
    Approved: scopedLeaves.filter((leave) => leave.status === 'Approved').length,
    Rejected: scopedLeaves.filter((leave) => leave.status === 'Rejected').length,
    All: scopedLeaves.length,
  };

  const filtered = scopedLeaves
    .filter((leave) => (tab === 'All' ? true : leave.status === tab))
    .filter((leave) => {
      const term = search.trim().toLowerCase();
      return (
        (!term ||
          leave.employeeName.toLowerCase().includes(term) ||
          leave.department.toLowerCase().includes(term)) &&
        (!type || leave.type === type) &&
        (!department || leave.department === department)
      );
    })
    .sort((a, b) =>
      tab === 'Pending' ? a.appliedOn.localeCompare(b.appliedOn) : b.from.localeCompare(a.from),
    );

  const onLeaveToday = employeesOnLeaveToday(scopedLeaves.length ? leaves : leaves, employees).filter(
    (entry) => scopeIds.includes(entry.employee.id),
  );
  const approvedThisMonth = scopedLeaves.filter(
    (leave) => leave.status === 'Approved' && leave.reviewedOn?.startsWith(todayISO().slice(0, 7)),
  ).length;
  const departments = [...new Set(scope.map((employee) => employee.department))];
  const oldest = scopedLeaves
    .filter((leave) => leave.status === 'Pending')
    .sort((a, b) => a.appliedOn.localeCompare(b.appliedOn))[0];

  const exportRows = () =>
    downloadCSV(
      'staffsync-leaves.csv',
      filtered.map((leave) => ({
        ID: leave.id,
        Employee: leave.employeeName,
        Department: leave.department,
        Type: leaveTypeLabel(leave.type),
        From: leave.from,
        To: leave.to,
        Status: leave.status,
        Applied: leave.appliedOn,
        'Reviewed by': leave.reviewedBy || '',
        Note: leave.note || '',
      })),
    );

  const columns = [
    {
      key: 'employeeName',
      label: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="cell-person">
          <Avatar name={row.employeeName} size="sm" />
          <div className="cell-person__text">
            <span className="cell-person__name">{row.employeeName}</span>
            <span className="cell-person__meta">{row.jobTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => <Badge tone={leaveTypeTone(row.type)}>{leaveTypeLabel(row.type)}</Badge>,
    },
    {
      key: 'from',
      label: 'Dates',
      sortable: true,
      render: (row) => (
        <div className="cell-stack">
          <span className="cell-stack__main">{formatRange(row.from, row.to)}</span>
          <span className="cell-stack__sub">
            {row.days || daysBetween(row.from, row.to)} day
            {(row.days || daysBetween(row.from, row.to)) === 1 ? '' : 's'} · {row.department}
          </span>
        </div>
      ),
    },
    {
      key: 'appliedOn',
      label: 'Applied',
      sortable: true,
      render: (row) => (
        <span className="text-sm" title={formatDate(row.appliedOn)}>
          {relativeTime(row.appliedOn)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge tone={leaveStatusTone(row.status)} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: '',
      align: 'right',
      render: (row) =>
        row.status === 'Pending' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              setDecision(row);
            }}
          >
            Review
          </Button>
        ) : (
          <button
            type="button"
            className="link-button"
            onClick={(event) => {
              event.stopPropagation();
              setDetailLeave(row);
            }}
          >
            Details
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title={mode === 'manager' ? 'Team approvals' : 'Leave management'}
        subtitle={
          mode === 'manager'
            ? 'Review time-off requests from your direct team.'
            : 'Every leave request across Nimbus Labs — approve, decline and keep balances accurate.'
        }
        actions={
          <Button variant="secondary" icon="download" onClick={exportRows}>
            Export CSV
          </Button>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Pending requests"
          value={counts.Pending}
          icon="clock"
          tone="amber"
          footnote={
            oldest
              ? `Oldest submitted ${relativeTime(oldest.appliedOn)}`
              : 'Nothing waiting for review'
          }
        />
        <StatCard
          label="Approved this month"
          value={approvedThisMonth}
          icon="checkCircle"
          tone="green"
          footnote={`${counts.Approved} approved all time`}
        />
        <StatCard
          label="On leave today"
          value={onLeaveToday.length}
          icon="calendar"
          tone="violet"
          footnote={
            onLeaveToday.length
              ? onLeaveToday.map((entry) => firstName(entry.employee.name)).slice(0, 3).join(', ')
              : 'Full team in'
          }
        />
        <StatCard
          label="Declined"
          value={counts.Rejected}
          icon="xCircle"
          tone="rose"
          footnote="All time"
        />
      </div>

      <Card flush>
        <div className="leave-table-head leave-table-head--approvals">
          <Tabs
            tabs={[
              { id: 'Pending', label: 'Pending', count: counts.Pending },
              { id: 'Approved', label: 'Approved', count: counts.Approved },
              { id: 'Rejected', label: 'Declined', count: counts.Rejected },
              { id: 'All', label: 'All requests', count: counts.All },
            ]}
            active={tab}
            onChange={setTab}
            ariaLabel="Filter leave requests"
          />
          <div className="leave-table-filters">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people…"
              className="leave-table-filters__search"
            />
            <SelectField
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={Object.entries(LEAVE_TYPES).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
              placeholder="All leave types"
              wrapClassName="filter-control"
            />
            {mode === 'hr' ? (
              <SelectField
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                options={departments}
                placeholder="All departments"
                wrapClassName="filter-control"
              />
            ) : null}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          pageSize={8}
          initialSort={tab === 'Pending' ? { key: 'appliedOn', direction: 'asc' } : { key: 'from', direction: 'desc' }}
          ariaLabel="Leave requests"
          emptyState={
            <EmptyState
              icon={tab === 'Pending' ? 'checkCircle' : 'calendar'}
              title={tab === 'Pending' ? 'No requests waiting' : 'Nothing in this view'}
              description={
                tab === 'Pending'
                  ? 'When your team requests time off, it lands here for review.'
                  : 'Try another tab or clear the filters.'
              }
            />
          }
        />
      </Card>

      <div className="leave-policy-note">
        <Icon name="shield" size={15} />
        <span>
          Leave decisions are final in this workspace and notify the employee. Annual balances update
          automatically when a request is approved.
        </span>
        {mode === 'hr' ? (
          <span className="leave-policy-note__owner">Policy owner: {currentEmployee?.name}</span>
        ) : null}
      </div>

      <LeaveDecisionModal request={decision} onClose={() => setDecision(null)} />
      <LeaveDetailsModal leave={detailLeave} onClose={() => setDetailLeave(null)} />
    </>
  );
}

export default function LeavesPage() {
  const { role } = useAuth();
  if (role === 'employee') return <MyLeaves />;
  return <LeaveApprovals mode={role} />;
}
