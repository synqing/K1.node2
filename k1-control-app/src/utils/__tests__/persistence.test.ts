import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  saveTransportPrefs,
  loadTransportPrefs,
  triggerStorageEvent,
} from '../persistence';

// Helper to listen for custom events
function onCustomEvent<T = any>(name: string, handler: (detail: T) => void) {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<T>;
    handler(ce.detail);
  };
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}

describe('persistence helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads transport preferences safely', () => {
    const ok = saveTransportPrefs({ wsEnabled: false, preferredTransport: 'rest', autoReconnect: true });
    expect(ok).toBe(true);

    const loaded = loadTransportPrefs();
    expect(loaded).toEqual({ wsEnabled: false, preferredTransport: 'rest', autoReconnect: true });
  });

  it('handles invalid transport prefs gracefully', () => {
    // Write invalid JSON
    localStorage.setItem('k1:v1:transportPrefs', '{"wsEnabled":"nope"');
    const loaded = loadTransportPrefs();
    expect(loaded).toBeNull();
  });

  it('dispatches storage and custom events for HMR overlay', () => {
    const storageSpy = vi.fn();
    const customSpy = vi.fn();

    // Listen for generic storageChange and specific hmrOverlayChange
    const off1 = onCustomEvent('k1:storageChange', (detail) => customSpy(detail));
    const off2 = onCustomEvent('k1:hmrOverlayChange', (detail) => storageSpy(detail));

    triggerStorageEvent('k1.hmrOverlay', '1', '0');

    expect(customSpy).toHaveBeenCalledWith({ key: 'k1.hmrOverlay', newValue: '1', oldValue: '0' });
    expect(storageSpy).toHaveBeenCalledWith({ enabled: true });

    off1();
    off2();
  });
});