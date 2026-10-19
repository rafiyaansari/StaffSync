import { useMemo, useState } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { SelectField, TextField, TextareaField } from '../ui/FormFields';
import { useData } from '../../context/DataContext';
import { LEAVE_TYPES } from '../../data/seed';
import { leaveBalance } from '../../utils/selectors';
import { daysBetween, todayISO } from '../../utils/date';
import { leaveTypeTone } from '../../utils/ui';
import Badge from '../ui/Badge';

const TYPE_OPTIONS = Object.entries(LEAVE_TYPES).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export default function LeaveRequestForm({ employee, compact = false, onDone }) {
  const { applyLeave } = useData();
  const balances = useMemo(() => leaveBalance(employee), [employee]);
  const [form, setForm] = useState({
    type: 'annual',
    from: '',
    to: '',
    reason: '',
    handover: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const today = todayISO();
  const days = form.from && form.to && form.to >= form.from ? daysBetween(form.from, form.to) : 0;
  const balance = balances.find((item) => item.type === form.type);
  const remaining = balance?.remaining ?? 0;

  const setField = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.from) next.from = 'Pick a start date.';
    if (!form.to) next.to = 'Pick an end date.';
    if (form.from && form.to && form.to < form.from) next.to = 'End date must be after the start date.';
    if (form.from && form.from < today) next.from = 'Start date can’t be in the past.';
    if (!form.reason.trim()) next.reason = 'Add a short reason for your manager.';
    else if (form.reason.trim().length < 8) next.reason = 'Please add a little more detail.';
    if (form.type !== 'unpaid' && days > remaining) {
      next.form = `You only have ${remaining} ${form.type === 'wfh' ? 'remote' : form.type} day${remaining === 1 ? '' : 's'} left in this balance.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await applyLeave({
        type: form.type,
        from: form.from,
        to: form.to,
        reason: form.reason,
        handover: form.handover,
      });
      setForm({ type: 'annual', from: '', to: '', reason: '', handover: '' });
      onDone?.();
    } catch (error) {
      setErrors({ form: error.message || 'The request could not be submitted.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={`leave-form ${compact ? 'leave-form--compact' : ''}`.trim()} onSubmit={submit} noValidate>
      {errors.form ? (
        <div className="inline-alert inline-alert--danger" role="alert">
          <Icon name="alertCircle" size={15} />
          <span>{errors.form}</span>
        </div>
      ) : null}

      <div className="leave-form__type-row">
        <SelectField
          label="Leave type"
          value={form.type}
          onChange={setField('type')}
          options={TYPE_OPTIONS}
        />
        <div className="leave-form__balance">
          <span className="leave-form__balance-label">Available</span>
          <Badge tone={leaveTypeTone(form.type)} size="sm">
            {form.type === 'unpaid' ? 'Unlimited' : `${remaining} day${remaining === 1 ? '' : 's'}`}
          </Badge>
        </div>
      </div>

      <div className="leave-form__dates">
        <TextField
          label="From"
          type="date"
          value={form.from}
          onChange={setField('from')}
          min={today}
          error={errors.from}
          required
        />
        <TextField
          label="To"
          type="date"
          value={form.to}
          onChange={setField('to')}
          min={form.from || today}
          error={errors.to}
          required
        />
      </div>

      {days > 0 ? (
        <p className="leave-form__days">
          <Icon name="calendar" size={13} />
          <strong>{days}</strong> calendar day{days === 1 ? '' : 's'} requested
        </p>
      ) : null}

      <TextareaField
        label="Reason"
        placeholder="A short note for your manager and HR…"
        value={form.reason}
        onChange={setField('reason')}
        error={errors.reason}
        rows={compact ? 3 : 4}
        required
      />

      {!compact ? (
        <TextareaField
          label="Handover plan (optional)"
          placeholder="Who is covering your work while you’re away?"
          value={form.handover}
          onChange={setField('handover')}
          rows={3}
        />
      ) : null}

      <Button type="submit" variant="primary" icon="send" loading={loading} className="btn--block">
        Submit leave request
      </Button>
      <p className="leave-form__note">
        <Icon name="shield" size={13} />
        Requests are reviewed by your manager and HR. You’ll be notified when there’s an update.
      </p>
    </form>
  );
}
