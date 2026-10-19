export default function PageHeader({ eyebrow, title, subtitle, actions, meta, className = '' }) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__text">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <div className="page-header__title-row">
          <h1 className="page-header__title">{title}</h1>
          {meta}
        </div>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
