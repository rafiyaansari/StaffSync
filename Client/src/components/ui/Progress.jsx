const TONES = ['blue', 'navy', 'green', 'teal', 'violet', 'amber', 'rose', 'slate'];

const normalizeTone = (tone) => (TONES.includes(tone) ? tone : 'blue');

export function ProgressBar({ value = 0, tone = 'blue', size = 'md', label, className = '' }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress-wrap ${className}`.trim()}>
      <div
        className={`progress progress--${size} progress--${normalizeTone(tone)}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || undefined}
      >
        <span className="progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      {label ? <span className="progress__label">{label}</span> : null}
    </div>
  );
}

export function ProgressRing({
  value = 0,
  size = 72,
  stroke = 7,
  tone = 'blue',
  children,
  label,
  className = '',
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`progress-ring progress-ring--${normalizeTone(tone)} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || `${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? <span className="progress-ring__content">{children}</span> : null}
    </div>
  );
}

export function Ring({ value, size = 54, stroke = 6, tone = 'blue', children }) {
  return (
    <ProgressRing value={value} size={size} stroke={stroke} tone={tone}>
      {children}
    </ProgressRing>
  );
}

export default ProgressBar;
