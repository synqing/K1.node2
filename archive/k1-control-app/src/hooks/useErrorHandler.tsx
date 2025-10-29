/**
 * Error Handling Context and Hooks
 * Implements Phase 1 Week 2: Global error context with toast notifications
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { K1Error, ErrorCode } from '../utils/error-types';
import { telemetryManager } from '../utils/telemetry-manager';

export interface ErrorContextValue {
  showError: (error: unknown, context?: Record<string, any>) => void;
  clearErrors: () => void;
  dismissError: (index: number) => void;
  errors: K1Error[];
  lastError: K1Error | null;
}

export const ErrorContext = createContext<ErrorContextValue | null>(null);

/**
 * ErrorProvider component - wraps app with global error handling context
 */
export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<K1Error[]>([]);
  const [lastError, setLastError] = useState<K1Error | null>(null);

  const showError = useCallback((error: unknown, context?: Record<string, any>) => {
    const k1Error = K1Error.fromUnknown(error, context);

    // Log to telemetry
    telemetryManager.handleError(k1Error, context);

    // Add to error list (avoid exact duplicates)
    setErrors((prev) => {
      const isDuplicate = prev.some(
        (e) => e.code === k1Error.code && e.message === k1Error.message && prev.length > 0,
      );

      if (isDuplicate) return prev;
      return [...prev, k1Error];
    });

    // Track last error for display
    setLastError(k1Error);

    // Auto-dismiss recoverable errors after delay
    if (k1Error.recoverable) {
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e !== k1Error));
      }, 5000);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setLastError(null);
  }, []);

  const dismissError = useCallback((index: number) => {
    setErrors((prev) => {
      const newErrors = prev.filter((_, i) => i !== index);
      if (newErrors.length === 0) {
        setLastError(null);
      }
      return newErrors;
    });
  }, []);

  const contextValue: ErrorContextValue = {
    showError,
    clearErrors,
    dismissError,
    errors,
    lastError,
  };

  return <ErrorContext.Provider value={contextValue}>{children}</ErrorContext.Provider>;
}

/**
 * Hook to access error context
 */
export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}

/**
 * Hook for parameter validation with error handling
 */
export function useParameterValidation() {
  const { showError } = useErrorHandler();

  return {
    /**
     * Validate parameter value against constraints
     */
    validateParameter: (
      name: string,
      value: any,
      min?: number,
      max?: number,
    ): { valid: boolean; error?: string } => {
      if (value === undefined || value === null) {
        const error = `Parameter ${name} is required`;
        return { valid: false, error };
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          const error = `${name} must be at least ${min}`;
          return { valid: false, error };
        }
        if (max !== undefined && value > max) {
          const error = `${name} cannot exceed ${max}`;
          return { valid: false, error };
        }
      }

      return { valid: true };
    },

    /**
     * Validate all parameters before network request
     */
    validateAllParameters: (params: Record<string, any>): boolean => {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          showError(new K1Error(ErrorCode.INVALID_PARAMETER, `Missing parameter: ${key}`, `Required parameter missing: ${key}`, true), {
            context: 'parameter-validation',
            parameter: key,
          });
          return false;
        }
      }
      return true;
    },

    /**
     * Handle parameter update with validation
     */
    handleParameterUpdate: async (
      updateFn: () => Promise<void>,
      paramName?: string,
    ): Promise<boolean> => {
      try {
        await updateFn();
        return true;
      } catch (error) {
        showError(error, {
          context: 'parameter-update',
          parameter: paramName,
        });
        return false;
      }
    },
  };
}

/**
 * Hook for network error handling and retry logic
 */
export function useNetworkErrorHandler() {
  const { showError } = useErrorHandler();

  return {
    /**
     * Handle network error with automatic retry suggestion
     */
    handleNetworkError: async (
      error: unknown,
      retryFn?: () => Promise<any>,
      maxRetries: number = 3,
    ): Promise<any> => {
      const k1Error = K1Error.fromUnknown(error, { context: 'network-error' });

      if (k1Error.shouldRetry() && retryFn && maxRetries > 0) {
        // Show error with retry info
        showError(
          new K1Error(
            k1Error.code,
            k1Error.message,
            `${k1Error.userMessage}. Retrying in ${k1Error.getRetryDelay() / 1000}s...`,
            true,
          ),
          { context: 'network-error-retrying', maxRetries },
        );

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, k1Error.getRetryDelay()));
        return retryFn();
      } else {
        // Non-retryable error
        showError(error, { context: 'network-error-final' });
        throw error;
      }
    },

    /**
     * Wrap async function with network error handling
     */
    withNetworkErrorHandling: async <T,>(
      asyncFn: () => Promise<T>,
      context?: string,
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        showError(error, { context: context || 'async-operation' });
        return null;
      }
    },
  };
}
