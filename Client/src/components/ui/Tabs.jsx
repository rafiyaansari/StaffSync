export default function Tabs({ tabs, active, onChange, className = '', ariaLabel = 'Tabs' }) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tabs__tab ${active === tab.id ? 'is-active' : ''}`.trim()}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.icon ? <tab.icon /> : null}
          {tab.label}
          {tab.count != null ? <span className="tabs__count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
