// Centralized abort error detection and lightweight dev logging utilities

// Constants
const DEFAULT_WINDOW_MS = 10000; // Increased to 10s to reduce frequency of summaries
const ABORT_ERROR_NAMES = ['AbortError', 'AbortErrorSignal', 'AbortController'] as const;
const ABORT_MESSAGE_PATTERN = /(abort|cancel)/i;
const LS_DEBUG_ABORTS_KEY = 'k1.debugAborts';

// Internal state - not exported to prevent external mutation
interface AbortState {
  windowCount: number;
  totalCount: number;
  lastWindowStart: number;
  windowMs: number;
  loggingEnabled: boolean | undefined;
  hmrSuppressUntil: number; // Timestamp to suppress logging during HMR cycles
}

const state: AbortState = {
  windowCount: 0,
  totalCount: 0,
  lastWindowStart: Date.now(),
  windowMs: DEFAULT_WINDOW_MS,
  loggingEnabled: undefined,
  hmrSuppressUntil: 0,
};

export interface AbortStats {
  readonly window: number;
  readonly total: number;
  readonly lastWindowStartedAt: number;
  readonly windowMs: number;
}

function parseBool(val: unknown): boolean | undefined {
  if (typeof val === 'string') {
    const v = val.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  if (typeof val === 'boolean') return val;
  return undefined;
}

function getUrlFlag(name: string): boolean | undefined {
  try {
    if (typeof window === 'undefined' || !window.location) return undefined;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(name);
    return parseBool(raw);
  } catch {
    return undefined;
  }
}

function getLocalStorageFlag(key: string): boolean | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(key);
    return parseBool(raw);
  } catch {
    return undefined;
  }
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
  const envVal = parseBool(envFlag);

  const urlVal = getUrlFlag('debugAborts');
  const lsVal = getLocalStorageFlag(LS_DEBUG_ABORTS_KEY);

  // Precedence: URL > localStorage > env; only active in dev
  const resolved = typeof urlVal === 'boolean' ? urlVal
                  : typeof lsVal === 'boolean' ? lsVal
                  : typeof envVal === 'boolean' ? envVal
                  : false;
  
  state.loggingEnabled = !!(isDev && resolved);
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
    // Only log if there were abort errors in this window to reduce noise
    if (state.windowCount > 0) {
      // eslint-disable-next-line no-console
      console.debug(
        `[K1] HMR aborts: ${state.windowCount} in ${state.windowMs}ms (total: ${state.totalCount})`
      );
    }
    state.windowCount = 0;
    state.lastWindowStart = now;
  }
}

/**
 * Increments abort counters and triggers window summary if needed
 * Includes HMR suppression logic to reduce noise during hot reloads
 */
function bumpAbortCounters(): void {
  const now = Date.now();
  
  // Check if we're in an HMR suppression period
  if (now < state.hmrSuppressUntil) {
    // Still count the abort but don't log
    state.totalCount += 1;
    return;
  }
  
  // Detect potential HMR burst (multiple aborts in quick succession)
  const timeSinceLastWindow = now - state.lastWindowStart;
  if (state.windowCount === 0 && timeSinceLastWindow < 2000) {
    // First abort in a potential HMR cycle - suppress logging for 3 seconds
    state.hmrSuppressUntil = now + 3000;
  }
  
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
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_DEBUG_ABORTS_KEY, enabled ? '1' : '0');
    }
  } catch {}
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
  state.hmrSuppressUntil = 0;
}