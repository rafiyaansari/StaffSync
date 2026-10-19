import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const DropdownContext = createContext(null);

export default function Dropdown({ trigger, children, align = 'right', className = '', panelClassName = '', width }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, close: () => setOpen(false) }}>
      <div className={`dropdown ${className}`.trim()} ref={rootRef}>
        {trigger({ open, toggle: () => setOpen((current) => !current) })}
        {open ? (
          <div
            className={`dropdown__menu dropdown__menu--${align === 'left' ? 'left' : 'right'} ${panelClassName}`.trim()}
            style={width ? { width } : undefined}
          >
            {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
          </div>
        ) : null}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownItem({
  children,
  icon,
  onClick,
  href,
  danger = false,
  active = false,
  meta,
  className = '',
}) {
  const { close } = useContext(DropdownContext) || {};
  const classes = `dropdown__item ${danger ? 'dropdown__item--danger' : ''} ${
    active ? 'is-active' : ''
  } ${className}`.trim();

  const handleClick = (event) => {
    if (href) close?.();
    else event.preventDefault();
    onClick?.(event);
    close?.();
  };

  return (
    <a
      href={href || '#'}
      className={classes}
      role="menuitem"
      onClick={handleClick}
    >
      {icon ? (typeof icon === 'string' ? <Icon name={icon} size={15} /> : icon) : null}
      <span className="dropdown__label">{children}</span>
      {meta ? <span className="dropdown__trailing">{meta}</span> : null}
    </a>
  );
}

export function DropdownDivider() {
  return <div className="dropdown__separator" role="separator" />;
}

export function DropdownHeader({ children }) {
  return <div className="dropdown__section-label">{children}</div>;
}

/* Aliases kept for readability at call sites. */
export const DropdownSeparator = DropdownDivider;

export function DropdownLabel({ children }) {
  return <div className="dropdown__section-label">{children}</div>;
}

export function DropdownFooter({ children }) {
  return <div className="dropdown__footer">{children}</div>;
}
