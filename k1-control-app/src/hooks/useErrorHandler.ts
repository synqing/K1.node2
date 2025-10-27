/**
 * Error handling context and hook
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { K1Error } from '../utils/error-types';
import { telemetryManager } from '../utils/telemetry-manager';
import { ErrorToast } from '../components/ErrorToast';

interface ErrorContextValue {
  showError: (error: unknown, context?: Record<string, any>) => void;
  clearErrors: () => void;
  errors: K1Error[];
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<K1Error[]>([]);
  
  const showError = useCallback((error: unknown, context?: Record<string, any>) => {
    const k1Error = K1Error.fromUnknown(error, context);
    
    // Log to telemetry
    telemetryManager.recordError(k1Error, context);
    
    // Add to error list (avoid duplicates)
    setErrors(prev => {
      const isDuplicate = prev.some(e => 
        e.code === k1Error.code && 
        e.message === k1Error.message
      );
      
      if (isDuplicate) return prev;
      return [...prev, k1Error];
    });
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  const dismissError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const retryError = useCallback((index: number) => {
    const error = errors[index];
    if (error && error.recoverable) {
      // Dismiss the error and let the caller handle retry
      dismissError(index);
      
      // Emit retry event for listeners
      if (error.context?.retryCallback) {
        error.context.retryCallback();
      }
    }
  }, [errors, dismissError]);
  
  return (
    <ErrorContext.Provider value={{ showError, clearErrors, errors }}>
      {children}
      
      {/* Render error toasts */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {errors.map((error, index) => (
          <ErrorToast
            key={`${error.code}-${index}`}
            error={error}
            onDismiss={() => dismissError(index)}
            onRetry={error.recoverable ? () => retryError(index) : undefined}
          />
        ))}
      </div>
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}