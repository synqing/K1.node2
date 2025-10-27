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
  const { showError } = useErrorHandler();

  // Initialize and auto-connect K1 client when endpoint changes
  useEffect(() => {
    if (!initialEndpoint) return;
    const normalize = (ep: string) => ep.startsWith('http://') || ep.startsWith('https://') ? ep : `http://${ep}`;
    const normalized = normalize(initialEndpoint);

    // Update connection state and build client
    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
    const client = new K1Client(normalized);
    client.setErrorHandler(showError);

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
        saveEndpoint(normalized);
      })
      .catch((error) => {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
        showError(error, { context: 'connection' });
      });
  }, [initialEndpoint, showError]);

  // Actions implementation
  const actions: K1ProviderActions = {
    connect: useCallback(async (endpoint?: string) => {
      try {
        const targetEndpoint = endpoint || initialEndpoint;
        if (!targetEndpoint) throw new Error('No endpoint provided');
        const normalize = (ep: string) => ep.startsWith('http://') || ep.startsWith('https://') ? ep : `http://${ep}`;
        const normalized = normalize(targetEndpoint);
        
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
        
        const client = new K1Client(normalized);
        client.setErrorHandler(showError);

        // Apply saved transport preference before connecting
        const prefs = loadTransportPrefs();
        if (prefs) {
          client.setWebSocketEnabled(prefs.wsEnabled);
        }

        k1ClientRef.current = client;
        
        const deviceInfo = await client.connect(normalized);
        
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        
        // Save endpoint for persistence
        saveEndpoint(normalized);
        
      } catch (error) {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
        showError(error, { context: 'connection' });
        throw error;
      }
    }, [showError]),

    disconnect: useCallback(async () => {
      try {
        if (k1ClientRef.current) {
          await k1ClientRef.current.disconnect();
          k1ClientRef.current = null;
        }
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: null });
      } catch (error) {
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
        showError(error, { context: 'pattern-selection', patternId });
        throw error;
      }
    }, [showError]),

    updateParameters: useCallback(async (params: Partial<K1Parameters>) => {
      try {
        if (!k1ClientRef.current) throw new Error('Not connected');
        
        const result = await k1ClientRef.current.updateParameters(params);
        dispatch({ type: 'UPDATE_PARAMETERS', payload: params });
        
        // Save parameters for current pattern
        if (state.selectedPatternId) {
          savePatternParameters(state.selectedPatternId, { ...state.parameters, ...params });
        }
        
        return result;
      } catch (error) {
        showError(error, { context: 'parameter-update', params });
        throw error;
      }
    }, [showError, state.selectedPatternId, state.parameters]),

    setPalette: useCallback(async (paletteId: number) => {
      try {
        if (!k1ClientRef.current) throw new Error('Not connected');
        
        await k1ClientRef.current.setPalette(paletteId);
        dispatch({ type: 'SET_PALETTE', payload: paletteId });
        
        // Save palette for current pattern
        if (state.selectedPatternId) {
          savePatternPalette(state.selectedPatternId, paletteId);
        }
        
      } catch (error) {
        showError(error, { context: 'palette-change', paletteId });
        throw error;
      }
    }, [showError, state.selectedPatternId]),

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
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: true } });
    }, []),

    stopReconnection: useCallback(() => {
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false } });
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
      return await k1ClientRef.current.backupConfig();
    }, []),

    restoreConfig: useCallback(async (config) => {
      if (!k1ClientRef.current) throw new Error('Not connected');
      return await k1ClientRef.current.restoreConfig(config);
    }, []),

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