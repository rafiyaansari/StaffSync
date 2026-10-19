import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SearchField } from '../components/ui/FormFields';
import { useData } from '../context/DataContext';
import { formatDate, relativeTime } from '../utils/date';

export default function RegistrationsPage() {
  const { registrations, decideRegistration } = useData();
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);

  const counts = useMemo(
    () => ({
      Pending: registrations.filter((request) => request.status === 'Pending').length,
      Approved: registrations.filter((request) => request.status === 'Approved').length,
      Rejected: registrations.filter((request) => request.status === 'Rejected').length,
      All: registrations.length,
    }),
    [registrations],
  );

  const filtered = registrations.filter((request) => {
    const matchesTab = tab === 'All' || request.status === tab;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      `${request.firstName} ${request.lastName}`.toLowerCase().includes(term) ||
      request.email.toLowerCase().includes(term) ||
      request.department.toLowerCase().includes(term);
    return matchesTab && matchesSearch;
  });

  const confirmDecision = async () => {
    if (!decision) return;
    setLoading(true);
    try {
      await decideRegistration({
        id: decision.request.id,
        status: decision.status,
        note: '',
      });
      setDecision(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Registrations"
        subtitle="Review employees who registered themselves. Approving activates their account and adds them to the directory."
        actions={
          <Link to="/employees" className="btn btn--secondary">
            <Icon name="users" size={16} />
            People directory
          </Link>
        }
      />

      <div className="stats-grid stats-grid--three">
        <StatCard
          label="Awaiting review"
          value={counts.Pending}
          icon="clipboard"
          tone="amber"
          footnote="Usually reviewed within a day"
        />
        <StatCard
          label="Approved"
          value={counts.Approved}
          icon="userCheck"
          tone="green"
          footnote="Accounts activated"
        />
        <StatCard
          label="Declined"
          value={counts.Rejected}
          icon="userX"
          tone="rose"
          footnote="No account was created"
        />
      </div>

      <div className="filter-bar">
        <Tabs
          tabs={[
            { id: 'Pending', label: 'Pending', count: counts.Pending },
            { id: 'Approved', label: 'Approved', count: counts.Approved },
            { id: 'Rejected', label: 'Declined', count: counts.Rejected },
            { id: 'All', label: 'All', count: counts.All },
          ]}
          active={tab}
          onChange={setTab}
          className="filter-bar__tabs"
          ariaLabel="Registration status"
        />
        <div className="filter-bar__spacer" />
        <SearchField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search registrations…"
          className="filter-bar__search"
        />
      </div>

      {filtered.length ? (
        <div className="registration-grid">
          {filtered.map((request) => {
            const name = `${request.firstName} ${request.lastName}`;
            return (
              <article className="registration-card" key={request.id}>
                <div className="registration-card__header">
                  <Avatar name={name} size="lg" />
                  <div className="registration-card__identity">
                    <h3 className="registration-card__name">{name}</h3>
                    <p className="registration-card__email">{request.email}</p>
                    <p className="registration-card__applied">
                      Applied {relativeTime(request.appliedOn)} · {request.id}
                    </p>
                  </div>
                  <Badge
                    tone={
                      request.status === 'Approved'
                        ? 'green'
                        : request.status === 'Rejected'
                          ? 'red'
                          : 'amber'
                    }
                    dot
                  >
                    {request.status === 'Rejected' ? 'Declined' : request.status}
                  </Badge>
                </div>

                <div className="registration-card__details">
                  <div>
                    <span>Role applied for</span>
                    <strong>{request.jobTitle}</strong>
                  </div>
                  <div>
                    <span>Department</span>
                    <strong>{request.department}</strong>
                  </div>
                  <div>
                    <span>Employment</span>
                    <strong>{request.employmentType}</strong>
                  </div>
                  <div>
                    <span>Location</span>
                    <strong>{request.location}</strong>
                  </div>
                </div>

                {request.note ? (
                  <p className="registration-card__note">
                    <Icon name="fileText" size={14} />
                    {request.note}
                  </p>
                ) : null}

                {request.status === 'Pending' ? (
                  <div className="registration-card__actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="x"
                      onClick={() => setDecision({ request, status: 'Rejected' })}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="check"
                      onClick={() => setDecision({ request, status: 'Approved' })}
                    >
                      Approve registration
                    </Button>
                  </div>
                ) : (
                  <div className="registration-card__history">
                    <Icon
                      name={request.status === 'Approved' ? 'checkCircle' : 'xCircle'}
                      size={15}
                    />
                    <span>
                      {request.status === 'Approved'
                        ? `Approved by ${request.reviewedBy || 'HR'} · ${formatDate(request.reviewedOn)}`
                        : `Declined by ${request.reviewedBy || 'HR'} · ${formatDate(request.reviewedOn)}`}
                    </span>
                    {request.employeeId ? (
                      <Link to={`/employees?focus=${request.employeeId}`} className="link-button">
                        View profile
                      </Link>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface">
          <EmptyState
            icon={tab === 'Pending' ? 'checkCircle' : 'inbox'}
            title={tab === 'Pending' ? 'No registrations waiting' : 'Nothing here yet'}
            description={
              tab === 'Pending'
                ? 'New registration requests will appear here. Share the registration link with new joiners.'
                : 'Try a different tab or clear the search.'
            }
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
        loading={loading}
        tone={decision?.status === 'Rejected' ? 'danger' : 'primary'}
        icon={decision?.status === 'Approved' ? 'userCheck' : 'userX'}
        title={
          decision?.status === 'Approved'
            ? `Approve ${decision?.request.firstName}?`
            : `Decline ${decision?.request.firstName}’s registration?`
        }
        description={
          decision?.status === 'Approved'
            ? 'Their account will activate immediately and they can sign in with the password they chose. They’ll be added to the employee directory as Probation.'
            : 'They won’t be able to sign in. You can ask them to register again later.'
        }
        confirmLabel={decision?.status === 'Approved' ? 'Approve & activate' : 'Decline request'}
      />
    </>
  );
}
