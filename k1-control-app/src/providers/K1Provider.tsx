import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { K1Client } from '../api/k1-client';
import {
  K1ProviderState,
  K1ProviderActions,
  K1ConnectionState,
  K1Error,
  K1Parameters,
  K1DeviceInfo,
  K1TelemetryState,
  K1_DEFAULTS,
  K1_STORAGE_KEYS,
} from '../types/k1-types';
import { K1Telemetry } from '../utils/telemetry-manager';
import { sessionRecorder } from '../utils/session-recorder';
import { useErrorHandler } from '../hooks/useErrorHandler';
import {
  savePatternParameters,
  loadPatternParameters,
  savePatternPalette,
  saveEndpoint,
} from '../utils/persistence';
import { setAbortLoggingEnabled } from '../utils/error-utils';
import HMRDelayOverlay from '../components/debug/HMRDelayOverlay';
// Add transport prefs helpers
import { loadTransportPrefs, saveTransportPrefs } from '../utils/persistence';

// ============================================================================
// PROVIDER STATE MANAGEMENT
// ============================================================================

/**
 * Actions for K1 provider state updates
 */
type K1Action =
  | { type: 'SET_CONNECTION_STATE'; payload: K1ConnectionState }
  | { type: 'SET_DEVICE_INFO'; payload: K1DeviceInfo | null }
  | { type: 'SET_SELECTED_PATTERN'; payload: string | null }
  | { type: 'SET_PARAMETERS'; payload: K1Parameters }
  | { type: 'UPDATE_PARAMETERS'; payload: Partial<K1Parameters> }
  | { type: 'SET_PALETTE'; payload: number }
  | { type: 'SET_ERROR'; payload: K1Error }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_ERROR_HISTORY' }
  | { type: 'SET_TRANSPORT_FLAGS'; payload: Partial<K1ProviderState['transport']> }
  | { type: 'SET_RECONNECT_STATE'; payload: Partial<K1ProviderState['reconnect']> }
  | { type: 'SET_FEATURE_FLAG'; payload: { flag: keyof K1ProviderState['featureFlags']; value: boolean } }
  | { type: 'INCREMENT_TELEMETRY'; payload: { metric: string; value?: number } }
  | { type: 'UPDATE_TELEMETRY'; payload: K1TelemetryState }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'RESET_STATE' };

/**
 * Initial state for K1 provider
 */
const initialState: K1ProviderState = {
  connection: 'disconnected',
  deviceInfo: null,
  transport: {
    wsAvailable: false,
    restAvailable: false,
    wsDisabled: false,
    activeTransport: 'rest',
  },
  reconnect: {
    attemptCount: 0,
    nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
    maxDelay: K1_DEFAULTS.RECONNECT.MAX_DELAY,
    isActive: false,
  },
  selectedPatternId: null,
  parameters: K1_DEFAULTS.PARAMETERS,
  activePaletteId: 0,
  lastError: null,
  errorHistory: [],
  featureFlags: K1_DEFAULTS.FEATURE_FLAGS,
  telemetry: K1_DEFAULTS.TELEMETRY,
  recording: false,
};

/**
 * K1 provider state reducer
 */
function k1Reducer(state: K1ProviderState, action: K1Action): K1ProviderState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connection: action.payload,
      };

    case 'SET_DEVICE_INFO':
      return {
        ...state,
        deviceInfo: action.payload,
      };

    case 'SET_SELECTED_PATTERN':
      return {
        ...state,
        selectedPatternId: action.payload,
      };

    case 'SET_PARAMETERS':
      return {
        ...state,
        parameters: action.payload,
      };

    case 'UPDATE_PARAMETERS':
      return {
        ...state,
        parameters: {
          ...state.parameters,
          ...action.payload,
        },
      };

    case 'SET_PALETTE':
      return {
        ...state,
        activePaletteId: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        lastError: action.payload,
        errorHistory: [action.payload, ...state.errorHistory].slice(0, 10), // Keep last 10 errors
        telemetry: K1Telemetry.updateForError(state.telemetry, action.payload),
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        lastError: null,
      };

    case 'CLEAR_ERROR_HISTORY':
      return {
        ...state,
        errorHistory: [],
      };

    case 'SET_TRANSPORT_FLAGS':
      return {
        ...state,
        transport: {
          ...state.transport,
          ...action.payload,
        },
      };

    case 'SET_RECONNECT_STATE':
      return {
        ...state,
        reconnect: {
          ...state.reconnect,
          ...action.payload,
        },
      };

    case 'SET_FEATURE_FLAG':
      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          [action.payload.flag]: action.payload.value,
        },
      };

    case 'INCREMENT_TELEMETRY':
      const { metric, value = 1 } = action.payload;
      // Handle nested telemetry structure
      if (metric.includes('.')) {
        const [category, subMetric] = metric.split('.');
        const categoryData = state.telemetry[category as keyof typeof state.telemetry];
        if (categoryData && typeof categoryData === 'object') {
          return {
            ...state,
            telemetry: {
              ...state.telemetry,
              [category]: {
                ...categoryData,
                [subMetric]: ((categoryData as any)[subMetric] || 0) + value,
              },
            },
          };
        }
      } else {
        return {
          ...state,
          telemetry: {
            ...state.telemetry,
            [metric]: ((state.telemetry as any)[metric] || 0) + value,
          },
        };
      }
      return state;
    
    case 'UPDATE_TELEMETRY':
      return {
        ...state,
        telemetry: action.payload,
      };

    case 'SET_RECORDING':
      return {
        ...state,
        recording: action.payload,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

interface K1ContextValue {
  state: K1ProviderState;
  actions: K1ProviderActions;
  config: { hmrDelayMs?: number; debugAborts?: boolean };
}

const K1Context = createContext<K1ContextValue | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface K1ProviderProps {
  children: React.ReactNode;
  initialEndpoint?: string;
  initialFeatureFlags?: Partial<K1ProviderState['featureFlags']>;
  /** Back-compat individual prop; prefer devConfig */
  hmrDelayMs?: number;
  /** Centralized dev config */
  devConfig?: { hmrDelayMs?: number; debugAborts?: boolean };
}

export function K1Provider({ 
  children, 
  initialEndpoint = '192.168.1.103',
  initialFeatureFlags = {},
  hmrDelayMs,
  devConfig,
}: K1ProviderProps) {
  const [state, dispatch] = useReducer(k1Reducer, {
    ...initialState,
    featureFlags: {
      ...initialState.featureFlags,
      ...initialFeatureFlags,
    },
  });

  // Resolve global dev config (hmr delay + debug aborts)
  const envHmrDelayRaw = (import.meta as any).env?.VITE_K1_HMR_DELAY_MS;
  const envHmrDelay = typeof envHmrDelayRaw === 'string' ? parseInt(envHmrDelayRaw, 10) : undefined;
  const envDebugAbortsRaw = (import.meta as any).env?.VITE_K1_DEBUG_ABORTS ?? (import.meta as any).env?.VITE_DEBUG_ABORTS;
  const envDebugAborts = typeof envDebugAbortsRaw === 'string' ? (envDebugAbortsRaw.toLowerCase() === 'true' || envDebugAbortsRaw === '1') : undefined;

  // URL/localStorage toggles
  const urlDebugAborts = (() => {
    try {
      const raw = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('debugAborts') : null;
      if (!raw) return undefined;
      const v = raw.toLowerCase();
      return v === 'true' || v === '1' ? true : (v === 'false' || v === '0' ? false : undefined);
    } catch { return undefined; }
  })();
  const lsDebugAborts = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('k1.debugAborts') : null;
      if (!raw) return undefined;
      const v = raw.toLowerCase();
      return v === 'true' || v === '1' ? true : (v === 'false' || v === '0' ? false : undefined);
    } catch { return undefined; }
  })();

  const resolvedHmrDelayMs = typeof (devConfig?.hmrDelayMs ?? hmrDelayMs) === 'number'
    ? (devConfig?.hmrDelayMs ?? hmrDelayMs)
    : (Number.isFinite(envHmrDelay as number) ? envHmrDelay : undefined);

  const resolvedDebugAborts = typeof devConfig?.debugAborts === 'boolean'
    ? devConfig?.debugAborts
    : (typeof urlDebugAborts === 'boolean' ? urlDebugAborts
      : (typeof lsDebugAborts === 'boolean' ? lsDebugAborts
        : (typeof envDebugAborts === 'boolean' ? envDebugAborts : undefined)));

  // Apply abort logging toggle centrally
  useEffect(() => {
    if (typeof resolvedDebugAborts === 'boolean') {
      setAbortLoggingEnabled(resolvedDebugAborts);
    }
  }, [resolvedDebugAborts]);

  // Hydrate transport flags from saved preferences
  useEffect(() => {
    const prefs = loadTransportPrefs();
    if (prefs) {
      dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: { wsDisabled: !prefs.wsEnabled } });
    }
  }, []);

  const k1ClientRef = useRef<K1Client | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showError } = useErrorHandler();

  // Helper to create structured provider error and update state
  const dispatchError = useCallback((type: K1Error['type'], err: unknown, details?: string, retryAttempt?: number) => {
    const original = err instanceof Error ? err : undefined;
    const message = err instanceof Error ? err.message : String(err);
    const error: K1Error = {
      type,
      message,
      details,
      timestamp: new Date(),
      originalError: original,
      retryAttempt,
    };
    dispatch({ type: 'SET_ERROR', payload: error });
    // Telemetry manager error surfacing (toasts) disabled to avoid test-time timers
    // Provider reducer already updates telemetry via UPDATE_FOR_ERROR
  }, []);

  // Compute next reconnection delay with exponential backoff + jitter
  const computeNextDelay = useCallback((attempt: number) => {
    const base = K1_DEFAULTS.RECONNECT.BASE_DELAY * Math.pow(2, Math.max(0, attempt - 1));
    const jitterPct = K1_DEFAULTS.RECONNECT.JITTER_PERCENT / 100;
    const jitter = base * jitterPct * (Math.random() * 2 - 1); // +/- jitter
    return Math.min(K1_DEFAULTS.RECONNECT.MAX_DELAY, Math.max(0, Math.round(base + jitter)));
  }, []);

  // Attempt reconnect logic
  const scheduleReconnect = useCallback((initialAttempt: number = 1) => {
    const attempt = Math.max(1, initialAttempt);
    const delay = computeNextDelay(attempt);
    // Mark reconnection active and record attempt
    dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: true, attemptCount: attempt, nextDelay: delay, lastAttempt: new Date() } });
    dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForConnection(state.telemetry, 'reconnect_attempt') });
    // Schedule actual reconnect
    if (reconnectTimerRef.current) {
      try { clearTimeout(reconnectTimerRef.current); } catch {}
    }
    reconnectTimerRef.current = setTimeout(async () => {
      const client = k1ClientRef.current;
      const endpoint = client?.getEndpoint?.();
      if (!client || !endpoint) {
        dispatchError('network_error', new Error('No client or endpoint for reconnect'));
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false } });
        return;
      }
      try {
        // Attempt to reconnect
        await client.connect(endpoint);
        // On success, reset state
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false, attemptCount: 0, nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY } });
      } catch (err) {
        // Failed attempt
        const nextAttempt = attempt + 1;
        if (nextAttempt > K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS) {
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false } });
          dispatchError('reconnect_giveup', err as any, 'Max reconnection attempts reached', attempt);
          return;
        }
        // Schedule next attempt
        scheduleReconnect(nextAttempt);
      }
    }, delay);
  }, [computeNextDelay, dispatchError, state.telemetry]);

  // Initialize and auto-connect K1 client when endpoint changes
  useEffect(() => {
    if (!initialEndpoint) return;
    const normalize = (ep: string) => ep.startsWith('http://') || ep.startsWith('https://') ? ep : `http://${ep}`;
    const normalized = normalize(initialEndpoint);

    // Update connection state and build client
    dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForConnection(state.telemetry, 'attempt') });
    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
    const client = new K1Client(normalized);
    client.setErrorHandler(showError);

    // Wire up basic event listeners for reconnection handling
    const handleClose = () => {
      // Begin reconnection loop
      scheduleReconnect(1);
    };
    const handleOpen = ({ deviceInfo }: any) => {
      // Successful connection via underlying transport
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
      dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
      // Cancel pending reconnection timers
      if (reconnectTimerRef.current) {
        try { clearTimeout(reconnectTimerRef.current); } catch {}
        reconnectTimerRef.current = null;
      }
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false, attemptCount: 0, nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY } });
    };
    const handleErrorEvt = ({ error }: any) => {
      dispatchError('network_error', error);
    };
    (client as any).on?.('close', handleClose);
    (client as any).on?.('open', handleOpen);
    (client as any).on?.('error', handleErrorEvt);

    // Apply saved transport preference before connecting
    const prefs = loadTransportPrefs();
    if (prefs) {
      client.setWebSocketEnabled(prefs.wsEnabled);
    }

    k1ClientRef.current = client;

    // Attempt connection and hydrate device info
    client.connect(normalized)
      .then((deviceInfo) => {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForConnection(state.telemetry, 'success') });
        saveEndpoint(normalized);
      })
      .catch((error) => {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
        dispatchError('connect_error', error, 'Initial auto-connect failed');
        showError(error, { context: 'connection' });
      });
    return () => {
      // Cleanup listeners
      (client as any).off?.('close', handleClose);
      (client as any).off?.('open', handleOpen);
      (client as any).off?.('error', handleErrorEvt);
    };
  }, [initialEndpoint, showError, scheduleReconnect, state.telemetry, dispatchError]);

  // Persist feature flags whenever they change (and on connection transitions)
  useEffect(() => {
    try {
      localStorage.setItem(K1_STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(state.featureFlags));
    } catch {}
  }, [state.featureFlags, state.connection]);

  // Actions implementation
  const actions: K1ProviderActions = {
    connect: useCallback(async (endpoint?: string) => {
      try {
        const targetEndpoint = endpoint || initialEndpoint;
        if (!targetEndpoint) throw new Error('No endpoint provided');
        const normalize = (ep: string) => ep.startsWith('http://') || ep.startsWith('https://') ? ep : `http://${ep}`;
        const normalized = normalize(targetEndpoint);
        
        dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForConnection(state.telemetry, 'attempt') });
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
        
        const client = new K1Client(normalized);
        client.setErrorHandler(showError);

        // Wire up reconnection listeners
        const handleClose = () => scheduleReconnect(1);
        const handleOpen = ({ deviceInfo }: any) => {
          dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
          dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
          if (reconnectTimerRef.current) { try { clearTimeout(reconnectTimerRef.current); } catch {} reconnectTimerRef.current = null; }
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false, attemptCount: 0, nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY } });
        };
        const handleErrorEvt = ({ error }: any) => dispatchError('network_error', error);
        (client as any).on?.('close', handleClose);
        (client as any).on?.('open', handleOpen);
        (client as any).on?.('error', handleErrorEvt);

        // Apply saved transport preference before connecting
        const prefs = loadTransportPrefs();
        if (prefs) {
          client.setWebSocketEnabled(prefs.wsEnabled);
        }

        k1ClientRef.current = client;
        
        const deviceInfo = await client.connect(normalized);
        
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForConnection(state.telemetry, 'success') });
        
        // Save endpoint for persistence
        saveEndpoint(normalized);
        
      } catch (error) {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
        dispatchError('connect_error', error, 'Manual connect failed');
        showError(error, { context: 'connection' });
        throw error;
      }
    }, [showError, scheduleReconnect, state.telemetry, dispatchError]),

    disconnect: useCallback(async () => {
      try {
        if (k1ClientRef.current) {
          await k1ClientRef.current.disconnect();
          k1ClientRef.current = null;
        }
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: null });
      } catch (error) {
        dispatchError('network_error', error, 'Disconnection failed');
        showError(error, { context: 'disconnection' });
      }
    }, [showError]),

    selectPattern: useCallback(async (patternId: string) => {
      try {
        if (!k1ClientRef.current) throw new Error('Not connected');
        
        await k1ClientRef.current.selectPattern(patternId);
        dispatch({ type: 'SET_SELECTED_PATTERN', payload: patternId });
        
        // Load saved parameters for this pattern
        const savedParams = loadPatternParameters(patternId);
        if (savedParams) {
          dispatch({ type: 'UPDATE_PARAMETERS', payload: savedParams });
        }
        
      } catch (error) {
        dispatchError('rest_error', error, 'Pattern selection failed');
        showError(error, { context: 'pattern-selection', patternId });
        throw error;
      }
    }, [showError]),

    updateParameters: useCallback(async (params: Partial<K1Parameters>) => {
      try {
        if (!k1ClientRef.current) throw new Error('Not connected');
        
        const result = await k1ClientRef.current.updateParameters(params);
        if (!result.success) {
          dispatchError('rest_error', new Error(result.error?.error || 'Parameter update failed'));
        } else {
          dispatch({ type: 'UPDATE_PARAMETERS', payload: params });
          // Telemetry success for parameter update
          dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForSuccess(state.telemetry, 'parameter_update') });
        }
        
        // Save parameters for current pattern
        if (state.selectedPatternId) {
          savePatternParameters(state.selectedPatternId, { ...state.parameters, ...params });
        }
        
        return result;
      } catch (error) {
        dispatchError('rest_error', error, 'Parameter update threw');
        showError(error, { context: 'parameter-update', params });
        throw error;
      }
    }, [showError, state.selectedPatternId, state.parameters, state.telemetry, dispatchError]),

    setPalette: useCallback(async (paletteId: number) => {
      try {
        if (!k1ClientRef.current) throw new Error('Not connected');
        
        const res = await k1ClientRef.current.setPalette(paletteId);
        if (!res.success) {
          dispatchError('rest_error', new Error(res.error?.error || 'Palette update failed'));
        } else {
          dispatch({ type: 'SET_PALETTE', payload: paletteId });
          dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForSuccess(state.telemetry, 'palette_change') });
        }
        
        // Save palette for current pattern
        if (state.selectedPatternId) {
          savePatternPalette(state.selectedPatternId, paletteId);
        }
        
      } catch (error) {
        dispatchError('rest_error', error, 'Palette change threw');
        showError(error, { context: 'palette-change', paletteId });
        throw error;
      }
    }, [showError, state.selectedPatternId, state.telemetry, dispatchError]),

    clearError: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' });
    }, []),

    clearErrorHistory: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR_HISTORY' });
    }, []),

    setFeatureFlag: useCallback((flag: keyof K1ProviderState['featureFlags'], value: boolean) => {
      dispatch({ type: 'SET_FEATURE_FLAG', payload: { flag, value } });
    }, []),

    startReconnection: useCallback(() => {
      // Begin manual reconnection loop
      scheduleReconnect(1);
    }, [scheduleReconnect]),

    stopReconnection: useCallback(() => {
      if (reconnectTimerRef.current) {
        try { clearTimeout(reconnectTimerRef.current); } catch {}
        reconnectTimerRef.current = null;
      }
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false, attemptCount: 0, nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY } });
    }, []),

    setWebSocketEnabled: useCallback((enabled: boolean) => {
      if (k1ClientRef.current) {
        k1ClientRef.current.setWebSocketEnabled(enabled);
      }
      dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: { wsDisabled: !enabled } });
      // Persist transport preference
      const autoReconnect = state.featureFlags.autoReconnect;
      saveTransportPrefs({ wsEnabled: enabled, preferredTransport: enabled ? 'ws' : 'rest', autoReconnect });
      // Broadcast transport change for observability
      try {
        window.dispatchEvent(new CustomEvent('k1:transportChange', {
          detail: { preferredTransport: enabled ? 'ws' : 'rest', wsEnabled: enabled }
        }));
      } catch {}
    }, [state.featureFlags]),

    getTransportStatus: useCallback(() => {
      if (k1ClientRef.current) {
        return k1ClientRef.current.getTransportStatus();
      }
      return {
        wsAvailable: false,
        wsEnabled: true,
        restAvailable: false,
        activeTransport: 'rest' as const,
        lastWSError: null,
      };
    }, []),

    testTransportRouting: useCallback(async () => {
      if (!k1ClientRef.current) throw new Error('Not connected');
      return await k1ClientRef.current.updateParameters({});
    }, []),

    backupConfig: useCallback(async () => {
      if (!k1ClientRef.current) throw new Error('Not connected');
      try {
        const res = await k1ClientRef.current.backupConfig();
        dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForSuccess(state.telemetry, 'backup') });
        return res;
      } catch (error) {
        dispatchError('backup_error', error);
        throw error;
      }
    }, [state.telemetry, dispatchError]),

    restoreConfig: useCallback(async (config) => {
      if (!k1ClientRef.current) throw new Error('Not connected');
      try {
        const res = await k1ClientRef.current.restoreConfig(config);
        dispatch({ type: 'UPDATE_TELEMETRY', payload: K1Telemetry.updateForSuccess(state.telemetry, 'restore') });
        return res;
      } catch (error) {
        dispatchError('restore_error', error);
        throw error;
      }
    }, [state.telemetry, dispatchError]),

    getStorageInfo: useCallback(() => {
      // Mock implementation - in real app this would analyze localStorage
      return {
        totalKeys: 0,
        k1Keys: 0,
        totalSize: 0,
        k1Size: 0,
        metadata: {},
        health: 'good' as const,
        issues: [],
      };
    }, []),

    cleanupStorage: useCallback((maxAge?: number) => {
      // Mock implementation
      return { removed: [], errors: [] };
    }, []),

    exportStorageData: useCallback(() => {
      // Mock implementation
      return { success: true, data: {} };
    }, []),

    importStorageData: useCallback((data: any) => {
      // Mock implementation
      return { success: true, imported: [], errors: [] };
    }, []),

    getTelemetryState: useCallback(() => {
      return state.telemetry;
    }, [state.telemetry]),

    resetTelemetry: useCallback(() => {
      dispatch({ type: 'UPDATE_TELEMETRY', payload: K1_DEFAULTS.TELEMETRY });
    }, []),

    registerTelemetryHook: useCallback((hook) => {
      // Mock implementation - return unregister function
      return () => {};
    }, []),

    setErrorSurfaceConfig: useCallback((config) => {
      // Mock implementation
    }, []),

    getErrorSurfaceConfig: useCallback(() => {
      // Mock implementation
      return {} as any;
    }, []),

    subscribeRealtime: useCallback((handler) => {
      // Mock implementation - return unsubscribe function
      return () => {};
    }, []),

    subscribeAudio: useCallback((handler) => {
      // Mock implementation - return unsubscribe function
      return () => {};
    }, []),

    subscribePerformance: useCallback((handler) => {
      // Mock implementation - return unsubscribe function
      return () => {};
    }, []),

    startSessionRecording: useCallback(() => {
      sessionRecorder.start();
      dispatch({ type: 'SET_RECORDING', payload: true });
    }, []),

    stopSessionRecording: useCallback(() => {
      sessionRecorder.stop();
      dispatch({ type: 'SET_RECORDING', payload: false });
    }, []),

    exportSessionRecording: useCallback(() => {
      // Mock implementation
      return { success: true, data: {} };
    }, []),
  };

  const contextValue: K1ContextValue = {
    state,
    actions,
    config: { hmrDelayMs: resolvedHmrDelayMs, debugAborts: resolvedDebugAborts },
  };

  return (
    <K1Context.Provider value={{ state, actions, config: { hmrDelayMs: resolvedHmrDelayMs, debugAborts: resolvedDebugAborts } }}>
      {children}
      { (import.meta as any).env?.DEV && (
        <HMRDelayOverlay />
      ) }
    </K1Context.Provider>
  );
}

/**
 * Hook to access K1 provider state and actions
 */
export function useK1(): K1ContextValue {
  const context = useContext(K1Context);
  if (!context) {
    throw new Error('useK1 must be used within a K1Provider');
  }
  return context;
}

/**
 * Hook to access only K1 state (for components that don't need actions)
 */
export function useK1State(): K1ProviderState {
  return useK1().state;
}

/**
 * Hook to access only K1 actions (for components that don't need state)
 */
export function useK1Actions(): K1ProviderActions {
  return useK1().actions;
}

export function useK1Config(): { hmrDelayMs?: number; debugAborts?: boolean } {
  return useK1().config;
}