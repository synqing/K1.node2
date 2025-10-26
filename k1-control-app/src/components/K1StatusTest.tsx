// K1 Provider Status Test Component
import { useK1State } from '../providers/K1Provider';

/**
 * Simple test component to verify K1Provider is working
 * Shows connection state and basic provider info
 */
export function K1StatusTest() {
  const state = useK1State();

  return (
    <div className="p-4 bg-[var(--k1-panel)] border border-[var(--k1-border)] rounded-lg">
      <h3 className="text-sm font-medium text-[var(--k1-text)] mb-2">K1 Provider Status</h3>
      <div className="space-y-1 text-xs text-[var(--k1-text-dim)]">
        <div>Connection: <span className="text-[var(--k1-text)]">{state.connection}</span></div>
        <div>Device: <span className="text-[var(--k1-text)]">{state.deviceInfo?.device || 'None'}</span></div>
        <div>Pattern: <span className="text-[var(--k1-text)]">{state.selectedPatternId || 'None'}</span></div>
        <div>Palette: <span className="text-[var(--k1-text)]">{state.activePaletteId}</span></div>
        <div>Auto-reconnect: <span className="text-[var(--k1-text)]">{state.featureFlags.autoReconnect ? 'On' : 'Off'}</span></div>
        <div>Errors: <span className="text-[var(--k1-text)]">{state.errorHistory.length}</span></div>
      </div>
    </div>
  );
}