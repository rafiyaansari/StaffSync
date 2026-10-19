export default function Logo({ size = 'md', theme = 'light', showWordmark = true, className = '' }) {
  const markSize = size === 'sm' ? 30 : size === 'lg' ? 42 : 36;
  return (
    <span className={`logo logo--${size} logo--${theme} ${className}`.trim()}>
      <span className="logo__mark" style={{ width: markSize, height: markSize }}>
        <svg viewBox="0 0 64 64" width={markSize} height={markSize} aria-hidden="true">
          <rect width="64" height="64" rx="17" fill="currentColor" className="logo__mark-bg" />
          <path
            d="M42 22.5c-2.2-2.4-5.4-3.7-9.2-3.7-5.4 0-9.2 2.8-9.2 6.9 0 4.2 3.5 5.7 8.8 6.8 4.8 1 6.8 1.8 6.8 4.1 0 2.5-2.5 4.1-6.4 4.1-3.5 0-6.5-1.2-8.7-3.5l-3.4 4.1c2.8 3.2 7 4.9 12 4.9 6.4 0 10.6-3.2 10.6-7.9 0-4.4-3.3-6-9.2-7.2-4.5-.9-6.4-1.6-6.4-3.8 0-2.1 2.2-3.4 5.2-3.4 2.9 0 5.3.9 7.1 2.7L42 22.5z"
            fill="#fff"
          />
          <circle cx="49" cy="17" r="4.5" fill="#4FA3FF" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="logo__word">
          StaffSync<span className="logo__dot">.</span>
        </span>
      ) : null}
    </span>
  );
}
