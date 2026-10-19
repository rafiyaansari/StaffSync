const DEFAULT_COLOR = 'var(--blue-500)';

/* -------------------------------------------------------------------------- */
/* Donut                                                                      */
/* -------------------------------------------------------------------------- */

export function Donut({
  segments = [],
  size = 150,
  thickness = 16,
  centerValue,
  centerLabel,
  className = '',
  gap = 2,
}) {
  const total = segments.reduce((sum, segment) => sum + (Number(segment.value) || 0), 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={`donut ${className}`.trim()} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel || 'Breakdown'}>
        <circle
          className="donut__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        {segments.map((segment) => {
          const value = Number(segment.value) || 0;
          const length = (value / total) * circumference;
          const dash = Math.max(length - gap, 0);
          const element = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color || DEFAULT_COLOR}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${segment.label}: ${value}`}</title>
            </circle>
          );
          offset += length;
          return element;
        })}
      </svg>
      {centerValue !== undefined || centerLabel ? (
        <div className="donut__content">
          {centerValue !== undefined ? <strong className="donut__value">{centerValue}</strong> : null}
          {centerLabel ? <span className="donut__label">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bar chart                                                                  */
/* -------------------------------------------------------------------------- */

export function BarChart({
  data = [],
  height = 176,
  maxValue,
  suffix = '',
  tone = 'blue',
  ariaLabel = 'Bar chart',
  showValues = true,
}) {
  const values = data.map((item) => Number(item.value) || 0);
  const max = maxValue || Math.max(...values, 1);

  return (
    <div className={`bar-chart bar-chart--${tone}`.trim()} role="img" aria-label={ariaLabel}>
      <div className="bar-chart__grid" aria-hidden="true">
        {[0, 1, 2, 3].map((line) => (
          <span className="bar-chart__grid-line" key={line} />
        ))}
      </div>
      <div className="bar-chart__bars" style={{ height }}>
        {data.map((item, index) => {
          const value = Number(item.value) || 0;
          const percent = Math.max((value / max) * 100, 2);
          return (
            <div className="bar-chart__col" key={`${item.label}-${index}`} title={`${item.label}: ${value}${suffix}`}>
              {showValues ? <span className="bar-chart__value">{`${value}${suffix}`}</span> : null}
              <div
                className={`bar-chart__bar ${item.highlight ? 'is-highlight' : ''}`.trim()}
                style={{
                  height: `${percent}%`,
                  '--bar-color': item.color || DEFAULT_COLOR,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="bar-chart__labels">
        {data.map((item, index) => (
          <span className="bar-chart__label" key={`${item.label}-label-${index}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Horizontal bars                                                            */
/* -------------------------------------------------------------------------- */

export function HorizontalBars({ items = [], suffix = '', className = '' }) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  return (
    <div className={`h-bars ${className}`.trim()}>
      {items.map((item) => {
        const value = Number(item.value) || 0;
        return (
          <div className="h-bars__row" key={item.label}>
            <div className="h-bars__meta">
              <span className="h-bars__label">{item.label}</span>
              <span className="h-bars__value">
                {value}
                {suffix}
              </span>
            </div>
            <div className="h-bars__track">
              <span
                className="h-bars__fill"
                style={{
                  width: `${Math.max((value / max) * 100, 3)}%`,
                  background: item.color || DEFAULT_COLOR,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Legend                                                                     */
/* -------------------------------------------------------------------------- */

export function Legend({ items = [], className = '' }) {
  return (
    <div className={`legend ${className}`.trim()}>
      {items.map((item) => (
        <div className="legend__item" key={item.label}>
          <span className="legend__swatch" style={{ background: item.color }} />
          <span className="legend__label">{item.label}</span>
          <span className="legend__value">
            {item.value}
            {item.suffix || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Donut;
