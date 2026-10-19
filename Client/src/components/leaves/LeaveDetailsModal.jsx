import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icon';
import { useData } from '../../context/DataContext';
import { daysBetween, formatDate, formatRange, relativeTime } from '../../utils/date';
import { leaveStatusTone, leaveTypeLabel, leaveTypeTone } from '../../utils/ui';

const STATUS_ICON = {
  Pending: 'clock',
  Approved: 'checkCircle',
  Rejected: 'xCircle',
  Cancelled: 'minus',
};

export default function LeaveDetailsModal({ leave, onClose, showEmployee = false }) {
  const { cancelLeave } = useData();
  const [loading, setLoading] = useState(false);
  if (!leave) return null;

  const days = leave.days || daysBetween(leave.from, leave.to);

  const withdraw = async () => {
    setLoading(true);
    try {
      await cancelLeave(leave.id);
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={Boolean(leave)}
      onClose={onClose}
      title="Leave request"
      subtitle={`${leave.id} · applied ${relativeTime(leave.appliedOn)}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {leave.status === 'Pending' ? (
            <Button variant="danger" icon="x" onClick={withdraw} loading={loading}>
              Withdraw request
            </Button>
          ) : null}
        </>
      }
    >
      <div className="leave-detail">
        <div className={`leave-detail__banner leave-detail__banner--${leaveStatusTone(leave.status)}`}>
          <span className="leave-detail__banner-icon">
            <Icon name={STATUS_ICON[leave.status] || 'clock'} size={20} />
          </span>
          <div>
            <p className="leave-detail__banner-title">{leave.status}</p>
            <p className="leave-detail__banner-text">
              {leave.status === 'Approved'
                ? `Approved by ${leave.reviewedBy || 'your manager'}${leave.reviewedOn ? ` on ${formatDate(leave.reviewedOn)}` : ''}.`
                : leave.status === 'Rejected'
                  ? `Declined by ${leave.reviewedBy || 'HR'}${leave.reviewedOn ? ` on ${formatDate(leave.reviewedOn)}` : ''}.`
                  : leave.status === 'Cancelled'
                    ? 'This request was withdrawn.'
                    : 'Waiting for your manager and HR to review.'}
            </p>
          </div>
        </div>

        {showEmployee && leave.employeeName ? (
          <div className="decision__person">
            <Avatar name={leave.employeeName} size="md" />
            <div className="decision__person-text">
              <p className="decision__name">{leave.employeeName}</p>
              <p className="decision__meta">
                {leave.jobTitle || 'Team member'} · {leave.department}
              </p>
            </div>
          </div>
        ) : null}

        <div className="decision__grid">
          <div className="decision__field">
            <span className="decision__label">Leave type</span>
            <Badge tone={leaveTypeTone(leave.type)}>{leaveTypeLabel(leave.type)}</Badge>
          </div>
          <div className="decision__field">
            <span className="decision__label">Duration</span>
            <span className="decision__value">
              {days} day{days === 1 ? '' : 's'}
            </span>
          </div>
          <div className="decision__field">
            <span className="decision__label">Dates</span>
            <span className="decision__value">{formatRange(leave.from, leave.to)}</span>
          </div>
          <div className="decision__field">
            <span className="decision__label">Status</span>
            <span className="decision__value">{leave.status}</span>
          </div>
        </div>

        <div className="decision__note-block">
          <span className="decision__label">Reason</span>
          <p className="decision__reason">{leave.reason || 'No reason provided.'}</p>
          {leave.handover ? (
            <>
              <span className="decision__label" style={{ marginTop: 12 }}>
                Handover plan
              </span>
              <p className="decision__reason">{leave.handover}</p>
            </>
          ) : null}
          {leave.note ? (
            <>
              <span className="decision__label" style={{ marginTop: 12 }}>
                Note from {leave.reviewedBy || 'HR'}
              </span>
              <p className="decision__reason">{leave.note}</p>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
