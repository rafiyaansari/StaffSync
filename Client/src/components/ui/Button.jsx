import Icon from './Icon';

/**
 * Button — variants: primary (navy), secondary (white), ghost, subtle, danger.
 * Sizes: sm | md | lg. Use iconOnly for square icon buttons.
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  iconOnly = false,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${iconOnly ? 'btn--icon' : ''} ${className}`.trim()}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={size === 'sm' ? 15 : 17} />
      ) : null}
      {!iconOnly && children ? <span className="btn__label">{children}</span> : null}
      {!iconOnly && iconRight ? <Icon name={iconRight} size={size === 'sm' ? 15 : 17} /> : null}
    </button>
  );
}
