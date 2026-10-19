import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className = '',
  hideClose = false,
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
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
      >
        {title ? (
          <header className="modal__header">
            <div className="modal__heading">
              <h2 className="modal__title">{title}</h2>
              {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
            </div>
            {!hideClose ? (
              <button type="button" className="icon-button icon-button--sm" onClick={onClose} aria-label="Close dialog">
                <Icon name="x" size={17} />
              </button>
            ) : null}
          </header>
        ) : (
          <button
            type="button"
            className="modal__floating-close icon-button icon-button--sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="x" size={17} />
          </button>
        )}

        <div className="modal__body">{children}</div>

        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
