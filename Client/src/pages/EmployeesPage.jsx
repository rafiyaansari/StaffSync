import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchField, SelectField } from '../components/ui/FormFields';
import { ProgressBar } from '../components/ui/Progress';
import EmployeeFormModal from '../components/employees/EmployeeFormModal';
import EmployeeDrawer from '../components/employees/EmployeeDrawer';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../data/seed';
import { formatDate } from '../utils/date';
import { downloadCSV } from '../utils/format';
import { attendanceTone, employeeStatusTone } from '../utils/ui';
import {
  employeesOnLeaveToday,
  leaveBalance,
  reportsOf,
  todayStatusFor,
} from '../utils/selectors';
import { ROLE_LABELS } from '../config/navigation';

export default function EmployeesPage({ mode = 'hr' }) {
  const { employees, leaves, attendance, trainings, registrations, removeEmployee } = useData();
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const isTeam = mode === 'team';

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [formState, setFormState] = useState({ open: false, employee: null });
  const [drawerId, setDrawerId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const team = useMemo(
    () => (isTeam ? employees.filter((employee) => employee.managerId === user?.id) : employees),
    [employees, isTeam, user?.id],
  );
  const people = isTeam ? team : employees;

  useEffect(() => {
    const focus = params.get('focus');
    if (focus) setDrawerId(focus);
  }, [params]);

  const closeDrawer = () => {
    setDrawerId(null);
    if (params.get('focus')) {
      const next = new URLSearchParams(params);
      next.delete('focus');
      setParams(next, { replace: true });
    }
  };

  const onLeaveToday = employeesOnLeaveToday(leaves, employees);

  const derivedStatus = (employee) => {
    if (employee.status === 'Inactive') return 'Inactive';
    if (onLeaveToday.some((entry) => entry.employee.id === employee.id)) return 'On leave';
    return employee.status;
  };

  const filtered = useMemo(
    () =>
      people.filter((employee) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          employee.name.toLowerCase().includes(term) ||
          employee.email.toLowerCase().includes(term) ||
          employee.jobTitle.toLowerCase().includes(term) ||
          employee.department.toLowerCase().includes(term);
        const matchesDepartment = !department || employee.department === department;
        const matchesStatus = !status || derivedStatus(employee) === status;
        return matchesSearch && matchesDepartment && matchesStatus;
      }),
    [people, search, department, status, onLeaveToday],
  );

  const pendingRegistrations = registrations.filter((request) => request.status === 'Pending');
  const activeFilters = Boolean(search || department || status);
  const departmentsInScope = [...new Set(people.map((employee) => employee.department))];

  const exportRows = () => {
    downloadCSV(
      'staffsync-employees.csv',
      filtered.map((employee) => ({
        'Employee ID': employee.id,
        Name: employee.name,
        Email: employee.email,
        Department: employee.department,
        'Job title': employee.jobTitle,
        Manager: employee.managerName,
        'Employment type': employee.employmentType,
        Location: employee.location,
        'Joined on': employee.joinDate,
        Status: derivedStatus(employee),
      })),
    );
  };

  const columns = isTeam
    ? [
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
          key: 'status',
          label: 'Today',
          render: (row) => {
            const record = todayStatusFor(row.id, attendance, leaves);
            return (
              <div className="cell-stack">
                <Badge tone={attendanceTone(record?.status || 'Not logged')} dot>
                  {record?.status || 'Not logged'}
                </Badge>
                {record?.checkIn ? <span className="cell-stack__sub">in at {record.checkIn}</span> : null}
              </div>
            );
          },
        },
        {
          key: 'leave',
          label: 'Annual leave',
          render: (row) => {
            const annual = leaveBalance(row).find((balance) => balance.type === 'annual');
            return (
              <div className="cell-stack">
                <span className="cell-stack__main">{annual.remaining} days left</span>
                <span className="cell-stack__sub">{annual.used} used</span>
              </div>
            );
          },
        },
        {
          key: 'training',
          label: 'Learning',
          render: (row) => {
            const entries = trainings
              .map((course) => course.enrolled.find((entry) => entry.employeeId === row.id))
              .filter(Boolean);
            if (!entries.length) return <span className="text-faint">Not enrolled</span>;
            const average = Math.round(entries.reduce((sum, entry) => sum + entry.progress, 0) / entries.length);
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
                setDrawerId(row.id);
              }}
            >
              <Icon name="arrowUpRight" size={15} />
            </button>
          ),
        },
      ]
    : [
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
          key: 'role',
          label: 'Access',
          render: (row) => <Badge tone="outline">{ROLE_LABELS[row.systemRole] || 'Employee'}</Badge>,
        },
        {
          key: 'managerName',
          label: 'Manager',
          sortable: true,
          render: (row) => <span className="text-sm">{row.managerName}</span>,
        },
        {
          key: 'joinDate',
          label: 'Joined',
          sortable: true,
          render: (row) => <span className="nowrap text-sm">{formatDate(row.joinDate)}</span>,
        },
        {
          key: 'status',
          label: 'Status',
          sortable: true,
          sortValue: (row) => derivedStatus(row),
          render: (row) => (
            <Badge tone={employeeStatusTone(derivedStatus(row))} dot>
              {derivedStatus(row)}
            </Badge>
          ),
        },
        {
          key: 'actions',
          label: '',
          align: 'right',
          render: (row) => (
            <div className="row-actions" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="row-action"
                aria-label={`Edit ${row.name}`}
                onClick={() => setFormState({ open: true, employee: row })}
              >
                <Icon name="edit" size={15} />
              </button>
              <button
                type="button"
                className="row-action row-action--danger"
                aria-label={`Remove ${row.name}`}
                onClick={() => setDeleteTarget(row)}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ),
        },
      ];

  const selectedEmployee = employees.find((employee) => employee.id === drawerId) || null;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeEmployee(deleteTarget.id);
      if (drawerId === deleteTarget.id) closeDrawer();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={isTeam ? 'People leadership' : 'People'}
        title={isTeam ? 'Your team' : 'Employees'}
        subtitle={
          isTeam
            ? `The ${team.length} people who report to you — availability, balances and learning.`
            : `${people.length} people across ${departmentsInScope.length} departments. Manage profiles, access and status.`
        }
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportRows}>
              Export CSV
            </Button>
            {!isTeam ? (
              <Button
                variant="primary"
                icon="userPlus"
                onClick={() => setFormState({ open: true, employee: null })}
              >
                Add employee
              </Button>
            ) : (
              <Link to="/training" className="btn btn--primary">
                <Icon name="graduation" size={16} />
                Training
              </Link>
            )}
          </>
        }
      />

      {!isTeam && pendingRegistrations.length ? (
        <div className="inline-banner">
          <span className="inline-banner__icon">
            <Icon name="userPlus" size={18} />
          </span>
          <div className="inline-banner__text">
            <p>
              {pendingRegistrations.length} registration
              {pendingRegistrations.length === 1 ? '' : 's'} waiting for review
            </p>
            <span>Approve new teammates to activate their accounts.</span>
          </div>
          <Link to="/employees/requests" className="btn btn--secondary btn--sm">
            Review requests
          </Link>
        </div>
      ) : null}

      <Card flush>
        <div className="table-toolbar">
          <div className="table-toolbar__search">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, role…"
            />
          </div>
          <div className="table-toolbar__filters">
            <SelectField
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              options={departmentsInScope}
              placeholder="All departments"
              wrapClassName="filter-control"
            />
            <SelectField
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={['Active', 'Probation', 'On leave', 'Inactive']}
              placeholder="All statuses"
              wrapClassName="filter-control"
            />
            {activeFilters ? (
              <button
                type="button"
                className="link-button table-toolbar__clear"
                onClick={() => {
                  setSearch('');
                  setDepartment('');
                  setStatus('');
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <span className="table-toolbar__count">
            {filtered.length} of {people.length}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          pageSize={9}
          initialSort={{ key: 'name', direction: 'asc' }}
          onRowClick={(row) => setDrawerId(row.id)}
          ariaLabel={isTeam ? 'Team directory' : 'Employee directory'}
          emptyState={
            <EmptyState
              icon="search"
              title="No people match those filters"
              description="Try a different department, status or search term."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setDepartment('');
                    setStatus('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          }
        />
      </Card>

      {isTeam ? (
        <div className="team-footnote">
          <Icon name="info" size={14} />
          Team changes — transfers, promotions and new joiners — are managed by the People team.
        </div>
      ) : null}

      <EmployeeFormModal
        open={formState.open}
        employee={formState.employee}
        onClose={() => setFormState({ open: false, employee: null })}
      />

      <EmployeeDrawer
        employeeId={drawerId}
        open={Boolean(selectedEmployee)}
        onClose={closeDrawer}
        canEdit={!isTeam}
        onEdit={(employee) => {
          closeDrawer();
          setFormState({ open: true, employee });
        }}
        onRemove={(employee) => setDeleteTarget(employee)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Remove ${deleteTarget?.name || 'this employee'}?`}
        description="This deactivates their account and removes their leave and attendance records from this workspace. This can’t be undone."
        confirmLabel="Remove employee"
      />
    </>
  );
}
