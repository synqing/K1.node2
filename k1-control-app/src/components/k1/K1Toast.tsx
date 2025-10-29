import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface K1ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

export function K1Toast({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: K1ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 200);
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  const colors = {
    success: {
      icon: 'var(--k1-success)',
      border: 'var(--k1-success-border)',
    },
    error: {
      icon: 'var(--k1-error)',
      border: 'var(--k1-error-border)',
    },
    warning: {
      icon: 'var(--k1-warning)',
      border: 'var(--k1-warning-border)',
    },
    info: {
      icon: 'var(--k1-info)',
      border: 'var(--k1-info-border)',
    },
  };

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        minWidth: '300px',
        maxWidth: '500px',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        background: 'var(--k1-surface-raised)',
        border: `1px solid ${colors[type].border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--elevation-3)',
        animation: isExiting
          ? 'slideOutRight 200ms ease-in'
          : 'slideInRight 300ms ease-out',
        marginBottom: 'var(--spacing-sm)',
      }}
    >
      {/* Icon */}
      <div style={{ color: colors[type].icon, flexShrink: 0 }}>
        {icons[type]}
      </div>

      {/* Message */}
      <div
        style={{
          flex: 1,
          fontSize: 'var(--text-sm)',
          color: 'var(--k1-text)',
        }}
      >
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        aria-label="Close notification"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--k1-text-secondary)',
          cursor: 'pointer',
          transition: 'all var(--duration-fast) var(--ease-out)',
          flexShrink: 0,
        }}
        className="k1-toast-close"
      >
        <X size={16} />
      </button>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .k1-toast-close:hover {
          background: rgba(110, 231, 243, 0.1);
          color: var(--k1-accent);
        }

        .k1-toast-close:focus-visible {
          outline: 2px solid var(--k1-accent);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes slideInRight,
          @keyframes slideOutRight {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

// Toast Container and Manager
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

export const toast = {
  success: (message: string, duration = 5000) => {
    addToast({ id: generateId(), message, type: 'success', duration });
  },
  error: (message: string, duration = 5000) => {
    addToast({ id: generateId(), message, type: 'error', duration });
  },
  warning: (message: string, duration = 5000) => {
    addToast({ id: generateId(), message, type: 'warning', duration });
  },
  info: (message: string, duration = 5000) => {
    addToast({ id: generateId(), message, type: 'info', duration });
  },
};

function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function addToast(toast: Toast) {
  toasts = [...toasts, toast];
  emitChange();
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
}

function emitChange() {
  listeners.forEach((listener) => listener(toasts));
}

export function K1ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 'var(--spacing-lg)',
        right: 'var(--spacing-lg)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {currentToasts.map((toast) => (
          <K1Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}
