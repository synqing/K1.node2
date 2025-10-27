import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import HMRDelayOverlay from '../HMRDelayOverlay';
import { K1Provider } from '../../../providers/K1Provider';
import { ErrorProvider } from '../../../hooks/useErrorHandler';

let container: HTMLDivElement;
let root: Root;

describe('HMRDelayOverlay', () => {
  beforeEach(() => {
    // Reset DOM container
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    // Default overlay enabled
    localStorage.setItem('k1.hmrOverlay', '1');
  });

  it('renders and responds to custom toggle events', async () => {
    root.render(
      React.createElement(
        ErrorProvider,
        null,
        React.createElement(
          K1Provider,
          { devConfig: { hmrDelayMs: 50 } },
          React.createElement(HMRDelayOverlay)
        )
      )
    );

    // Initially rendered
    const initiallyVisible = document.body.textContent?.includes('HMR Status Monitor') ?? false;
    expect(initiallyVisible).toBe(true);

    // Disable via custom event
    window.dispatchEvent(new CustomEvent('k1:hmrOverlayChange', { detail: { enabled: false } }));

    // Should hide
    const afterDisableVisible = document.body.textContent?.includes('HMR Status Monitor') ?? false;
    expect(afterDisableVisible).toBe(false);

    // Enable again via storage event
    localStorage.setItem('k1.hmrOverlay', '1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'k1.hmrOverlay', newValue: '1', oldValue: '0', storageArea: localStorage }));

    const afterEnableVisible = document.body.textContent?.includes('HMR Status Monitor') ?? false;
    expect(afterEnableVisible).toBe(true);
  });
});