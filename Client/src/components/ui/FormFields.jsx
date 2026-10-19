import { useId, useState } from 'react';
import Icon from './Icon';

/* -------------------------------------------------------------------------- */
/* Field wrapper                                                              */
/* -------------------------------------------------------------------------- */

export function Field({ label, htmlFor, hint, error, required, children, className = '', action }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        action ? (
          <div className="field__label-row">
            <label className="field__label" htmlFor={htmlFor}>
              {label}
              {required ? <span className="field__required">*</span> : null}
            </label>
            {action}
          </div>
        ) : (
          <label className="field__label" htmlFor={htmlFor}>
            {label}
            {required ? <span className="field__required">*</span> : null}
          </label>
        )
      ) : null}
      {children}
      {error ? (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={12} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Text input                                                                 */
/* -------------------------------------------------------------------------- */

export function TextField({
  label,
  id,
  hint,
  error,
  required,
  icon,
  suffix,
  className = '',
  wrapClassName = '',
  action,
  ...inputProps
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      required={required}
      className={`${wrapClassName} ${className}`.trim()}
      action={action}
    >
      <div className={`input-wrap ${icon ? 'input-wrap--icon' : ''} ${suffix ? 'input-wrap--suffix' : ''}`.trim()}>
        {icon ? (
          <span className="input-wrap__icon">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <input
          id={fieldId}
          className="input"
          aria-invalid={error ? 'true' : undefined}
          {...inputProps}
        />
        {suffix ? <span className="input-wrap__suffix">{suffix}</span> : null}
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Password                                                                   */
/* -------------------------------------------------------------------------- */

export function PasswordField({ label, id, hint, error, required, className = '', ...inputProps }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
      <div className="input-wrap input-wrap--icon input-wrap--suffix">
        <span className="input-wrap__icon">
          <Icon name="lock" size={15} />
        </span>
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className="input"
          aria-invalid={error ? 'true' : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="input-wrap__action"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={15} />
        </button>
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

export function SelectField({
  label,
  id,
  hint,
  error,
  required,
  options = [],
  placeholder,
  className = '',
  wrapClassName = '',
  size = 'md',
  ...selectProps
}) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      required={required}
      className={`${wrapClassName} ${className}`.trim()}
    >
      <div className="select-wrap">
        <select
          id={fieldId}
          className="select"
          style={size === 'sm' ? { height: 34, fontSize: 12.5 } : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...selectProps}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) =>
            typeof option === 'string' ? (
              <option key={option} value={option}>
                {option}
              </option>
            ) : (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ),
          )}
        </select>
        <span className="select-wrap__icon">
          <Icon name="chevronDown" size={15} />
        </span>
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Textarea                                                                   */
/* -------------------------------------------------------------------------- */

export function TextareaField({
  label,
  id,
  hint,
  error,
  required,
  rows = 3,
  className = '',
  wrapClassName = '',
  ...textareaProps
}) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <Field
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      required={required}
      className={`${wrapClassName} ${className}`.trim()}
    >
      <textarea
        id={fieldId}
        rows={rows}
        className="textarea"
        aria-invalid={error ? 'true' : undefined}
        {...textareaProps}
      />
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  id,
  onClear,
  ...inputProps
}) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className={`search-field ${className}`.trim()}>
      <span className="search-field__icon">
        <Icon name="search" size={15} />
      </span>
      <input
        id={fieldId}
        type="search"
        className="search-field__input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        {...inputProps}
      />
      {value ? (
        <button
          type="button"
          className="search-field__clear"
          onClick={() => {
            if (onClear) onClear();
            else onChange?.({ target: { value: '' } });
          }}
          aria-label="Clear search"
        >
          <Icon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkbox                                                                   */
/* -------------------------------------------------------------------------- */

export function Checkbox({ label, description, checked, onChange, id, className = '', ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label className={`checkbox ${className}`.trim()} htmlFor={fieldId}>
      <input id={fieldId} type="checkbox" checked={checked} onChange={onChange} {...props} />
      <span className="checkbox__box" aria-hidden="true">
        <Icon name="check" size={11} strokeWidth={3} />
      </span>
      {label ? (
        <span className="checkbox__text">
          <span className="checkbox__label">{label}</span>
          {description ? <span className="checkbox__description">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Toggle                                                                     */
/* -------------------------------------------------------------------------- */

export function Toggle({ label, description, checked, onChange, id, disabled = false }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={`toggle-row ${disabled ? 'is-disabled' : ''}`.trim()}>
      {label ? (
        <div className="toggle-row__text">
          <label className="toggle-row__label" htmlFor={fieldId}>
            {label}
          </label>
          {description ? <p className="toggle-row__description">{description}</p> : null}
        </div>
      ) : null}
      <label className="switch">
        <input
          id={fieldId}
          type="checkbox"
          role="switch"
          checked={Boolean(checked)}
          onChange={onChange}
          disabled={disabled}
          aria-label={label}
        />
        <span className="switch__track">
          <span className="switch__thumb" />
        </span>
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Radio group                                                                */
/* -------------------------------------------------------------------------- */

export function RadioGroup({ label, name, options = [], value, onChange, hint }) {
  return (
    <div className="field">
      {label ? <span className="field__label">{label}</span> : null}
      <div className="radio-group" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <label
              key={optionValue}
              className={`radio-card ${value === optionValue ? 'is-selected' : ''}`.trim()}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={value === optionValue}
                onChange={() => onChange?.(optionValue)}
              />
              <span className="radio-card__indicator" />
              <span className="radio-card__label">{optionLabel}</span>
            </label>
          );
        })}
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export default TextField;
