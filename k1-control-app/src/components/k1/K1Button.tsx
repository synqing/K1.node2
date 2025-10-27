import React, { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

export interface K1ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  children: React.ReactNode;
}

export function K1Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  error = false,
  disabled = false,
  className = '',
  children,
  onClick,
  ...props
}: K1ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeStyles = {
    sm: {
      height: '32px',
      paddingX: '12px',
      fontSize: 'var(--text-sm)',
    },
    md: {
      height: '40px',
      paddingX: '16px',
      fontSize: 'var(--text-base)',
    },
    lg: {
      height: '48px',
      paddingX: '20px',
      fontSize: 'var(--text-lg)',
    },
  };

  const variantStyles = {
    primary: {
      default: {
        background: error ? 'var(--k1-error)' : 'var(--k1-accent)',
        color: 'var(--k1-text-inverse)',
        border: 'none',
        boxShadow: 'var(--elevation-2)',
      },
      hover: {
        background: error ? 'var(--k1-error)' : 'var(--k1-accent-hover)',
        boxShadow: 'var(--elevation-3)',
      },
      active: {
        background: error ? 'var(--k1-error)' : 'var(--k1-accent-pressed)',
        boxShadow: 'var(--elevation-1)',
      },
      disabled: {
        background: 'rgba(110, 231, 243, 0.3)',
        color: 'rgba(230, 233, 239, 0.5)',
        boxShadow: 'none',
      },
    },
    secondary: {
      default: {
        background: 'var(--k1-surface-raised)',
        color: 'var(--k1-text)',
        border: '1px solid var(--k1-border)',
        boxShadow: 'var(--elevation-1)',
      },
      hover: {
        background: 'var(--k1-surface-raised)',
        border: '1px solid var(--k1-accent)',
        boxShadow: 'var(--elevation-2), var(--glow-accent)',
      },
      active: {
        background: 'var(--k1-surface)',
        color: 'var(--k1-accent)',
        border: '2px solid var(--k1-accent)',
        boxShadow: 'none',
      },
      disabled: {
        background: 'var(--k1-surface-raised)',
        color: 'var(--k1-text-disabled)',
        border: '1px solid var(--k1-border)',
        boxShadow: 'none',
      },
    },
    tertiary: {
      default: {
        background: 'transparent',
        color: 'var(--k1-accent)',
        border: 'none',
        boxShadow: 'none',
      },
      hover: {
        background: 'rgba(110, 231, 243, 0.1)',
        color: 'var(--k1-accent)',
      },
      active: {
        background: 'rgba(110, 231, 243, 0.2)',
        color: 'var(--k1-accent-pressed)',
      },
      disabled: {
        background: 'transparent',
        color: 'var(--k1-text-disabled)',
      },
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  const isDisabled = disabled || loading || success;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`k1-button k1-button-${variant} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm)',
        height: currentSize.height,
        paddingLeft: currentSize.paddingX,
        paddingRight: currentSize.paddingX,
        fontSize: currentSize.fontSize,
        fontWeight: 'var(--font-weight-semibold)',
        borderRadius: 'var(--radius-button)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--duration-normal) var(--ease-out)',
        transform: isPressed && !isDisabled ? 'scale(0.98)' : 'scale(1)',
        opacity: isDisabled && !success ? 0.6 : 1,
        overflow: 'hidden',
        ...(isDisabled ? currentVariant.disabled : currentVariant.default),
      }}
      {...props}
    >
      {/* Content */}
      <span
        style={{
          opacity: loading || success ? 0 : 1,
          transition: 'opacity 180ms ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
        }}
      >
        {children}
      </span>

      {/* Loading Spinner */}
      {loading && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2
            size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            className="animate-spin"
            style={{ color: variant === 'primary' ? 'var(--k1-text-inverse)' : 'var(--k1-accent)' }}
          />
        </span>
      )}

      {/* Success Checkmark */}
      {success && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'checkmarkScale 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Check
            size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            style={{ color: variant === 'primary' ? 'var(--k1-text-inverse)' : 'var(--k1-success)' }}
          />
        </span>
      )}

      {/* Hover/Active styles via CSS */}
      <style jsx>{`
        .k1-button-primary:hover:not(:disabled) {
          background: ${error ? 'var(--k1-error)' : 'var(--k1-accent-hover)'};
          box-shadow: var(--elevation-3);
          transform: scale(1.02);
        }

        .k1-button-secondary:hover:not(:disabled) {
          border-color: var(--k1-accent);
          box-shadow: var(--elevation-2), var(--glow-accent);
          transform: scale(1.02);
        }

        .k1-button-tertiary:hover:not(:disabled) {
          background: rgba(110, 231, 243, 0.1);
        }

        .k1-button:focus-visible {
          outline: 2px solid var(--k1-accent);
          outline-offset: 2px;
          box-shadow: var(--glow-accent);
        }

        @keyframes checkmarkScale {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
