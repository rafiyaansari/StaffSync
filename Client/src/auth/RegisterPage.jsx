import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import {
  TextField,
  PasswordField,
  SelectField,
  TextareaField,
  Checkbox,
} from '../components/ui/FormFields';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEPARTMENTS, EMPLOYMENT_TYPES_LIST_DISPLAY, LOCATIONS } from './registerOptions';

const STEPS = [
  { id: 1, label: 'Your details' },
  { id: 2, label: 'Role & team' },
];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  department: '',
  jobTitle: '',
  employmentType: 'Full-time',
  location: 'Bengaluru, IN',
  startDate: '',
  note: '',
  terms: false,
};

function strengthOf(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const strength = useMemo(() => strengthOf(form.password), [form.password]);
  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const setField = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateStepOne = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Work email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!form.phone.trim()) next.phone = 'A phone number helps HR reach you.';
    if (!form.password) next.password = 'Choose a password.';
    else if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (strength < 3) next.password = 'Add an uppercase letter and a number.';
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords don’t match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStepTwo = () => {
    const next = {};
    if (!form.department) next.department = 'Choose your department.';
    if (!form.jobTitle.trim()) next.jobTitle = 'Add the role you’re joining as.';
    if (!form.terms) next.terms = 'Please accept the people data policy.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (validateStepOne()) setStep(2);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStepTwo()) return;
    setSubmitting(true);
    try {
      const result = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        department: form.department,
        jobTitle: form.jobTitle,
        employmentType: form.employmentType,
        location: form.location,
        startDate: form.startDate,
        note: form.note,
      });
      setDone(result);
      toast.success('Registration submitted for HR review.', { title: 'You’re on the list' });
    } catch (error) {
      setErrors({ form: error.message || 'We couldn’t submit your registration.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="auth-card auth-card--success">
          <span className="register-success__icon">
            <Icon name="checkCircle" size={30} />
          </span>
          <p className="auth-eyebrow">Registration received</p>
          <h1 className="auth-title">You’re almost in, {form.firstName}.</h1>
          <p className="auth-sub">
            Your request <strong>{done.request?.id || 'REG-NEW'}</strong> is with the People team.
            Once approved, you can sign in with the email and password you just chose.
          </p>

          <ol className="register-timeline">
            <li className="is-done">
              <span className="register-timeline__dot">
                <Icon name="check" size={11} />
              </span>
              <div>
                <p>Registration submitted</p>
                <span>Just now · {form.email}</span>
              </div>
            </li>
            <li className="is-current">
              <span className="register-timeline__dot" />
              <div>
                <p>HR review</p>
                <span>Usually within one working day</span>
              </div>
            </li>
            <li>
              <span className="register-timeline__dot" />
              <div>
                <p>Account activated</p>
                <span>You’ll get an email as soon as it’s ready</span>
              </div>
            </li>
          </ol>

          <div className="auth-note">
            <Icon name="info" size={15} />
            <span>
              Exploring this demo? Sign in as <strong>Priya (HR)</strong> to approve your request
              under Registrations.
            </span>
          </div>

          <Link to="/login" className="btn btn--primary btn--lg btn--block">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-card auth-card--wide">
        <Link to="/login" className="auth-back">
          <Icon name="arrowLeft" size={15} />
          Back to sign in
        </Link>
        <p className="auth-eyebrow">Join the workspace</p>
        <h1 className="auth-title">Create your StaffSync account</h1>
        <p className="auth-sub">
          Two short steps. HR reviews every registration before activation.
        </p>

        <div className="register-progress" aria-label={`Step ${step} of 2`}>
          {STEPS.map((item, index) => (
            <div
              key={item.id}
              className={`register-progress__step ${step === item.id ? 'is-current' : ''} ${
                step > item.id ? 'is-done' : ''
              }`.trim()}
            >
              <span className="register-progress__num">
                {step > item.id ? <Icon name="check" size={11} /> : item.id}
              </span>
              <span className="register-progress__label">{item.label}</span>
              {index < STEPS.length - 1 ? <span className="register-progress__line" /> : null}
            </div>
          ))}
        </div>

        {errors.form ? (
          <div className="auth-error" role="alert">
            <Icon name="alertCircle" size={16} />
            <span>{errors.form}</span>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {step === 1 ? (
            <>
              <div className="form-grid form-grid--2">
                <TextField
                  label="First name"
                  value={form.firstName}
                  onChange={setField('firstName')}
                  placeholder="Aarav"
                  error={errors.firstName}
                  autoComplete="given-name"
                  required
                />
                <TextField
                  label="Last name"
                  value={form.lastName}
                  onChange={setField('lastName')}
                  placeholder="Mehta"
                  error={errors.lastName}
                  autoComplete="family-name"
                  required
                />
              </div>
              <TextField
                label="Work email"
                type="email"
                icon="mail"
                value={form.email}
                onChange={setField('email')}
                placeholder="you@company.com"
                error={errors.email}
                autoComplete="email"
                required
              />
              <TextField
                label="Phone number"
                type="tel"
                icon="phone"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="+91 98765 43210"
                error={errors.phone}
                autoComplete="tel"
                required
              />
              <div className="form-grid form-grid--2">
                <PasswordField
                  label="Password"
                  value={form.password}
                  onChange={setField('password')}
                  placeholder="At least 8 characters"
                  error={errors.password}
                  autoComplete="new-password"
                  required
                />
                <PasswordField
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  placeholder="Repeat your password"
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
              </div>
              {form.password ? (
                <div className="password-strength">
                  <div className="password-strength__bars">
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={index < strength ? `is-filled strength-${strength}` : ''}
                      />
                    ))}
                  </div>
                  <span className="password-strength__label">
                    Password strength: <strong>{strengthLabels[strength]}</strong>
                  </span>
                </div>
              ) : null}
              <Button type="button" variant="primary" size="lg" className="btn--block" onClick={goNext}>
                Continue to role & team
                <Icon name="arrowRight" size={16} />
              </Button>
            </>
          ) : (
            <>
              <div className="form-grid form-grid--2">
                <SelectField
                  label="Department"
                  value={form.department}
                  onChange={setField('department')}
                  options={DEPARTMENTS}
                  placeholder="Select department"
                  error={errors.department}
                  required
                />
                <TextField
                  label="Job title"
                  value={form.jobTitle}
                  onChange={setField('jobTitle')}
                  placeholder="e.g. Product Designer"
                  error={errors.jobTitle}
                  required
                />
              </div>
              <div className="form-grid form-grid--2">
                <SelectField
                  label="Employment type"
                  value={form.employmentType}
                  onChange={setField('employmentType')}
                  options={EMPLOYMENT_TYPES_LIST_DISPLAY}
                />
                <SelectField
                  label="Base location"
                  value={form.location}
                  onChange={setField('location')}
                  options={LOCATIONS}
                />
              </div>
              <TextField
                label="Preferred start date"
                type="date"
                value={form.startDate}
                onChange={setField('startDate')}
                hint="We’ll confirm the final date with you during onboarding."
              />
              <TextareaField
                label="Anything we should know? (optional)"
                value={form.note}
                onChange={setField('note')}
                placeholder="Referral, accessibility needs, questions for the People team…"
                rows={3}
              />
              <Checkbox
                checked={form.terms}
                onChange={setField('terms')}
                label="I agree to the people data policy"
                description="Your details are used only for onboarding and are visible to HR and your manager."
              />
              {errors.terms ? <p className="field__error">{errors.terms}</p> : null}

              <div className="auth-form__actions">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
                  <Icon name="arrowLeft" size={16} />
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  className="auth-form__submit"
                >
                  Submit registration
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
