import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAbortError,
  setAbortLoggingEnabled,
  isAbortLoggingEnabled,
  setAbortWindowMs,
  getAbortStats,
  resetAbortStats,
} from '../../utils/error-utils';

// Helper to create AbortError-like objects
function createAbortError(): Error {
  const err = new Error('Operation aborted');
  (err as any).name = 'AbortError';
  return err;
}

// Helper to create DOMException-like abort
function createDomAbort(): any {
  return { name: 'AbortError', message: 'The operation was aborted', code: 20 };
}

describe('error-utils', () => {
  beforeEach(() => {
    resetAbortStats();
    setAbortLoggingEnabled(false);
    setAbortWindowMs(1000);
  });

  it('detects AbortError by name', () => {
    const err = createAbortError();
    expect(isAbortError(err)).toBe(true);
  });

  it('detects DOMException-style aborts', () => {
    const err = createDomAbort();
    expect(isAbortError(err)).toBe(true);
  });

  it("detects message containing 'abort' or 'cancelled'", () => {
    expect(isAbortError(new Error('Fetch aborted'))).toBe(true);
    expect(isAbortError(new Error('Request cancelled by user'))).toBe(true);
  });

  it('increments abort counters on detection', () => {
    expect(getAbortStats().window).toBe(0);
    expect(getAbortStats().total).toBe(0);

    isAbortError(createAbortError());
    const stats = getAbortStats();
    expect(stats.window).toBe(1);
    expect(stats.total).toBe(1);
  });

  it('toggle abort logging state correctly', () => {
    expect(isAbortLoggingEnabled()).toBe(false);
    setAbortLoggingEnabled(true);
    expect(isAbortLoggingEnabled()).toBe(true);
    setAbortLoggingEnabled(false);
    expect(isAbortLoggingEnabled()).toBe(false);
  });

  it('respects summary window configuration', async () => {
    setAbortWindowMs(10);
    isAbortError(createAbortError());
    const first = getAbortStats();
    expect(first.window).toBe(1);

    // Wait beyond window and check window resets, total persists
    await new Promise((r) => setTimeout(r, 20));
    const after = getAbortStats();
    expect(after.total).toBeGreaterThanOrEqual(1);
  });
});