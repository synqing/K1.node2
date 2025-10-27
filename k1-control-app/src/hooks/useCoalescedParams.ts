import { useRef, useCallback } from 'react';
import type { K1Parameters } from '../types/k1-types';
import { useK1Actions, useK1State } from '../providers/K1Provider';

/**
 * Coalesces rapid parameter updates into a single dispatch within a short window.
 * Default debounce window is ~80ms to comfortably stay under 100ms.
 */
export function useCoalescedParams(debounceMs: number = 80) {
  const actions = useK1Actions();
  const { transport } = useK1State();
  const pendingRef = useRef<Partial<K1Parameters>>({});
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = {};
    const hasKeys = Object.keys(pending).length > 0;
    if (!hasKeys) return;

    try {
      await actions.updateParameters(pending);
    } catch (err) {
      // Swallow errors here; UI remains responsive and provider handles reporting
      console.warn('[useCoalescedParams] updateParameters failed:', err);
    }
  }, [actions]);

  const queue = useCallback((update: Partial<K1Parameters>) => {
    // Merge update into pending
    pendingRef.current = { ...pendingRef.current, ...update };
    // Restart debounce timer with transport-aware tuning
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    const isWs = transport.activeTransport === 'ws' && transport.wsAvailable;
    const effectiveDebounceMs = isWs
      ? Math.min(debounceMs, 80) // tighter when WS is live
      : Math.max(debounceMs, 140); // looser when on REST polling
    timerRef.current = window.setTimeout(flush, effectiveDebounceMs);
  }, [flush, debounceMs, transport]);

  return { queue, flush };
}