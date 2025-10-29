import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export interface K1InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function K1Input({
  label,
  error,
  helperText,
  icon,
  disabled = false,
  className = '',
  id,
  ...props
}: K1InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `k1-input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const hasError = !!error;

  return (
    <div className={`k1-input-wrapper ${className}`} style={{ width: '100%' }}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--k1-text)',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          {label}
          {props.required && (
            <span style={{ color: 'var(--k1-error)', marginLeft: '4px' }}>*</span>
          )}
        </label>
      )}

      {/* Input Container */}
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Icon */}
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: hasError
                ? 'var(--k1-error)'
                : isFocused
                ? 'var(--k1-accent)'
                : 'var(--k1-text-secondary)',
              transition: 'color var(--duration-fast) var(--ease-out)',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          id={inputId}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          style={{
            width: '100%',
            height: '40px',
            paddingLeft: icon ? '40px' : '12px',
            paddingRight: hasError ? '40px' : '12px',
            background: disabled
              ? 'rgba(122, 129, 148, 0.1)'
              : 'var(--k1-surface-sunken)',
            border: hasError
              ? '2px solid var(--k1-error)'
              : isFocused
              ? '2px solid var(--k1-accent)'
              : '1px solid var(--k1-border)',
            borderRadius: 'var(--radius-md)',
            color: disabled ? 'var(--k1-text-disabled)' : 'var(--k1-text)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-normal)',
            lineHeight: 'var(--leading-base)',
            outline: 'none',
            boxShadow: hasError
              ? 'var(--glow-error)'
              : isFocused
              ? 'var(--glow-accent)'
              : 'none',
            transition:
              'border var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.6 : 1,
          }}
          {...props}
        />

        {/* Error Icon */}
        {hasError && !disabled && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--k1-error)',
              pointerEvents: 'none',
            }}
          >
            <AlertCircle size={20} />
          </div>
        )}

        {/* Placeholder styling */}
        <style jsx>{`
          input::placeholder {
            color: var(--k1-text-secondary);
            opacity: 1;
          }

          input:disabled::placeholder {
            color: var(--k1-text-disabled);
          }

          input:hover:not(:disabled):not(:focus) {
            border-color: var(--k1-text-secondary);
          }
        `}</style>
      </div>

      {/* Error Message */}
      {hasError && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            marginTop: 'var(--spacing-xs)',
            fontSize: 'var(--text-sm)',
            color: 'var(--k1-error)',
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Helper Text */}
      {helperText && !hasError && (
        <div
          id={helperId}
          style={{
            marginTop: 'var(--spacing-xs)',
            fontSize: 'var(--text-sm)',
            color: 'var(--k1-text-secondary)',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}
