import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Toast provider.
 *
 * Toasts are announced through an aria-live region so failures are not purely
 * visual, and every toast can be dismissed by keyboard.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { variant = 'success', title = '', duration = 5000 } = {}) => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, variant, title }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      toast: push,
      success: (message, options) => push(message, { ...options, variant: 'success' }),
      error: (message, options) => push(message, { ...options, variant: 'error', duration: 7000 }),
      warning: (message, options) => push(message, { ...options, variant: 'warning' }),
      info: (message, options) => push(message, { ...options, variant: 'info' }),
    }),
    [toasts, dismiss, push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false">
          {toasts.map((t) => {
            const Icon = ICONS[t.variant] || Info;
            return (
              <div key={t.id} className={`toast toast-${t.variant}`}>
                <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="grow">
                  {t.title ? <div className="strong small">{t.title}</div> : null}
                  <div className="small">{t.message}</div>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
