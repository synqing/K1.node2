// Centralized abort error detection and lightweight dev logging utilities

// Constants
const DEFAULT_WINDOW_MS = 5000;
const ABORT_ERROR_NAMES = ['AbortError', 'AbortErrorSignal', 'AbortController'] as const;
const ABORT_MESSAGE_PATTERN = /abort/i;

// Internal state - not exported to prevent external mutation
interface AbortState {
  windowCount: number;
  totalCount: number;
  lastWindowStart: number;
  windowMs: number;
  loggingEnabled: boolean | undefined;
}

const state: AbortState = {
  windowCount: 0,
  totalCount: 0,
  lastWindowStart: Date.now(),
  windowMs: DEFAULT_WINDOW_MS,
  loggingEnabled: undefined,
};

export interface AbortStats {
  readonly window: number;
  readonly total: number;
  readonly lastWindowStartedAt: number;
  readonly windowMs: number;
}

/**
 * Determines if abort logging should be enabled based on configuration and environment
 * @returns true if abort logging is enabled
 */
function shouldLogAborts(): boolean {
  if (typeof state.loggingEnabled === 'boolean') {
    return state.loggingEnabled;
  }
  
  const isDev = (import.meta as any).env?.DEV;
  const envFlag = (import.meta as any).env?.VITE_K1_DEBUG_ABORTS ?? 
                  (import.meta as any).env?.VITE_DEBUG_ABORTS;
  
  const flag = typeof envFlag === 'string' ? 
    (envFlag.toLowerCase() === 'true' || envFlag === '1') : 
    false;
    
  state.loggingEnabled = !!(isDev && flag);
  return state.loggingEnabled;
}

/**
 * Emits a compact summary of abort errors for the current window
 * Only logs in development mode when enabled
 */
function summarizeWindow(): void {
  if (!shouldLogAborts()) return;
  
  const now = Date.now();
  if (now - state.lastWindowStart >= state.windowMs) {
    // eslint-disable-next-line no-console
    console.debug(
      `[K1] Abort summary: window=${state.windowCount}, total=${state.totalCount}, windowMs=${state.windowMs}`
    );
    state.windowCount = 0;
    state.lastWindowStart = now;
  }
}

/**
 * Increments abort counters and triggers window summary if needed
 */
function bumpAbortCounters(): void {
  state.windowCount += 1;
  state.totalCount += 1;
  summarizeWindow();
}

/**
 * Sets the abort logging enabled state
 * @param enabled - Whether to enable abort logging
 */
export function setAbortLoggingEnabled(enabled: boolean): void {
  state.loggingEnabled = enabled;
}

/**
 * Gets the current abort logging enabled state
 * @returns true if abort logging is enabled
 */
export function isAbortLoggingEnabled(): boolean {
  return !!shouldLogAborts();
}

/**
 * Sets the window duration for abort summaries
 * @param ms - Window duration in milliseconds (must be positive)
 */
export function setAbortWindowMs(ms: number): void {
  if (ms > 0) {
    state.windowMs = ms;
  }
}

/**
 * Gets current abort statistics
 * @returns Immutable snapshot of current abort stats
 */
export function getAbortStats(): AbortStats {
  return {
    window: state.windowCount,
    total: state.totalCount,
    lastWindowStartedAt: state.lastWindowStart,
    windowMs: state.windowMs,
  };
}

/**
 * Determines if an error is an abort error and increments counters if so
 * @param err - The error to check
 * @returns true if the error is an abort error
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  
  const errorObj = err as any;
  const name = errorObj?.name as string | undefined;
  const message = errorObj?.message as string | undefined;

  // Check for DOM AbortError
  const isDomAbort = typeof DOMException !== 'undefined' && 
                     err instanceof DOMException && 
                     err.name === 'AbortError';

  // Check for abort-related error names
  const nameAbort = name && ABORT_ERROR_NAMES.includes(name as any);

  // Check for abort-related messages
  const messageAbort = typeof message === 'string' && 
                       ABORT_MESSAGE_PATTERN.test(message);

  const result = !!(isDomAbort || nameAbort || messageAbort);
  
  if (result) {
    bumpAbortCounters();
  }
  
  return result;
}

/**
 * Resets all abort counters (useful for testing)
 * Only available in development mode
 */
export function resetAbortStats(): void {
  if (!(import.meta as any).env?.DEV) return;
  
  state.windowCount = 0;
  state.totalCount = 0;
  state.lastWindowStart = Date.now();
}