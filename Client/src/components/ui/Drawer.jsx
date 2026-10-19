import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
  className = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <aside
        className={`drawer ${className}`.trim()}
        style={{ width: `min(${width}px, 100vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
      >
        <header className="drawer__header">
          <div>
            {title ? <h2 className="drawer__title">{title}</h2> : null}
            {subtitle ? <p className="drawer__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button icon-button--sm" onClick={onClose} aria-label="Close panel">
            <Icon name="x" size={17} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer ? <footer className="drawer__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
