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
} from '../types/k1-types';
import { K1Telemetry, telemetryManager } from '../utils/telemetry-manager';
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
  const storageListenerCleanupRef = useRef<(() => void) | null>(null);

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
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Start WebSocket connection for real-time data
   */
  const startWebSocketConnection = useCallback(() => {
    if (!clientRef.current || state.connection !== 'connected') {
      return;
    }

    clientRef.current.connectWebSocket(
      // Handle real-time data updates
      (data) => {
        // TODO: Handle real-time data updates (audio, performance, etc.)
        // This will be expanded in future subtasks
        console.log('Received real-time data:', data);
      },
      // Handle WebSocket status changes
      (_status) => {
        const transportStatus = clientRef.current?.getTransportStatus();
        if (transportStatus) {
          dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: {
            wsAvailable: transportStatus.wsAvailable,
            activeTransport: transportStatus.activeTransport as 'ws' | 'rest',
          } });
        }
      }
    );
  }, [state.connection]);

  /**
   * Stop WebSocket connection
   */
  const stopWebSocketConnection = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: {
        wsAvailable: false,
        activeTransport: 'rest',
      } });
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
        
        // Update telemetry for connection attempt
        const updatedTelemetry = K1Telemetry.updateForConnection(state.telemetry, 'attempt');
        dispatch({ type: 'UPDATE_TELEMETRY', payload: updatedTelemetry });
        
        // Record telemetry event
        K1Telemetry.recordEvent({
          type: 'connection',
          category: 'connect',
          action: 'attempt',
          label: targetEndpoint,
          timestamp: Date.now(),
        });
        
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
        
        // Update transport state
        const transportStatus = clientRef.current.getTransportStatus();
        dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: {
          restAvailable: true,
          wsAvailable: transportStatus.wsAvailable,
          wsDisabled: !transportStatus.wsEnabled,
          activeTransport: transportStatus.activeTransport as 'ws' | 'rest',
        } });
        
        // Connection successful - reset all reconnection state
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        
        // Update telemetry for successful connection
        const updatedTelemetrySuccess = K1Telemetry.updateForConnection(state.telemetry, 'success');
        dispatch({ type: 'UPDATE_TELEMETRY', payload: updatedTelemetrySuccess });
        
        // Record telemetry event
        K1Telemetry.recordEvent({
          type: 'connection',
          category: 'connect',
          action: 'success',
          label: targetEndpoint,
          metadata: { deviceInfo },
          timestamp: Date.now(),
        });
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
          attemptCount: 0, 
          isActive: false,
          nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
        } });
        
        // Persist endpoint if feature enabled
        if (state.featureFlags.persistState) {
          saveEndpoint(targetEndpoint);
        }

        // Start WebSocket connection if enabled
        if (state.transport.wsDisabled === false) {
          startWebSocketConnection();
        }
        
      } catch (error) {
        const k1Error = createError(
          'connect_error',
          `Failed to connect to ${targetEndpoint}`,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        
        // Handle error with telemetry and surfaces
        K1Telemetry.handleError(k1Error, { endpoint: targetEndpoint });
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
     * Cancels any active reconnection attempts
     */
    disconnect: useCallback(async () => {
      // Cancel any active reconnection
      clearReconnectTimer();
      
      // Disconnect WebSocket if active
      stopWebSocketConnection();
      
      // Update state
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
      dispatch({ type: 'SET_DEVICE_INFO', payload: null });
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
        attemptCount: 0, 
        isActive: false,
        nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
      } });
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
          safeSetItem(K1_STORAGE_KEYS.PATTERN, patternId);
          
          // Load per-pattern parameters and palette when pattern changes
          const patternParams = loadPatternParameters(patternId);
          const patternPalette = loadPatternPalette(patternId);
          
          if (patternParams) {
            dispatch({ type: 'SET_PARAMETERS', payload: patternParams });
          }
          
          if (patternPalette !== null) {
            dispatch({ type: 'SET_PALETTE', payload: patternPalette });
          }
        }
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Failed to select pattern',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        K1Telemetry.handleError(k1Error, { patternId });
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
        const startTime = Date.now();
        const response = await clientRef.current.updateParameters(params);
        const latency = Date.now() - startTime;
        
        dispatch({ type: 'UPDATE_PARAMETERS', payload: params });
        
        // Persist parameters if feature enabled (per-pattern)
        if (state.featureFlags.persistState && state.selectedPatternId) {
          const updatedParams = { ...state.parameters, ...params };
          savePatternParameters(state.selectedPatternId, updatedParams);
        }

        // Record successful parameter update
        const updatedTelemetry = K1Telemetry.updateForSuccess(state.telemetry, 'parameter_update', latency);
        dispatch({ type: 'UPDATE_TELEMETRY', payload: updatedTelemetry });
        
        K1Telemetry.recordEvent({
          type: 'feature_usage',
          category: 'parameters',
          action: 'update',
          metadata: { params, latency },
          timestamp: Date.now(),
        });
        
        return response;
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Failed to update parameters',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        K1Telemetry.handleError(k1Error, { params });
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
        
        // Persist palette if feature enabled (per-pattern)
        if (state.featureFlags.persistState && state.selectedPatternId) {
          savePatternPalette(state.selectedPatternId, paletteId);
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

    /**
     * Manually start reconnection process
     */
    startReconnection: useCallback(() => {
      if (state.connection !== 'connected') {
        startReconnection();
      }
    }, [state.connection]),

    /**
     * Stop any active reconnection attempts
     */
    stopReconnection: useCallback(() => {
      clearReconnectTimer();
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
        isActive: false,
        attemptCount: 0,
        nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
      } });
    }, [clearReconnectTimer]),

    /**
     * Enable or disable WebSocket transport
     */
    setWebSocketEnabled: useCallback((enabled: boolean) => {
      if (clientRef.current) {
        clientRef.current.setWebSocketEnabled(enabled);
        
        if (enabled && state.connection === 'connected') {
          startWebSocketConnection();
        } else if (!enabled) {
          stopWebSocketConnection();
        }
        
        dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: {
          wsDisabled: !enabled,
          activeTransport: enabled && state.transport.wsAvailable ? 'ws' : 'rest',
        } });
      }
    }, [state.connection, state.transport.wsAvailable, startWebSocketConnection, stopWebSocketConnection]),

    /**
     * Get current transport status
     */
    getTransportStatus: useCallback(() => {
      const status = clientRef.current?.getTransportStatus() || {
        wsAvailable: false,
        wsEnabled: true,
        restAvailable: false,
        activeTransport: 'rest',
        lastWSError: null,
      };
      return {
        ...status,
        activeTransport: status.activeTransport as K1Transport,
      };
    }, []),

    /**
     * Test transport routing by sending a parameter update
     */
    testTransportRouting: useCallback(async () => {
      if (!clientRef.current || state.connection !== 'connected') {
        throw createError('validation_error', 'Not connected to device');
      }

      try {
        // Send a small parameter update to test routing
        const testParams = { brightness: state.parameters.brightness };
        const response = await clientRef.current.updateParameters(testParams);
        
        // Update transport status after the test
        const transportStatus = clientRef.current.getTransportStatus();
        dispatch({ type: 'SET_TRANSPORT_FLAGS', payload: {
          wsAvailable: transportStatus.wsAvailable,
          activeTransport: transportStatus.activeTransport as 'ws' | 'rest',
        } });
        
        return response;
      } catch (error) {
        const k1Error = createError(
          'rest_error',
          'Transport routing test failed',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, state.parameters.brightness, createError]),

    /**
     * Backup device configuration
     */
    backupConfig: useCallback(async () => {
      if (state.connection !== 'connected' || !clientRef.current) {
        throw createError(
          'backup_error',
          'Cannot backup configuration',
          'Device is not connected'
        );
      }

      try {
        return await clientRef.current.backupConfig();
      } catch (error) {
        const k1Error = createError(
          'backup_error',
          'Failed to backup configuration',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, createError]),

    /**
     * Restore device configuration
     */
    restoreConfig: useCallback(async (configData: any) => {
      if (state.connection !== 'connected' || !clientRef.current) {
        throw createError(
          'restore_error',
          'Cannot restore configuration',
          'Device is not connected'
        );
      }

      try {
        return await clientRef.current.restoreConfig(configData);
      } catch (error) {
        const k1Error = createError(
          'restore_error',
          'Failed to restore configuration',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error : undefined
        );
        dispatch({ type: 'SET_ERROR', payload: k1Error });
        throw k1Error;
      }
    }, [state.connection, createError]),

    /**
     * Get storage information and health status
     */
    getStorageInfo: useCallback(() => {
      return K1PersistenceManager.getStorageInfo();
    }, []),

    /**
     * Clean up old storage entries
     */
    cleanupStorage: useCallback((maxAge?: number) => {
      return K1PersistenceManager.cleanup(maxAge);
    }, []),

    /**
     * Export all K1 data for backup
     */
    exportStorageData: useCallback(() => {
      return K1PersistenceManager.exportData();
    }, []),

    /**
     * Import K1 data from backup
     */
    importStorageData: useCallback((data: any) => {
      const result = K1PersistenceManager.importData(data);
      
      if (result.success) {
        // Trigger rehydration after import
        window.location.reload();
      }
      
      return result;
    }, []),

    /**
     * Get current telemetry state
     */
    getTelemetryState: useCallback(() => {
      return state.telemetry;
    }, [state.telemetry]),

    /**
     * Reset telemetry data
     */
    resetTelemetry: useCallback(() => {
      const resetTelemetry = K1Telemetry.reset();
      dispatch({ type: 'UPDATE_TELEMETRY', payload: resetTelemetry });
    }, []),

    /**
     * Register telemetry hook for external integrations
     */
    registerTelemetryHook: useCallback((hook: K1TelemetryHook) => {
      return telemetryManager.registerHook(hook);
    }, []),

    /**
     * Set error surface configuration
     */
    setErrorSurfaceConfig: useCallback((config: Partial<K1ErrorSurfaceConfig>) => {
      telemetryManager.setErrorSurfaceConfig(config);
    }, []),

    /**
     * Get error surface configuration
     */
    getErrorSurfaceConfig: useCallback(() => {
      return telemetryManager.getErrorSurfaceConfig();
    }, []),
  };

  // ============================================================================
  // RECONNECTION LOGIC
  // ============================================================================

  /**
   * Start exponential backoff reconnection with enhanced jitter and cancellation
   * Implements TaskMaster Subtask 2.4 requirements
   */
  const startReconnection = useCallback(() => {
    // Guard against multiple active reconnection attempts
    if (state.reconnect.isActive || state.connection === 'connected') {
      return;
    }

    // Clear any existing timer to ensure single active timer
    clearReconnectTimer();

    const attemptCount = state.reconnect.attemptCount + 1;
    
    // Check if we've exceeded max attempts before starting
    if (attemptCount > K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS) {
      const giveUpError = createError(
        'reconnect_giveup',
        `Reconnection abandoned after ${K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS} attempts`,
        `Total attempts exceeded maximum threshold`
      );
      dispatch({ type: 'SET_ERROR', payload: giveUpError });
      dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
        isActive: false, 
        attemptCount: 0,
        nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
      } });
      return;
    }

    // Calculate delay with jitter for this attempt
    const delay = calculateBackoffDelay(attemptCount);
    const startTime = Date.now();

    // Update reconnection state for observability
    dispatch({ 
      type: 'SET_RECONNECT_STATE', 
      payload: { 
        attemptCount, 
        nextDelay: delay, 
        isActive: true,
        lastAttempt: new Date(startTime),
      } 
    });

    // Create fresh abort controller for this reconnection cycle
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    // Schedule reconnection attempt
    reconnectTimerRef.current = setTimeout(async () => {
      // Check if reconnection was cancelled
      if (abortSignal.aborted) {
        return;
      }

      // Double-check connection state before attempting
      if (state.connection === 'connected') {
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
          isActive: false, 
          attemptCount: 0,
          nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
        } });
        return;
      }

      try {
        // Attempt reconnection
        await actions.connect();
        
        // Success! Reset reconnection state
        dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
          attemptCount: 0, 
          isActive: false,
          nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
        } });
        
      } catch (error) {
        // Connection failed, check if we should continue trying
        if (!abortSignal.aborted && attemptCount < K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS) {
          // Schedule next attempt
          startReconnection();
        } else if (!abortSignal.aborted) {
          // Give up after max attempts
          const totalTime = Date.now() - startTime;
          const giveUpError = createError(
            'reconnect_giveup',
            `Failed to reconnect after ${attemptCount} attempts`,
            `Total time: ${totalTime}ms, Last error: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined,
            attemptCount
          );
          dispatch({ type: 'SET_ERROR', payload: giveUpError });
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { 
            isActive: false,
            attemptCount: 0,
            nextDelay: K1_DEFAULTS.RECONNECT.BASE_DELAY,
          } });
        }
      }
    }, delay);
  }, [state.reconnect, state.connection, calculateBackoffDelay, actions, createError, clearReconnectTimer]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  /**
   * Initialize provider on mount with enhanced persistence (Subtask 2.6)
   */
  useEffect(() => {
    // Run storage migration and cleanup
    migrateStorage();
    cleanupStorage();
    
    // Load persisted state if feature enabled
    if (state.featureFlags.persistState) {
      try {
        // Load endpoint with validation
        const savedEndpoint = loadEndpoint();
        if (savedEndpoint) {
          // Auto-connect to saved endpoint
          actions.connect(savedEndpoint).catch(() => {
            // Ignore connection errors on startup
          });
        }

        // Load current pattern first
        const savedPattern = safeGetItem(K1_STORAGE_KEYS.PATTERN);
        if (savedPattern) {
          dispatch({ type: 'SET_SELECTED_PATTERN', payload: savedPattern });
          
          // Load per-pattern parameters and palette
          const patternParams = loadPatternParameters(savedPattern);
          const patternPalette = loadPatternPalette(savedPattern);
          
          if (patternParams) {
            dispatch({ type: 'SET_PARAMETERS', payload: patternParams });
          }
          
          if (patternPalette !== null) {
            dispatch({ type: 'SET_PALETTE', payload: patternPalette });
          }
        }

        // Load feature flags with validation
        const savedFlags = safeGetItem(K1_STORAGE_KEYS.FEATURE_FLAGS);
        if (savedFlags) {
          try {
            const flags = JSON.parse(savedFlags);
            if (flags && typeof flags === 'object') {
              Object.entries(flags).forEach(([flag, value]) => {
                if (typeof value === 'boolean') {
                  dispatch({ 
                    type: 'SET_FEATURE_FLAG', 
                    payload: { flag: flag as keyof K1ProviderState['featureFlags'], value } 
                  });
                }
              });
            }
          } catch (error) {
            console.warn('Failed to parse feature flags:', error);
          }
        }
      } catch (error) {
        console.warn('Failed to load persisted K1 state:', error);
      }
    }

    // Set up cross-tab synchronization
    const handleStorageChange: StorageChangeHandler = (key, newValue, oldValue) => {
      console.log(`Storage changed: ${key}`, { newValue, oldValue });
      
      // Handle endpoint changes
      if (key === K1_STORAGE_KEYS.ENDPOINT && newValue) {
        const validEndpoint = validateEndpoint(newValue);
        if (validEndpoint && validEndpoint !== state.deviceInfo?.ip) {
          // Another tab changed the endpoint
          actions.connect(validEndpoint).catch(() => {
            // Ignore connection errors from cross-tab sync
          });
        }
      }
      
      // Handle pattern changes
      if (key === K1_STORAGE_KEYS.PATTERN && newValue && newValue !== state.selectedPatternId) {
        dispatch({ type: 'SET_SELECTED_PATTERN', payload: newValue });
        
        // Load per-pattern data for the new pattern
        const patternParams = loadPatternParameters(newValue);
        const patternPalette = loadPatternPalette(newValue);
        
        if (patternParams) {
          dispatch({ type: 'SET_PARAMETERS', payload: patternParams });
        }
        
        if (patternPalette !== null) {
          dispatch({ type: 'SET_PALETTE', payload: patternPalette });
        }
      }
      
      // Handle per-pattern parameter changes
      if (key.startsWith('k1:v1:params:') && newValue && state.selectedPatternId) {
        const patternId = key.replace('k1:v1:params:', '');
        if (patternId === state.selectedPatternId) {
          try {
            const params = JSON.parse(newValue);
            const validated = validateParameters(params);
            if (validated) {
              dispatch({ type: 'SET_PARAMETERS', payload: validated });
            }
          } catch (error) {
            console.warn('Failed to sync parameters from storage:', error);
          }
        }
      }
      
      // Handle per-pattern palette changes
      if (key.startsWith('k1:v1:palette:') && newValue && state.selectedPatternId) {
        const patternId = key.replace('k1:v1:palette:', '');
        if (patternId === state.selectedPatternId) {
          const paletteId = validatePaletteId(newValue);
          dispatch({ type: 'SET_PALETTE', payload: paletteId });
        }
      }
    };
    
    // Add storage listener for cross-tab sync
    storageListenerCleanupRef.current = addStorageListener(handleStorageChange);

    // Cleanup on unmount
    return () => {
      clearReconnectTimer();
      if (storageListenerCleanupRef.current) {
        storageListenerCleanupRef.current();
      }
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