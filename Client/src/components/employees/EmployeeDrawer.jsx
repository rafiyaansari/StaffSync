import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';
import { ProgressBar } from '../ui/Progress';
import { useData } from '../../context/DataContext';
import { formatDate, relativeTime, todayISO } from '../../utils/date';
import {
  employeeStatusTone,
  leaveStatusTone,
  leaveTypeLabel,
  leaveTypeTone,
} from '../../utils/ui';
import { employeesOnLeaveToday, leaveBalance } from '../../utils/selectors';
import { ROLE_LABELS } from '../../config/navigation';

export default function EmployeeDrawer({ employeeId, open, onClose, onEdit, onRemove, canEdit = false }) {
  const { employees, leaves } = useData();
  const employee = employees.find((item) => item.id === employeeId);
  if (!employee) return null;

  const onLeave = employeesOnLeaveToday(leaves, employees).some(
    (entry) => entry.employee.id === employee.id,
  );
  const status = employee.status === 'Inactive' ? 'Inactive' : onLeave ? 'On leave' : employee.status;
  const balances = leaveBalance(employee);
  const recentLeaves = leaves
    .filter((leave) => leave.employeeId === employee.id)
    .slice()
    .sort((a, b) => b.from.localeCompare(a.from))
    .slice(0, 3);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Employee profile"
      subtitle={`${employee.employeeCode || employee.id} · joined ${formatDate(employee.joinDate)}`}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canEdit ? (
            <>
              {onRemove ? (
                <Button variant="ghost" icon="trash" className="btn--danger-text" onClick={() => onRemove(employee)}>
                  Remove
                </Button>
              ) : null}
              <Button variant="primary" icon="edit" onClick={() => onEdit(employee)}>
                Edit profile
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="emp-detail">
        <div className="emp-detail__hero">
          <div className="emp-detail__hero-band" />
          <div className="emp-detail__hero-body">
            <Avatar name={employee.name} src={employee.avatar} size="xl" ring />
            <div className="emp-detail__identity">
              <h2 className="emp-detail__name">{employee.name}</h2>
              <p className="emp-detail__role">
                {employee.jobTitle} · {employee.department}
              </p>
              <div className="emp-detail__badges">
                <Badge tone={employeeStatusTone(status)} dot>
                  {status}
                </Badge>
                <Badge tone="outline">{ROLE_LABELS[employee.systemRole] || 'Employee'}</Badge>
                <Badge tone="neutral">{employee.employmentType}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="emp-detail__actions">
          <a className="emp-detail__quick" href={`mailto:${employee.email}`}>
            <span className="icon-tile icon-tile--sm tone-blue">
              <Icon name="mail" size={15} />
            </span>
            <span>
              <strong>Email</strong>
              <span>{employee.email}</span>
            </span>
          </a>
          <a className="emp-detail__quick" href={`tel:${employee.phone}`}>
            <span className="icon-tile icon-tile--sm tone-teal">
              <Icon name="phone" size={15} />
            </span>
            <span>
              <strong>Phone</strong>
              <span>{employee.phone || 'Not added'}</span>
            </span>
          </a>
        </div>

        <section className="emp-detail__section">
          <h3 className="emp-detail__section-title">Employment</h3>
          <dl className="detail-grid">
            <div>
              <dt>Department</dt>
              <dd>{employee.department}</dd>
            </div>
            <div>
              <dt>Reports to</dt>
              <dd>{employee.managerName || '—'}</dd>
            </div>
            <div>
              <dt>Work mode</dt>
              <dd>{employee.workMode}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{employee.location}</dd>
            </div>
            <div>
              <dt>Joining date</dt>
              <dd>{formatDate(employee.joinDate)}</dd>
            </div>
            <div>
              <dt>Employment type</dt>
              <dd>{employee.employmentType}</dd>
            </div>
          </dl>
        </section>

        <section className="emp-detail__section">
          <h3 className="emp-detail__section-title">Leave balance</h3>
          <div className="mini-balances">
            {balances.map((balance) => (
              <div className="mini-balance" key={balance.type}>
                <div className="mini-balance__top">
                  <span>{leaveTypeLabel(balance.type)}</span>
                  <strong>{balance.remaining}</strong>
                </div>
                <ProgressBar value={balance.percent} tone={leaveTypeTone(balance.type)} size="sm" />
                <span className="mini-balance__meta">
                  {balance.used} of {balance.total} used
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="emp-detail__section">
          <h3 className="emp-detail__section-title">Recent leave</h3>
          {recentLeaves.length ? (
            <div className="emp-detail__leaves">
              {recentLeaves.map((leave) => (
                <div className="emp-detail__leave" key={leave.id}>
                  <span className={`emp-detail__leave-bar tone-${leaveTypeTone(leave.type)}`} />
                  <div>
                    <p className="emp-detail__leave-title">
                      {leaveTypeLabel(leave.type)}
                      <span> · {formatDate(leave.from)}</span>
                    </p>
                    <p className="emp-detail__leave-meta">
                      {leave.status} · applied {relativeTime(leave.appliedOn)}
                    </p>
                  </div>
                  <Badge tone={leaveStatusTone(leave.status)} size="sm">
                    {leave.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-line">No leave requests yet.</p>
          )}
        </section>

        <section className="emp-detail__section">
          <h3 className="emp-detail__section-title">Contact & emergency</h3>
          <dl className="detail-grid">
            <div>
              <dt>Personal email</dt>
              <dd>{employee.email}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{employee.dob ? formatDate(employee.dob) : '—'}</dd>
            </div>
            <div>
              <dt>Emergency contact</dt>
              <dd>{employee.emergency?.name || 'Not added'}</dd>
            </div>
            <div>
              <dt>Emergency phone</dt>
              <dd>{employee.emergency?.phone || 'Not added'}</dd>
            </div>
            <div className="detail-grid__span-2">
              <dt>Address</dt>
              <dd>{employee.address || 'Not added'}</dd>
            </div>
          </dl>
        </section>

        {employee.skills?.length ? (
          <section className="emp-detail__section">
            <h3 className="emp-detail__section-title">Skills</h3>
            <div className="chip-list">
              {employee.skills.map((skill) => (
                <span className="chip" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {employee.bio ? (
          <section className="emp-detail__section">
            <h3 className="emp-detail__section-title">About</h3>
            <p className="emp-detail__bio">{employee.bio}</p>
          </section>
        ) : null}
        <p className="emp-detail__stamp">Snapshot as of {formatDate(todayISO())}</p>
      </div>
    </Drawer>
  );
}
