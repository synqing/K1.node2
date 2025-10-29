import { useEffect, useRef, useState } from 'react';
import { useK1State, useK1Config } from '../providers/K1Provider';
import { isAbortError } from '../utils/error-utils';
import { recordSubscription, recordStart, recordStop, type MetricType } from '../utils/realtime-metrics';

export type SubscribeFn<T> = (callback: (data: T) => void) => (() => void) | Promise<() => void>;

interface UseK1RealtimeOptions<T> {
  subscribe?: SubscribeFn<T>;
  onData: (data: T) => void;
  fallbackTick?: () => T;
  intervalMs?: number;
  autoStart?: boolean;
  hmrDelayMs?: number; // configurable HMR delay
  metricType?: MetricType; // dev metrics category
}

interface UseK1RealtimeReturn {
  start: () => void;
  stop: () => void;
  live: boolean;
  running: boolean;
}

/**
 * Shared realtime hook that centralizes subscribe/unsubscribe with a polling fallback.
 * - Uses provider connection state to decide LIVE vs SIM mode.
 * - Returns control methods and mode flags for UI.
 */
export function useK1Realtime<T>({
  subscribe,
  onData,
  fallbackTick,
  intervalMs = 500,
  autoStart = false,
  hmrDelayMs,
  metricType,
}: UseK1RealtimeOptions<T>): UseK1RealtimeReturn {
  const { isConnected } = useK1State();
  const { hmrDelayMs: providerHmrDelayMs } = useK1Config();
  const [running, setRunning] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(false);

  const unsubRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);

  const stop = () => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch {}
      unsubRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mountedRef.current) {
      setRunning(false);
      setLive(false);
    }
    if (metricType) {
      recordStop(metricType);
    }
  };

  const start = () => {
    // Always stop any existing streams first
    stop();

    if (metricType) {
      recordStart(metricType);
    }

    // Prefer LIVE subscription when connected and a subscribe function exists
    if (isConnected && subscribe) {
      if (metricType) {
        recordSubscription(metricType);
      }
      const maybePromise = subscribe((data: T) => {
        onData(data);
      });

      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        (maybePromise as Promise<() => void>).then((unsub) => {
          unsubRef.current = unsub;
        }).catch((err) => {
          // Ignore abort errors during HMR/navigation, otherwise drop to fallback if available
          if (isAbortError(err)) {
            if (mountedRef.current) {
              setRunning(false);
              setLive(false);
            }
            return;
          }
          if (fallbackTick) {
            intervalRef.current = window.setInterval(() => {
              try {
                const data = fallbackTick();
                onData(data);
              } catch {}
            }, intervalMs);
            if (mountedRef.current) {
              setLive(false);
              setRunning(true);
            }
          } else {
            if (mountedRef.current) {
              setRunning(false);
              setLive(false);
            }
          }
        });
      } else {
        unsubRef.current = maybePromise as (() => void) | null;
      }
      if (mountedRef.current) {
        setLive(true);
        setRunning(true);
      }
      return;
    }

    // Otherwise use SIM fallback if provided
    if (fallbackTick) {
      intervalRef.current = window.setInterval(() => {
        try {
          const data = fallbackTick();
          onData(data);
        } catch {}
      }, intervalMs);
      if (mountedRef.current) {
        setLive(false);
        setRunning(true);
      }
      return;
    }

    // No data source available
    if (mountedRef.current) {
      setRunning(false);
      setLive(false);
    }
  };

  // Auto start when requested
  useEffect(() => {
    const hot = (import.meta as any).hot;
    const defaultDelay = autoStart ? (hot ? 50 : 0) : 0;
    const effectiveHmrDelay = (hmrDelayMs ?? providerHmrDelayMs ?? defaultDelay);
    const delay = autoStart ? (hot ? effectiveHmrDelay : 0) : 0;
    let timer: number | null = null;

    if (autoStart && !running) {
      if (delay > 0) {
        timer = window.setTimeout(() => {
          start();
        }, delay);
      } else {
        start();
      }
    }
    // Cleanup on unmount
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      mountedRef.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // HMR-aware cleanup: ensure streams are stopped before module replacement
  useEffect(() => {
    const hot = (import.meta as any).hot;
    if (hot) {
      hot.dispose(() => {
        stop();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, stop, live, running };
}