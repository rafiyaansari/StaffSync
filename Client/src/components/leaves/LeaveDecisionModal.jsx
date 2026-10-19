import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';
import { TextareaField } from '../ui/FormFields';
import { useData } from '../../context/DataContext';
import { daysBetween, formatRange, relativeTime } from '../../utils/date';
import { leaveStatusTone, leaveTypeLabel, leaveTypeTone } from '../../utils/ui';

export default function LeaveDecisionModal({ request, onClose }) {
  const { employees, decideLeave } = useData();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setNote('');
    setError('');
    setLoading(null);
  }, [request?.id]);

  if (!request) return null;

  const employee = employees.find((item) => item.id === request.employeeId);
  const days = request.days || daysBetween(request.from, request.to);

  const submit = async (status) => {
    setLoading(status);
    setError('');
    try {
      await decideLeave({ id: request.id, status, note });
      onClose?.();
    } catch (decisionError) {
      setError(decisionError.message || 'The decision could not be saved.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title="Review leave request"
      subtitle={`Request ${request.id} · submitted ${relativeTime(request.appliedOn)}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={Boolean(loading)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon="x"
            onClick={() => submit('Rejected')}
            loading={loading === 'Rejected'}
            disabled={loading === 'Approved'}
          >
            Decline
          </Button>
          <Button
            variant="primary"
            icon="check"
            onClick={() => submit('Approved')}
            loading={loading === 'Approved'}
            disabled={loading === 'Rejected'}
          >
            Approve
          </Button>
        </>
      }
    >
      <div className="decision">
        <div className="decision__person">
          <Avatar name={employee?.name || request.employeeName} src={employee?.avatar} size="lg" />
          <div className="decision__person-text">
            <p className="decision__name">{employee?.name || request.employeeName}</p>
            <p className="decision__meta">
              {employee?.jobTitle || request.jobTitle} · {employee?.department || request.department}
            </p>
          </div>
          <Badge tone={leaveStatusTone(request.status)} dot>
            {request.status}
          </Badge>
        </div>

        <div className="decision__grid">
          <div className="decision__field">
            <span className="decision__label">Leave type</span>
            <Badge tone={leaveTypeTone(request.type)}>{leaveTypeLabel(request.type)}</Badge>
          </div>
          <div className="decision__field">
            <span className="decision__label">Duration</span>
            <span className="decision__value">
              {days} day{days === 1 ? '' : 's'}
            </span>
          </div>
          <div className="decision__field">
            <span className="decision__label">Dates</span>
            <span className="decision__value">{formatRange(request.from, request.to)}</span>
          </div>
          <div className="decision__field">
            <span className="decision__label">Applied on</span>
            <span className="decision__value">{formatRange(request.appliedOn)}</span>
          </div>
        </div>

        <div className="decision__note-block">
          <span className="decision__label">Reason</span>
          <p className="decision__reason">{request.reason || 'No reason provided.'}</p>
          {request.handover ? (
            <>
              <span className="decision__label" style={{ marginTop: 12 }}>
                Handover plan
              </span>
              <p className="decision__reason">{request.handover}</p>
            </>
          ) : null}
        </div>

        {error ? (
          <div className="inline-alert inline-alert--danger">
            <Icon name="alertCircle" size={15} /> {error}
          </div>
        ) : null}

        <TextareaField
          label="Note to the employee (optional)"
          placeholder="Add context for your decision — they’ll see this in their notifications."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}
