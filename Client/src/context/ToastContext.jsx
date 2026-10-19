import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const entry = {
        id,
        message,
        title: options.title,
        variant: options.variant || 'success',
        duration: options.duration ?? 4200,
      };
      setToasts((current) => [...current.slice(-3), entry]);
      const timer = setTimeout(() => dismiss(id), entry.duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast,
      dismiss,
      success: (message, options) => toast(message, { ...options, variant: 'success' }),
      error: (message, options) => toast(message, { ...options, variant: 'error' }),
      info: (message, options) => toast(message, { ...options, variant: 'info' }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications">
        {toasts.map((item) => (
          <div className={`toast toast--${item.variant}`} key={item.id} role="status">
            <span className="toast__icon">
              <Icon
                name={
                  item.variant === 'error'
                    ? 'alertCircle'
                    : item.variant === 'info'
                      ? 'info'
                      : 'checkCircle'
                }
                size={18}
              />
            </span>
            <div className="toast__body">
              {item.title ? <p className="toast__title">{item.title}</p> : null}
              <p className="toast__message">{item.message}</p>
            </div>
            <button className="toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
