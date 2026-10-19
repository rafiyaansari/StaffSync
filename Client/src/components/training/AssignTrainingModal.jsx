import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { SearchField, SelectField, TextField } from '../ui/FormFields';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { reportsOf } from '../../utils/selectors';
import { formatDate } from '../../utils/date';

export default function AssignTrainingModal({ open, onClose, courseId = null, scope = null }) {
  const { role, user } = useAuth();
  const { trainings, employees, assignTraining } = useData();
  const [form, setForm] = useState({ trainingId: '', dueDate: '', employeeIds: [] });
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const scopedEmployees = useMemo(() => {
    if (scope) return employees.filter((employee) => scope.includes(employee.id));
    if (role === 'manager') return reportsOf(employees, user?.id);
    return employees.filter((employee) => employee.status !== 'Inactive');
  }, [employees, role, scope, user?.id]);

  const course = trainings.find((item) => item.id === form.trainingId);

  useEffect(() => {
    if (!open) return;
    const selectedCourse = trainings.find((item) => item.id === courseId) || trainings[0];
    setForm({
      trainingId: selectedCourse?.id || '',
      dueDate: selectedCourse?.dueDate || '',
      employeeIds: [],
    });
    setQuery('');
    setErrors({});
  }, [open, courseId, trainings]);

  const toggleMember = (id) => {
    setForm((current) => ({
      ...current,
      employeeIds: current.employeeIds.includes(id)
        ? current.employeeIds.filter((employeeId) => employeeId !== id)
        : [...current.employeeIds, id],
    }));
    setErrors((current) => ({ ...current, employees: undefined }));
  };

  const visibleMembers = scopedEmployees.filter((employee) =>
    employee.name.toLowerCase().includes(query.toLowerCase()),
  );

  const selectAll = () => {
    const selectable = visibleMembers
      .filter((employee) => !course?.enrolled.some((entry) => entry.employeeId === employee.id))
      .map((employee) => employee.id);
    setForm((current) => ({
      ...current,
      employeeIds: Array.from(new Set([...current.employeeIds, ...selectable])),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.trainingId) next.training = 'Choose a course.';
    if (!form.employeeIds.length) next.employees = 'Select at least one teammate.';
    if (!form.dueDate) next.dueDate = 'Set a due date.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await assignTraining(form);
      onClose?.();
    } catch (error) {
      setErrors({ form: error.message || 'The assignment could not be saved.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign training"
      subtitle="Pick a course, choose teammates and set a due date."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" icon="send" onClick={submit} loading={loading}>
            Assign training
          </Button>
        </>
      }
    >
      <form className="assign-form" onSubmit={submit} noValidate>
        {errors.form ? (
          <div className="inline-alert inline-alert--danger">
            <Icon name="alertCircle" size={15} /> {errors.form}
          </div>
        ) : null}

        <div className="form-grid form-grid--2">
          <SelectField
            label="Course"
            value={form.trainingId}
            onChange={(event) => {
              const selected = trainings.find((item) => item.id === event.target.value);
              setForm((current) => ({
                ...current,
                trainingId: event.target.value,
                dueDate: selected?.dueDate || current.dueDate,
              }));
            }}
            options={trainings.map((item) => ({ value: item.id, label: item.title }))}
            error={errors.training}
            required
          />
          <TextField
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            error={errors.dueDate}
            required
          />
        </div>

        <div className="assign-form__members">
          <div className="assign-form__members-head">
            <div>
              <h4 className="assign-form__title">Assign to</h4>
              <p className="assign-form__sub">
                {form.employeeIds.length
                  ? `${form.employeeIds.length} selected`
                  : `${scopedEmployees.length} ${role === 'manager' ? 'teammates' : 'employees'} available`}
              </p>
            </div>
            <div className="assign-form__tools">
              <SearchField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a teammate…"
                className="assign-form__search"
              />
              <button type="button" className="link-button" onClick={selectAll}>
                Select all
              </button>
            </div>
          </div>
          {errors.employees ? <p className="field__error">{errors.employees}</p> : null}

          <div className="assign-form__list">
            {visibleMembers.map((employee) => {
              const enrolled = course?.enrolled.some((entry) => entry.employeeId === employee.id);
              const checked = form.employeeIds.includes(employee.id);
              return (
                <label
                  key={employee.id}
                  className={`assign-member ${enrolled ? 'is-enrolled' : ''} ${checked ? 'is-checked' : ''}`.trim()}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked || enrolled)}
                    onChange={() => !enrolled && toggleMember(employee.id)}
                    disabled={Boolean(enrolled)}
                  />
                  <Avatar name={employee.name} src={employee.avatar} size="sm" />
                  <span className="assign-member__text">
                    <span className="assign-member__name">{employee.name}</span>
                    <span className="assign-member__meta">{employee.jobTitle}</span>
                  </span>
                  {enrolled ? (
                    <Badge tone="green" size="sm">
                      Already enrolled
                    </Badge>
                  ) : (
                    <span className={`assign-member__check ${checked ? 'is-on' : ''}`.trim()}>
                      {checked ? <Icon name="check" size={12} /> : null}
                    </span>
                  )}
                </label>
              );
            })}
            {!visibleMembers.length ? <p className="muted-line">No teammates match that search.</p> : null}
          </div>
        </div>

        {course ? (
          <div className="assign-form__note">
            <Icon name="info" size={14} />
            <span>
              <strong>{course.title}</strong> · {course.modules} modules · due{' '}
              {form.dueDate ? formatDate(form.dueDate) : 'not set'}. Teammates will be notified
              immediately.
            </span>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
