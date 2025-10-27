// Centralized abort error detection and lightweight dev logging utilities

let abortWindowCount = 0;
let abortTotalCount = 0;
let lastWindowStart = Date.now();
let windowMs = 5000;
let loggingEnabled: boolean | undefined = undefined;

function shouldLogAborts(): boolean {
  if (typeof loggingEnabled === 'boolean') return loggingEnabled;
  const isDev = (import.meta as any).env?.DEV;
  const envFlag = (import.meta as any).env?.VITE_K1_DEBUG_ABORTS ?? (import.meta as any).env?.VITE_DEBUG_ABORTS;
  const flag = typeof envFlag === 'string' ? (envFlag.toLowerCase() === 'true' || envFlag === '1') : false;
  loggingEnabled = !!(isDev && flag);
  return loggingEnabled;
}

function summarizeWindow() {
  // Avoid noisy logs; emit a compact summary
  // Only in dev and when enabled
  if (!shouldLogAborts()) return;
  const now = Date.now();
  if (now - lastWindowStart >= windowMs) {
    // eslint-disable-next-line no-console
    console.debug(`[K1] Abort summary: window=${abortWindowCount}, total=${abortTotalCount}, windowMs=${windowMs}`);
    abortWindowCount = 0;
    lastWindowStart = now;
  }
}

function bumpAbortCounters() {
  abortWindowCount += 1;
  abortTotalCount += 1;
  summarizeWindow();
}

export function setAbortLoggingEnabled(enabled: boolean) {
  loggingEnabled = enabled;
}

export function isAbortLoggingEnabled(): boolean {
  return !!shouldLogAborts();
}

export function setAbortWindowMs(ms: number) {
  windowMs = ms > 0 ? ms : windowMs;
}

export function getAbortStats() {
  return {
    window: abortWindowCount,
    total: abortTotalCount,
    lastWindowStartedAt: lastWindowStart,
    windowMs,
  };
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as any)?.name as string | undefined;
  const message = (err as any)?.message as string | undefined;

  const isDomAbort = typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError';
  const nameAbort = name === 'AbortError' || name === 'AbortErrorSignal' || name === 'AbortController';
  const messageAbort = typeof message === 'string' && /abort/i.test(message);

  const result = !!(isDomAbort || nameAbort || messageAbort);
  if (result) bumpAbortCounters();
  return result;
}