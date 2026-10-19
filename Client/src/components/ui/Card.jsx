export function Card({ children, className = '', flush = false, hover = false, ...rest }) {
  return (
    <div
      className={`card ${flush ? 'card--flush' : ''} ${hover ? 'card--hover' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon, className = '' }) {
  return (
    <div className={`card-header ${className}`.trim()}>
      <div className="card-header__main">
        {icon ? <span className="card-header__icon">{icon}</span> : null}
        <div>
          <h3 className="card-header__title">{title}</h3>
          {subtitle ? <p className="card-header__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="card-header__action">{action}</div> : null}
    </div>
  );
}

export default Card;
