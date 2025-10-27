import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { K1Client } from '../api/k1-client';
import {
  K1ProviderState,
  K1ProviderActions,
  K1ConnectionState,
  K1Error,
  K1ErrorType,
  K1Parameters,
  K1DeviceInfo,
  K1Transport,
  K1TelemetryState,
  K1TelemetryHook,
  K1ErrorSurfaceConfig,
  // K1EventMap, // TODO: Will be used for WebSocket events in subtask 2.5
  K1_DEFAULTS,
  K1_STORAGE_KEYS,
  K1RealtimeData,
  K1AudioData,
  K1PerformanceData,
} from '../types/k1-types';
import { K1Telemetry, telemetryManager } from '../utils/telemetry-manager';
import { sessionRecorder } from '../utils/session-recorder';
import { useErrorHandler } from '../hooks/useErrorHandler';
import {
  savePatternParameters,
  loadPatternParameters,
  savePatternPalette,
  loadPatternPalette,
  saveEndpoint,
  loadEndpoint,
  safeSetItem,
  safeGetItem,
  addStorageListener,
  migrateStorage,
  cleanupStorage,
  StorageChangeHandler,
} from '../utils/persistence';
import { isAbortError, setAbortLoggingEnabled } from '../utils/error-utils';

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
        return {
          ...state,
          telemetry: {
            ...state.telemetry,
            [category]: {
              ...state.telemetry[category as keyof typeof state.telemetry],
              [subMetric]: (state.telemetry[category as keyof typeof state.telemetry] as any)[subMetric] + value,
            },
          },
        };
      } else {
        return {
          ...state,
          telemetry: {
            ...state.telemetry,
            [metric]: (state.telemetry as any)[metric] + value,
          },
        };
      }
    
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
  initialEndpoint = '192.168.1.100',
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

  const resolvedHmrDelayMs = typeof (devConfig?.hmrDelayMs ?? hmrDelayMs) === 'number'
    ? (devConfig?.hmrDelayMs ?? hmrDelayMs)
    : (Number.isFinite(envHmrDelay as number) ? envHmrDelay : undefined);

  const resolvedDebugAborts = typeof devConfig?.debugAborts === 'boolean'
    ? devConfig?.debugAborts
    : (typeof envDebugAborts === 'boolean' ? envDebugAborts : undefined);

  // Apply abort logging toggle centrally
  useEffect(() => {
    if (typeof resolvedDebugAborts === 'boolean') {
      setAbortLoggingEnabled(resolvedDebugAborts);
    }
  }, [resolvedDebugAborts]);

  const contextValue: K1ContextValue = {
    state,
    actions,
    config: { hmrDelayMs: resolvedHmrDelayMs, debugAborts: resolvedDebugAborts },
  };

  return (
    <K1Context.Provider value={contextValue}>
      {children}
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