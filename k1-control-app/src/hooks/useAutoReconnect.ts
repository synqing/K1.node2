/**
 * Auto-reconnect Hook with Exponential Backoff
 * Manages device reconnection with configurable delays, jitter, and max attempts
 */

import { useEffect, useRef, useCallback } from 'react';
import { useK1 } from '../providers/K1Provider';
import { K1_DEFAULTS } from '../types/k1-types';

export interface AutoReconnectConfig {
  baseDelay?: number;        // Initial delay in ms (default: 500)
  maxDelay?: number;         // Maximum delay cap in ms (default: 30000)
  jitterPercent?: number;    // Jitter % (0-100, default: 20)
  maxAttempts?: number;      // Max retry attempts before giving up (default: 10)
  autoStart?: boolean;       // Auto-start on mount (default: true)
}

export interface AutoReconnectStatus {
  isReconnecting: boolean;
  attempt: number;
  nextDelay: number;
  willRetry: boolean;
}

/**
 * Hook for managing auto-reconnect with exponential backoff
 * Integrates with K1Provider's reconnect state tracking
 */
export function useAutoReconnect(config: AutoReconnectConfig = {}) {
  const { state, actions } = useK1();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanedUpRef = useRef(false);

  // Resolve config with defaults
  const baseDelay = config.baseDelay ?? K1_DEFAULTS.RECONNECT.BASE_DELAY;
  const maxDelay = config.maxDelay ?? K1_DEFAULTS.RECONNECT.MAX_DELAY;
  const jitterPercent = config.jitterPercent ?? K1_DEFAULTS.RECONNECT.JITTER_PERCENT;
  const maxAttempts = config.maxAttempts ?? K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS;
  const autoStart = config.autoStart ?? true;

  /**
   * Calculate delay with exponential backoff and jitter
   * Delay = min(baseDelay * 2^attempt, maxDelay) + jitter
   */
  const calculateNextDelay = useCallback(
    (attempt: number): number => {
      if (attempt <= 0) return baseDelay;

      // Exponential backoff: baseDelay * 2^(attempt-1)
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt - 1),
        maxDelay
      );

      // Add jitter: ±(jitterPercent% of delay)
      const jitterAmount = exponentialDelay * (jitterPercent / 100);
      const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;

      return Math.max(baseDelay, Math.round(exponentialDelay + randomJitter));
    },
    [baseDelay, maxDelay, jitterPercent]
  );

  /**
   * Attempt to reconnect to the last known endpoint
   */
  const reconnect = useCallback(async () => {
    if (state.connection === 'connected') {
      // Already connected, stop reconnecting
      actions.stopReconnection();
      return;
    }

    const attempt = state.reconnect.attemptCount + 1;

    // Check if we've exceeded max attempts
    if (attempt > maxAttempts) {
      console.warn(
        `[Auto-reconnect] Max attempts (${maxAttempts}) exceeded, giving up`
      );
      actions.stopReconnection();
      return;
    }

    // Get last endpoint from state or localStorage
    const lastEndpoint =
      state.deviceInfo?.ip ||
      (() => {
        try {
          const stored = localStorage.getItem('k1:v1:endpoint');
          return stored ? new URL(stored).hostname : null;
        } catch {
          return null;
        }
      })();

    if (!lastEndpoint) {
      console.warn('[Auto-reconnect] No endpoint to reconnect to');
      actions.stopReconnection();
      return;
    }

    try {
      console.log(
        `[Auto-reconnect] Attempt ${attempt}/${maxAttempts} to reconnect to ${lastEndpoint}`
      );

      // Reset error state before attempting
      actions.clearError();

      // Attempt connection
      await actions.connect(lastEndpoint);

      // Success! Reset reconnect state
      console.log('[Auto-reconnect] Successfully reconnected');
      actions.stopReconnection();
    } catch (error) {
      // Connection failed, schedule next attempt
      const nextDelay = calculateNextDelay(attempt);

      console.warn(
        `[Auto-reconnect] Attempt ${attempt} failed, next retry in ${nextDelay}ms`
      );

      // Trigger reconnection state update in provider
      actions.startReconnection();

      // Schedule next retry
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!isCleanedUpRef.current) {
          reconnect();
        }
      }, nextDelay);
    }
  }, [
    state.connection,
    state.reconnect.attemptCount,
    state.deviceInfo,
    maxAttempts,
    calculateNextDelay,
    actions,
  ]);

  /**
   * Start auto-reconnect process
   */
  const start = useCallback(() => {
    if (state.reconnect.isActive || state.connection === 'connected') {
      return;
    }
    actions.startReconnection();
    reconnect();
  }, [state.reconnect.isActive, state.connection, actions, reconnect]);

  /**
   * Stop auto-reconnect and clear any pending timers
   */
  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    actions.stopReconnection();
  }, [actions]);

  /**
   * Reset reconnect state (attempts, delays)
   */
  const reset = useCallback(() => {
    stop();
    // Reset via provider action would go here if we add one
  }, [stop]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isCleanedUpRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Auto-start on mount if enabled and disconnected
   */
  useEffect(() => {
    if (
      autoStart &&
      state.connection === 'disconnected' &&
      !state.reconnect.isActive
    ) {
      start();
    }
  }, [autoStart, state.connection, state.reconnect.isActive, start]);

  const status: AutoReconnectStatus = {
    isReconnecting: state.reconnect.isActive,
    attempt: state.reconnect.attemptCount,
    nextDelay: state.reconnect.nextDelay,
    willRetry:
      state.reconnect.isActive &&
      state.reconnect.attemptCount < maxAttempts,
  };

  return {
    start,
    stop,
    reset,
    status,
    isReconnecting: state.reconnect.isActive,
    attempt: state.reconnect.attemptCount,
    nextDelay: state.reconnect.nextDelay,
  };
}
