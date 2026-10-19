import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import { Card, CardHeader } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import { TextField, SelectField, TextareaField } from '../components/ui/FormFields';
import { ProgressRing } from '../components/ui/Progress';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/date';
import { employeeStatusTone } from '../utils/ui';
import { ROLE_LABELS } from '../config/navigation';

const TABS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'work', label: 'Employment' },
  { id: 'about', label: 'About & emergency' },
];

export default function ProfilePage() {
  const { currentEmployee, updateEmployee, leaves } = useData();
  const toast = useToast();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!currentEmployee) return;
    setForm({
      firstName: currentEmployee.firstName || '',
      lastName: currentEmployee.lastName || '',
      email: currentEmployee.email || '',
      phone: currentEmployee.phone || '',
      dob: currentEmployee.dob || '',
      gender: currentEmployee.gender || 'Prefer not to say',
      bloodGroup: currentEmployee.bloodGroup || '',
      address: currentEmployee.address || '',
      skills: (currentEmployee.skills || []).join(', '),
      bio: currentEmployee.bio || '',
      emergencyName: currentEmployee.emergency?.name || '',
      emergencyRelation: currentEmployee.emergency?.relation || '',
      emergencyPhone: currentEmployee.emergency?.phone || '',
      avatar: currentEmployee.avatar || null,
    });
  }, [currentEmployee]);

  const completion = useMemo(() => {
    if (!currentEmployee) return 0;
    const checks = [
      currentEmployee.avatar,
      currentEmployee.phone,
      currentEmployee.dob,
      currentEmployee.address,
      currentEmployee.bio,
      currentEmployee.skills?.length,
      currentEmployee.emergency?.name,
      currentEmployee.emergency?.phone,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [currentEmployee]);

  if (!currentEmployee || !form) return null;

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file (JPG or PNG).');
      return;
    }
    // The API stores the image as a base64 data URI capped at 1.5 MB, which is
    // roughly a 1 MB file. Check here so the user gets an instant, clear message
    // instead of a server validation error after saving.
    if (file.size > 1024 * 1024) {
      toast.error('Photos need to be smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatar: reader.result }));
      toast.info('Photo ready — save your profile to apply it.');
    };
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (form.emergencyPhone && !form.emergencyName.trim()) {
      next.emergencyName = 'Add a name for this emergency contact.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setTab(next.emergencyName ? 'about' : 'personal');
      return;
    }

    setSaving(true);
    try {
      await updateEmployee(currentEmployee.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: form.phone,
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        address: form.address,
        skills: form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        bio: form.bio,
        avatar: form.avatar,
        emergency: {
          name: form.emergencyName,
          relation: form.emergencyRelation,
          phone: form.emergencyPhone,
        },
      });
    } catch (error) {
      setErrors({ form: error.message || 'Could not save your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const annual = currentEmployee.leave?.annual || { total: 0, used: 0 };
  const roleLabel = ROLE_LABELS[currentEmployee.systemRole] || 'Employee';
  const myLeaves = leaves.filter((leave) => leave.employeeId === currentEmployee.id).length;

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="My profile"
        subtitle="Keep your details up to date — your manager and People team rely on them."
        actions={
          <Link to="/settings" className="btn btn--secondary">
            <Icon name="lock" size={16} />
            Security settings
          </Link>
        }
      />

      <div className="profile-layout">
        <div className="profile-aside">
          <Card className="profile-summary">
            <div className="profile-summary__cover" />
            <div className="profile-summary__avatar">
              <Avatar name={currentEmployee.name} src={form.avatar} size="xxl" ring />
              <button
                type="button"
                className="profile-summary__camera"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile photo"
              >
                <Icon name="camera" size={15} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            </div>
            <div className="profile-summary__body">
              <h2 className="profile-summary__name">
                {form.firstName} {form.lastName}
              </h2>
              <p className="profile-summary__role">{currentEmployee.jobTitle}</p>
              <div className="profile-summary__badges">
                <Badge tone="navy">{currentEmployee.department}</Badge>
                <Badge tone={employeeStatusTone(currentEmployee.status)} dot>
                  {currentEmployee.status}
                </Badge>
              </div>

              <div className="profile-summary__completion">
                <ProgressRing value={completion} size={54} stroke={5} tone="green">
                  <span className="profile-summary__completion-value">{completion}%</span>
                </ProgressRing>
                <div>
                  <p className="profile-summary__completion-title">Profile completeness</p>
                  <span className="profile-summary__completion-text">
                    {completion === 100 ? 'Everything looks great.' : 'Add a photo and emergency contact.'}
                  </span>
                </div>
              </div>

              <dl className="profile-summary__facts">
                <div>
                  <dt><Icon name="mail" size={14} /> Work email</dt>
                  <dd>{currentEmployee.email}</dd>
                </div>
                <div>
                  <dt><Icon name="phone" size={14} /> Phone</dt>
                  <dd>{currentEmployee.phone || 'Not added'}</dd>
                </div>
                <div>
                  <dt><Icon name="users" size={14} /> Reports to</dt>
                  <dd>{currentEmployee.managerName || '—'}</dd>
                </div>
                <div>
                  <dt><Icon name="calendar" size={14} /> Joined</dt>
                  <dd>{formatDate(currentEmployee.joinDate)}</dd>
                </div>
                <div>
                  <dt><Icon name="mapPin" size={14} /> Location</dt>
                  <dd>{currentEmployee.location}</dd>
                </div>
                <div>
                  <dt><Icon name="shield" size={14} /> Access level</dt>
                  <dd>{roleLabel}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="At a glance" subtitle="Your workspace snapshot" />
            <div className="profile-glance">
              <div>
                <span>Employee ID</span>
                <strong>{currentEmployee.employeeCode || currentEmployee.id}</strong>
              </div>
              <div>
                <span>Annual leave left</span>
                <strong>{annual.total - annual.used} days</strong>
              </div>
              <div>
                <span>Leave requests</span>
                <strong>{myLeaves}</strong>
              </div>
              <div>
                <span>Work mode</span>
                <strong>{currentEmployee.workMode}</strong>
              </div>
            </div>
          </Card>
        </div>

        <Card className="profile-main" flush>
          <div className="profile-main__head">
            <Tabs tabs={TABS} active={tab} onChange={setTab} ariaLabel="Profile sections" />
          </div>

          <form className="profile-form" onSubmit={save} noValidate>
            {errors.form ? (
              <div className="inline-alert inline-alert--danger">
                <Icon name="alertCircle" size={15} /> {errors.form}
              </div>
            ) : null}

            {tab === 'personal' ? (
              <div className="profile-panel">
                <div className="profile-panel__head">
                  <h3>Personal details</h3>
                  <p>These are visible to your manager and the People team.</p>
                </div>
                <div className="form-grid form-grid--2">
                  <TextField label="First name" value={form.firstName} onChange={setField('firstName')} error={errors.firstName} required />
                  <TextField label="Last name" value={form.lastName} onChange={setField('lastName')} error={errors.lastName} required />
                  <TextField label="Work email" type="email" value={form.email} onChange={setField('email')} error={errors.email} required />
                  <TextField label="Phone" type="tel" value={form.phone} onChange={setField('phone')} placeholder="+91 98765 43210" />
                  <TextField label="Date of birth" type="date" value={form.dob} onChange={setField('dob')} />
                  <SelectField
                    label="Gender"
                    value={form.gender}
                    onChange={setField('gender')}
                    options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
                  />
                  <TextField label="Blood group" value={form.bloodGroup} onChange={setField('bloodGroup')} placeholder="e.g. O+" />
                  <TextField label="Address" value={form.address} onChange={setField('address')} placeholder="Home address" wrapClassName="form-grid__span-2" />
                </div>
              </div>
            ) : null}

            {tab === 'work' ? (
              <div className="profile-panel">
                <div className="profile-panel__head">
                  <h3>Employment details</h3>
                  <p>Managed by the People team. Ask HR for any corrections.</p>
                </div>
                <dl className="detail-grid detail-grid--3">
                  <div><dt>Employee ID</dt><dd>{currentEmployee.employeeCode || currentEmployee.id}</dd></div>
                  <div><dt>Job title</dt><dd>{currentEmployee.jobTitle}</dd></div>
                  <div><dt>Department</dt><dd>{currentEmployee.department}</dd></div>
                  <div><dt>Manager</dt><dd>{currentEmployee.managerName || '—'}</dd></div>
                  <div><dt>Employment type</dt><dd>{currentEmployee.employmentType}</dd></div>
                  <div><dt>Work mode</dt><dd>{currentEmployee.workMode}</dd></div>
                  <div><dt>Base location</dt><dd>{currentEmployee.location}</dd></div>
                  <div><dt>Joining date</dt><dd>{formatDate(currentEmployee.joinDate)}</dd></div>
                  <div><dt>System role</dt><dd>{roleLabel}</dd></div>
                </dl>
                <div className="profile-panel__note">
                  <Icon name="info" size={14} />
                  Need a change to your role or reporting line? Reach out to people@nimbuslabs.com.
                </div>
              </div>
            ) : null}

            {tab === 'about' ? (
              <div className="profile-panel">
                <div className="profile-panel__head">
                  <h3>About & emergency contact</h3>
                  <p>A little context helps your team know you better.</p>
                </div>
                <TextareaField
                  label="About you"
                  value={form.bio}
                  onChange={setField('bio')}
                  rows={4}
                  placeholder="What are you working on? What do you enjoy outside work?"
                />
                <TextField
                  label="Skills"
                  value={form.skills}
                  onChange={setField('skills')}
                  hint="Separate skills with commas."
                  placeholder="React, Design systems, Accessibility"
                />
                <div className="profile-panel__divider" />
                <h4 className="profile-panel__subtitle">Emergency contact</h4>
                <div className="form-grid form-grid--3">
                  <TextField label="Name" value={form.emergencyName} onChange={setField('emergencyName')} error={errors.emergencyName} placeholder="Full name" />
                  <TextField label="Relationship" value={form.emergencyRelation} onChange={setField('emergencyRelation')} placeholder="Spouse, parent…" />
                  <TextField label="Phone" value={form.emergencyPhone} onChange={setField('emergencyPhone')} placeholder="+91…" />
                </div>
              </div>
            ) : null}

            {tab !== 'work' ? (
              <div className="profile-form__footer">
                <p>
                  <Icon name="shield" size={13} />
                  Changes are logged in the workspace audit trail.
                </p>
                <Button type="submit" variant="primary" icon="check" loading={saving}>
                  Save changes
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
      </div>
    </>
  );
}
