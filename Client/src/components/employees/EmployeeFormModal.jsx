import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import {
  TextField,
  SelectField,
  TextareaField,
  PasswordField,
} from '../ui/FormFields';
import { useData } from '../../context/DataContext';
import { DEPARTMENTS, EMPLOYMENT_TYPES_DISPLAY, LOCATIONS, WORK_MODES_DISPLAY } from './employeeOptions';
import { todayISO } from '../../utils/date';

const blank = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  department: 'Engineering',
  systemRole: 'employee',
  employmentType: 'Full-time',
  workMode: 'Hybrid',
  location: 'Bengaluru, IN',
  managerId: '',
  joinDate: todayISO(),
  status: 'Active',
  dob: '',
  gender: 'Prefer not to say',
  bloodGroup: '',
  address: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
  skills: '',
  bio: '',
  password: '',
};

export default function EmployeeFormModal({ open, onClose, employee = null }) {
  const { employees, createEmployee, updateEmployee } = useData();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const editing = Boolean(employee);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (employee) {
      setForm({
        ...blank,
        ...employee,
        managerId: employee.managerId || '',
        skills: (employee.skills || []).join(', '),
        emergencyName: employee.emergency?.name || '',
        emergencyRelation: employee.emergency?.relation || '',
        emergencyPhone: employee.emergency?.phone || '',
        password: '',
        dob: employee.dob || '',
        bloodGroup: employee.bloodGroup || '',
      });
    } else {
      setForm(blank);
    }
  }, [open, employee]);

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const managerOptions = employees
    .filter((item) => ['manager', 'hr'].includes(item.systemRole) && item.id !== employee?.id)
    .map((item) => ({ value: item.id, label: `${item.name} — ${item.jobTitle}` }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required.';
    if (!form.lastName.trim()) next.lastName = 'Required.';
    if (!form.email.trim()) next.email = 'Required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (!form.jobTitle.trim()) next.jobTitle = 'Required.';
    if (!form.joinDate) next.joinDate = 'Required.';
    if (!editing && form.password && form.password.length < 8) next.password = 'Use 8+ characters.';
    if (editing && form.password && form.password.length < 8) next.password = 'Use 8+ characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      jobTitle: form.jobTitle.trim(),
      department: form.department,
      systemRole: form.systemRole,
      role: form.systemRole,
      employmentType: form.employmentType,
      workMode: form.workMode,
      location: form.location,
      managerId: form.managerId || null,
      joinDate: form.joinDate,
      status: form.status,
      dob: form.dob,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      address: form.address,
      emergency: {
        name: form.emergencyName,
        relation: form.emergencyRelation,
        phone: form.emergencyPhone,
      },
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      bio: form.bio,
    };
    if (form.password) payload.password = form.password;

    setLoading(true);
    try {
      if (editing) await updateEmployee(employee.id, payload);
      else await createEmployee(payload);
      onClose?.();
    } catch (error) {
      setErrors({ form: error.message || 'Could not save the employee.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit employee' : 'Add a new employee'}
      subtitle={
        editing
          ? `Update ${employee?.name}’s profile, role and access.`
          : 'Create their profile. Add a temporary password to give them sign-in access.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" icon={editing ? 'check' : 'userPlus'} onClick={submit} loading={loading}>
            {editing ? 'Save changes' : 'Create employee'}
          </Button>
        </>
      }
    >
      <form className="employee-form" onSubmit={submit} noValidate>
        {errors.form ? (
          <div className="inline-alert inline-alert--danger">
            <Icon name="alertCircle" size={15} /> {errors.form}
          </div>
        ) : null}

        <div className="employee-form__preview">
          <Avatar
            name={`${form.firstName} ${form.lastName}`.trim() || 'New employee'}
            size="lg"
          />
          <div>
            <p className="employee-form__preview-name">
              {`${form.firstName} ${form.lastName}`.trim() || 'New employee'}
            </p>
            <p className="employee-form__preview-meta">
              {form.jobTitle || 'Job title'} · {form.department}
            </p>
          </div>
          <span className="employee-form__preview-status">Preview</span>
        </div>

        <div className="employee-form__section">
          <h4 className="employee-form__section-title">Basic details</h4>
          <div className="form-grid form-grid--2">
            <TextField label="First name" value={form.firstName} onChange={setField('firstName')} error={errors.firstName} required />
            <TextField label="Last name" value={form.lastName} onChange={setField('lastName')} error={errors.lastName} required />
            <TextField label="Work email" type="email" value={form.email} onChange={setField('email')} error={errors.email} required />
            <TextField label="Phone" value={form.phone} onChange={setField('phone')} placeholder="+91 98765 43210" />
            <TextField label="Date of birth" type="date" value={form.dob} onChange={setField('dob')} />
            <SelectField
              label="Gender"
              value={form.gender}
              onChange={setField('gender')}
              options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
            />
          </div>
        </div>

        <div className="employee-form__section">
          <h4 className="employee-form__section-title">Role & employment</h4>
          <div className="form-grid form-grid--2">
            <TextField label="Job title" value={form.jobTitle} onChange={setField('jobTitle')} error={errors.jobTitle} required placeholder="e.g. Frontend Engineer" />
            <SelectField label="Department" value={form.department} onChange={setField('department')} options={DEPARTMENTS} />
            <SelectField
              label="System role"
              value={form.systemRole}
              onChange={setField('systemRole')}
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'manager', label: 'Manager' },
                { value: 'hr', label: 'HR' },
              ]}
              hint="Controls which dashboard and permissions they get."
            />
            <SelectField
              label="Reports to"
              value={form.managerId}
              onChange={setField('managerId')}
              options={managerOptions}
              placeholder="No manager"
            />
            <SelectField label="Employment type" value={form.employmentType} onChange={setField('employmentType')} options={EMPLOYMENT_TYPES_DISPLAY} />
            <SelectField label="Work mode" value={form.workMode} onChange={setField('workMode')} options={WORK_MODES_DISPLAY} />
            <SelectField label="Location" value={form.location} onChange={setField('location')} options={LOCATIONS} />
            <SelectField label="Status" value={form.status} onChange={setField('status')} options={['Active', 'Probation', 'Inactive']} />
            <TextField label="Joining date" type="date" value={form.joinDate} onChange={setField('joinDate')} error={errors.joinDate} required />
            <PasswordField
              label={editing ? 'Reset password (optional)' : 'Temporary password (optional)'}
              value={form.password}
              onChange={setField('password')}
              placeholder={editing ? 'Leave blank to keep current' : 'Optional · 8+ characters'}
              error={errors.password}
            />
          </div>
        </div>

        <div className="employee-form__section">
          <h4 className="employee-form__section-title">Profile & emergency contact</h4>
          <div className="form-grid form-grid--2">
            <TextField label="Skills" value={form.skills} onChange={setField('skills')} placeholder="React, TypeScript, Design systems" wrapClassName="form-grid__span-2" hint="Separate skills with commas." />
            <TextareaField label="About" value={form.bio} onChange={setField('bio')} rows={2} wrapClassName="form-grid__span-2" placeholder="A short intro shown on their profile." />
            <TextField label="Emergency contact" value={form.emergencyName} onChange={setField('emergencyName')} placeholder="Full name" />
            <TextField label="Relationship" value={form.emergencyRelation} onChange={setField('emergencyRelation')} placeholder="Spouse, parent…" />
            <TextField label="Emergency phone" value={form.emergencyPhone} onChange={setField('emergencyPhone')} placeholder="+91…" />
            <TextField label="Blood group" value={form.bloodGroup} onChange={setField('bloodGroup')} placeholder="e.g. O+" />
            <TextField label="Address" value={form.address} onChange={setField('address')} wrapClassName="form-grid__span-2" placeholder="Home address" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
