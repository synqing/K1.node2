// K1 Provider Status Test Component
import { useK1State, useK1Actions } from '../providers/K1Provider';
import { testBackoffSequence, testJitterDistribution } from '../utils/backoff-test';
import { testTransportRouting, runTransportTests } from '../utils/transport-test';

/**
 * Simple test component to verify K1Provider is working
 * Shows connection state and basic provider info
 */
export function K1StatusTest() {
  const state = useK1State();
  const actions = useK1Actions();

  // Expose test functions to global scope for console testing
  if (typeof window !== 'undefined') {
    (window as any).testBackoff = () => {
      testBackoffSequence();
      testJitterDistribution();
    };
    (window as any).testTransport = testTransportRouting;
    (window as any).runTransportTests = runTransportTests;
    (window as any).k1Actions = actions;
  }

  return (
    <div className="p-2 bg-[var(--k1-panel)] border border-[var(--k1-border)] rounded-lg">
      <h3 className="text-xs font-medium text-[var(--k1-text)] mb-1">K1 Provider Status</h3>
      <div className="space-y-0.5 text-[10px] text-[var(--k1-text-dim)]">
        <div>Connection: <span className="text-[var(--k1-text)]">{state.connection}</span></div>
        <div>Device: <span className="text-[var(--k1-text)]">{state.deviceInfo?.device || 'None'}</span></div>
        <div>Pattern: <span className="text-[var(--k1-text)]">{state.selectedPatternId || 'None'}</span></div>
        <div>Palette: <span className="text-[var(--k1-text)]">{state.activePaletteId}</span></div>
        <div>Auto-reconnect: <span className="text-[var(--k1-text)]">{state.featureFlags.autoReconnect ? 'On' : 'Off'}</span></div>
        <div>Transport: <span className="text-[var(--k1-text)]">{state.transport.activeTransport.toUpperCase()}</span> 
          {state.transport.wsAvailable && <span className="text-[var(--k1-success)]"> (WS✓)</span>}
          {!state.transport.wsAvailable && state.transport.restAvailable && <span className="text-[var(--k1-warning)]"> (REST only)</span>}
          {state.transport.wsDisabled && <span className="text-[var(--k1-text-dim)]"> (WS disabled)</span>}
        </div>
        {state.reconnect.isActive && (
          <div>Reconnecting: <span className="text-[var(--k1-warning)]">Attempt {state.reconnect.attemptCount}, Next: {Math.round(state.reconnect.nextDelay)}ms</span></div>
        )}
        <div>Errors: <span className="text-[var(--k1-text)]">{state.errorHistory.length}</span></div>
        <div>Connections: <span className="text-[var(--k1-text)]">{state.telemetry.successfulConnections}/{state.telemetry.connectionAttempts}</span></div>
        <div className="text-[9px] text-[var(--k1-text-dim)] mt-1">
          Console: <code>testTransport()</code> | <code>runTransportTests()</code>
        </div>
      </div>
    </div>
  );
}