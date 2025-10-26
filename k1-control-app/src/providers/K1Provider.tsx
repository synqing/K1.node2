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
  // K1EventMap, // TODO: Will be used for WebSocket events in subtask 2.5
  K1_DEFAULTS,
  K1_STORAGE_KEYS,
} from '../types/k1-types';

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
  | { type: 'INCREMENT_TELEMETRY'; payload: { metric: keyof K1ProviderState['telemetry']; value?: number } }
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
  telemetry: {
    connectionAttempts: 0,
    successfulConnections: 0,
    totalErrors: 0,
    averageLatency: 0,
  },
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
        telemetry: {
          ...state.telemetry,
          totalErrors: state.telemetry.totalErrors + 1,
        },
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
      return {
        ...state,
        telemetry: {
          ...state.telemetry,
          [metric]: state.telemetry[metric] + value,
        },
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
}

const K1Context = createContext<K1ContextValue | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface K1ProviderProps {
  children: React.ReactNode;
  /** Initial endpoint for connection */
  initialEndpoint?: string;
  /** Override default feature flags */
  initialFeatureFlags?: Partial<K1ProviderState['featureFlags']>;
}

export function K1Provider({ 
  children, 
  initialEndpoint = '192.168.1.100',
  initialFeatureFlags = {},
}: K1ProviderProps) {
  const [state, dispatch] = useReducer(k1Reducer, {
    ...initialState,
    featureFlags: {
      ...initialState.featureFlags,
      ...initialFeatureFlags,
    },
  });

  // Refs for managing client and timers
  const clientRef = useRef<K1Client | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Create a structured error with classification
   */
  const createError = useCallback((
    type: K1ErrorType,
    message: string,
    details?: string,
    originalError?: Error,
    retryAttempt?: number
  ): K1Error => ({
    type,
    message,
    details,
    timestamp: new Date(),
    originalError,
    retryAttempt,
  }), []);

  /**
   * Calculate exponential backoff delay with jitter
   * Implements: delay = min(30000, base * 2^n) with ±20% jitter
   */
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const baseDelay = K1_DEFAULTS.RECONNECT.BASE_DELAY; // 500ms
    const maxDelay = K1_DEFAULTS.RECONNECT.MAX_DELAY;   // 30000ms
    const jitterPercent = K1_DEFAULTS.RECONNECT.JITTER_PERCENT; // 20%
    
    // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Calculate jitter band: ±20% of the exponential delay
    const jitterRange = exponentialDelay * (jitterPercent / 100);
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random value between -jitterRange and +jitterRange
    
    // Apply jitter and ensure minimum delay of 0
    const finalDelay = Math.max(0, exponentialDelay + jitter);
    
    return Math.round(finalDelay); // Round to avoid fractional milliseconds
  }, []);

  /**
   * Clear any active reconnection timer
   */
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // ============================================================================
  // PROVIDER ACTIONS IMPLEMENTATION
  // ============================================================================

  const actions: K1ProviderActions = {
    /**
     * Connect to K1 device
     */
    connect: useCallback(async (endpoint?: string) => {
      const targetEndpoint = endpoint || initialEndpoint;
      
      try {
        // Clear any existing reconnection
        clearReconnectTimer();
        
        // Update connection state
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
        dispatch({ type: 'INCREMENT_TELEMETRY', payload: { metric: 'connectionAttempts' } });
        
        // Create new client if needed
        if (!clientRef.current) {
          clientRef.current = new K1Client(targetEndpoint);
        }
        
        // Test connection
        const isConnected = await clientRef.current.testConnection();
        if (!isConnected) {
          throw new Error('Connection test failed');
        }
        
        // Get device info
        const deviceInfo = await clientRef.current.getDeviceInfo();
        
        // Connection successful
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        dispatch({ type: 'INCREMENT_TELEMETRY', payload: { metric: 'successfulConnections' } });
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { attemptCount: 0, isActive: false } });
        
        // Persist endpoint if feature enabled
        if (state.featureFlags.persistState) {
          localStorage.setItem(K1_STORAGE_KEYS.ENDPOINT, targetEndpoint);
        }
        
      } catch (error) {
        const k1Error = createError(
          'connect_error',
          `Failed to connect to ${targetEndpoint}`,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
        
        // Start auto-reconnect if enabled
        if (state.featureFlags.autoReconnect) {
          startReconnection();
        }
        
        throw k1Error;
      }
    }, [initialEndpoint, state.featureFlags, createError, clearReconnectTimer]),

    /**
     * Disconnect from K1 device
     */
    disconnect: useCallback(async () => {
      clearReconnectTimer();
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
      dispatch({ type: 'SET_DEVICE_INFO', payload: null });
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { attemptCount: 0, isActive: false } });
    }, [clearReconnectTimer]),

    /**
     * Select a pattern
     */
    selectPattern: useCallback(async (patternId: string) => {
      if (!clientRef.current || state.connection !== 'connected') {
        throw createError('validation_error', 'Not connected to device');
      }

      try {
        await clientRef.current.selectPattern(parseInt(patternId));
        dispatch({ type: 'SET_SELECTED_PATTERN', payload: patternId });
        
        // Persist pattern if feature enabled
        if (state.featureFlags.persistState) {
          localStorage.setItem(K1_STORAGE_KEYS.PATTERN, patternId);
        }
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Failed to select pattern',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, state.featureFlags.persistState, createError]),

    /**
     * Update parameters
     */
    updateParameters: useCallback(async (params: Partial<K1Parameters>) => {
      if (!clientRef.current || state.connection !== 'connected') {
        throw createError('validation_error', 'Not connected to device');
      }

      try {
        const response = await clientRef.current.updateParameters(params);
        dispatch({ type: 'UPDATE_PARAMETERS', payload: params });
        
        // Persist parameters if feature enabled
        if (state.featureFlags.persistState) {
          const updatedParams = { ...state.parameters, ...params };
          localStorage.setItem(K1_STORAGE_KEYS.PARAMS, JSON.stringify(updatedParams));
        }
        
        return response;
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Failed to update parameters',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, state.parameters, state.featureFlags.persistState, createError]),

    /**
     * Set palette
     */
    setPalette: useCallback(async (paletteId: number) => {
      if (!clientRef.current || state.connection !== 'connected') {
        throw createError('validation_error', 'Not connected to device');
      }

      try {
        await clientRef.current.updateParameters({ palette_id: paletteId });
        dispatch({ type: 'SET_PALETTE', payload: paletteId });
        
        // Persist palette if feature enabled
        if (state.featureFlags.persistState) {
          localStorage.setItem(K1_STORAGE_KEYS.PALETTE, paletteId.toString());
        }
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Failed to set palette',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, state.featureFlags.persistState, createError]),

    /**
     * Clear current error
     */
    clearError: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' });
    }, []),

    /**
     * Clear error history
     */
    clearErrorHistory: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR_HISTORY' });
    }, []),

    /**
     * Set feature flag
     */
    setFeatureFlag: useCallback((flag: keyof K1ProviderState['featureFlags'], value: boolean) => {
      dispatch({ type: 'SET_FEATURE_FLAG', payload: { flag, value } });
      
      // Persist feature flags
      const updatedFlags = { ...state.featureFlags, [flag]: value };
      localStorage.setItem(K1_STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(updatedFlags));
    }, [state.featureFlags]),
  };

  // ============================================================================
  // RECONNECTION LOGIC
  // ============================================================================

  /**
   * Start exponential backoff reconnection
   */
  const startReconnection = useCallback(() => {
    if (state.reconnect.isActive || state.connection === 'connected') {
      return;
    }

    const attemptCount = state.reconnect.attemptCount + 1;
    const delay = calculateBackoffDelay(attemptCount);

    dispatch({ 
      type: 'SET_RECONNECT_STATE', 
      payload: { 
        attemptCount, 
        nextDelay: delay, 
        isActive: true,
        lastAttempt: new Date(),
      } 
    });

    // Create abort controller for this reconnection attempt
    abortControllerRef.current = new AbortController();

    reconnectTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      try {
        await actions.connect();
      } catch (error) {
        // If we haven't exceeded max attempts, try again
        if (attemptCount < K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS) {
          startReconnection();
        } else {
          // Give up reconnecting
          const giveUpError = createError(
            'reconnect_giveup',
            `Failed to reconnect after ${attemptCount} attempts`,
            `Total time: ${Date.now() - (state.reconnect.lastAttempt?.getTime() || Date.now())}ms`
          );
          dispatch({ type: 'SET_ERROR', payload: giveUpError });
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { isActive: false } });
        }
      }
    }, delay);
  }, [state.reconnect, state.connection, calculateBackoffDelay, actions, createError]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  /**
   * Initialize provider on mount
   */
  useEffect(() => {
    // Load persisted state if feature enabled
    if (state.featureFlags.persistState) {
      try {
        // Load endpoint
        const savedEndpoint = localStorage.getItem(K1_STORAGE_KEYS.ENDPOINT);
        if (savedEndpoint) {
          // Auto-connect to saved endpoint
          actions.connect(savedEndpoint).catch(() => {
            // Ignore connection errors on startup
          });
        }

        // Load parameters
        const savedParams = localStorage.getItem(K1_STORAGE_KEYS.PARAMS);
        if (savedParams) {
          const params = JSON.parse(savedParams) as K1Parameters;
          dispatch({ type: 'SET_PARAMETERS', payload: params });
        }

        // Load palette
        const savedPalette = localStorage.getItem(K1_STORAGE_KEYS.PALETTE);
        if (savedPalette) {
          dispatch({ type: 'SET_PALETTE', payload: parseInt(savedPalette) });
        }

        // Load pattern
        const savedPattern = localStorage.getItem(K1_STORAGE_KEYS.PATTERN);
        if (savedPattern) {
          dispatch({ type: 'SET_SELECTED_PATTERN', payload: savedPattern });
        }

        // Load feature flags
        const savedFlags = localStorage.getItem(K1_STORAGE_KEYS.FEATURE_FLAGS);
        if (savedFlags) {
          const flags = JSON.parse(savedFlags);
          Object.entries(flags).forEach(([flag, value]) => {
            dispatch({ 
              type: 'SET_FEATURE_FLAG', 
              payload: { flag: flag as keyof K1ProviderState['featureFlags'], value: Boolean(value) } 
            });
          });
        }
      } catch (error) {
        console.warn('Failed to load persisted K1 state:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      clearReconnectTimer();
    };
  }, []); // Only run on mount

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: K1ContextValue = {
    state,
    actions,
  };

  return (
    <K1Context.Provider value={contextValue}>
      {children}
    </K1Context.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

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