/** Small status pill. Tones: neutral | navy | blue | green | amber | red | violet | teal | outline */
export default function Badge({ children, tone = 'neutral', dot = false, icon, className = '', size = 'md' }) {
  return (
    <span className={`badge badge--${tone} badge--${size} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {icon ? <span className="badge__icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
