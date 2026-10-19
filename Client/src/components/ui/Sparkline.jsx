import { useId } from 'react';

export default function Sparkline({
  data = [],
  width = 96,
  height = 34,
  color = '#2f6fed',
  fill = true,
  className = '',
}) {
  const gradientId = useId().replace(/:/g, '');
  if (!data.length) return null;

  const values = data.map((value) => Number(value) || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - 3 - ((value - min) / range) * (height - 8);
    return [x, y];
  });

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      className={`sparkline ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#spark-${gradientId})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill="#fff" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}
