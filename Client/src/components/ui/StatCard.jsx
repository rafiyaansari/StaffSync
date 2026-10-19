import Icon from './Icon';
import Sparkline from './Sparkline';

const SPARK_COLORS = {
  blue: '#2f6fed',
  navy: '#0b2545',
  green: '#0a9468',
  teal: '#0f8f8a',
  violet: '#7a4ee8',
  amber: '#c07a12',
  rose: '#d43a52',
  slate: '#5b6b82',
};

export default function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  trend,
  trendLabel,
  footnote,
  sparkline,
  onClick,
  className = '',
}) {
  const direction = trend?.direction || 'up';
  const interactive = typeof onClick === 'function';

  const content = (
    <>
      <div className="stat-card__top">
        <span className="stat-card__icon">
          {typeof icon === 'string' ? <Icon name={icon} size={17} /> : icon}
        </span>
        {trend ? (
          <span className={`trend trend--${direction}`}>
            <Icon
              name={direction === 'down' ? 'trendingDown' : direction === 'flat' ? 'minus' : 'trendingUp'}
              size={13}
            />
            {trend.value}
          </span>
        ) : null}
      </div>
      <p className="stat-card__label">{label}</p>
      <div className="stat-card__value-row">
        <p className="stat-card__value">{value}</p>
        {sparkline?.length ? (
          <Sparkline
            data={sparkline}
            color={SPARK_COLORS[tone] || SPARK_COLORS.blue}
            className="stat-card__spark"
          />
        ) : null}
      </div>
      {trendLabel || footnote ? (
        <p className="stat-card__footnote">
          {trendLabel ? <strong>{trendLabel}</strong> : null}
          {trendLabel && footnote ? ' · ' : null}
          {footnote || null}
        </p>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={`stat-card stat-card--${tone} stat-card--clickable ${className}`.trim()}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={`stat-card stat-card--${tone} ${className}`.trim()}>{content}</div>;
}
