// K1.reinvented TypeScript type definitions
// Based on the existing K1 firmware API structure

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export interface K1Pattern {
  index: number;
  id: string;
  name: string;
  description: string;
  is_audio_reactive: boolean;
}

export interface K1PatternResponse {
  patterns: K1Pattern[];
  current_pattern: number;
}

export interface K1Parameters {
  // Global visual controls (0.0-1.0 range in firmware, 0-100% in UI)
  brightness: number;
  softness: number;
  color: number;
  color_range: number;
  saturation: number;
  warmth: number;
  background: number;
  dithering: number; // 0-100 (UI) → 0.0-1.0 (firmware)
  
  // Pattern-specific controls
  speed: number;
  palette_id: number;
  
  // Custom parameters for advanced pattern control
  custom_param_1: number;
  custom_param_2: number;
  custom_param_3: number;
}

export interface K1AudioConfig {
  microphone_gain: number; // 0.5-2.0 range
}

export interface K1AudioData {
  spectrum: number[];        // 64 frequency bins
  chromagram: number[];      // 12 musical notes  
  vu_level: number;         // Overall volume level
  vu_level_raw: number;     // Unfiltered volume
  tempo_confidence: number; // Beat detection confidence
  novelty_curve: number;    // Spectral flux
  update_counter: number;   // Freshness tracking
  timestamp_us: number;     // Timing information
}

export interface K1PerformanceData {
  fps: number;
  frame_time_us: number;
  cpu_percent: number;
  memory_percent: number;
  memory_free_kb: number;
  temperature?: number;
}

export interface K1RealtimeData {
  audio?: K1AudioData;
  performance?: K1PerformanceData;
  parameters?: K1Parameters;
  pattern_changed?: {
    index: number;
    name: string;
  };
}

/** @deprecated Use K1ConnectionState from provider types */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// UI-specific types for parameter display
export interface K1ParameterUI {
  brightness: number;    // 0-100%
  speed: number;         // 0-100%
  saturation: number;    // 0-100%
  warmth: number;        // 0-100%
  softness: number;      // 0-100%
  background: number;    // 0-100%
  dithering: number;     // 0-100% (switch maps to 100/0)
  palette_id: number;    // 0-32
}

// Palette information (matches firmware palettes.h)
export interface K1Palette {
  id: number;
  name: string;
  gradient: string; // CSS gradient for preview
}

// K1 pattern categories for UI organization
export type K1PatternCategory = 'static' | 'audio-reactive' | 'beat-reactive' | 'procedural';

export interface K1PatternWithCategory extends K1Pattern {
  category: K1PatternCategory;
  icon: string; // Lucide icon name
  color: string; // CSS color for theming
}

// Error types for API responses
export interface K1ApiError {
  error: string;
  details?: string;
}

export interface K1ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: K1ApiError;
  clamped?: boolean; // For parameter updates that were clamped to valid ranges
}

// ============================================================================
// PROVIDER SYSTEM TYPES (Task 2.1)
// ============================================================================

/**
 * Transport layer for K1 communication
 */
export type K1Transport = 'ws' | 'rest';

/**
 * Enhanced connection state for provider system
 */
export type K1ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Device information with extended metadata
 */
export interface K1DeviceInfo {
  device: string;
  firmware: string;
  uptime: number;
  ip: string;
  mac: string;
  /** Last successful connection timestamp */
  lastSeen?: Date;
  /** Connection latency in milliseconds */
  latency?: number;
}

/**
 * Error categories for centralized error handling
 */
export type K1ErrorType = 
  | 'connect_error'
  | 'reconnect_giveup' 
  | 'ws_send_error'
  | 'rest_error'
  | 'validation_error'
  | 'timeout_error'
  | 'network_error'
  | 'backup_error'
  | 'restore_error';

/**
 * Structured error with classification and context
 */
export interface K1Error {
  type: K1ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  /** Original error object for debugging */
  originalError?: Error;
  /** Retry attempt number when applicable */
  retryAttempt?: number;
}

/**
 * Reconnection backoff state
 */
export interface K1ReconnectState {
  /** Current attempt number (0 = not reconnecting) */
  attemptCount: number;
  /** Next retry delay in milliseconds */
  nextDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Whether reconnection is active */
  isActive: boolean;
  /** Timestamp of last attempt */
  lastAttempt?: Date;
}

/**
 * Transport availability flags
 */
export interface K1TransportFlags {
  /** WebSocket transport available */
  wsAvailable: boolean;
  /** REST transport available */
  restAvailable: boolean;
  /** WebSocket explicitly disabled by user/config */
  wsDisabled: boolean;
  /** Current active transport */
  activeTransport: K1Transport;
}

/**
 * Complete K1 provider state
 */
export interface K1ProviderState {
  // Connection
  connection: K1ConnectionState;
  deviceInfo: K1DeviceInfo | null;
  transport: K1TransportFlags;
  reconnect: K1ReconnectState;
  
  // Current state
  selectedPatternId: string | null;
  parameters: K1Parameters;
  activePaletteId: number;
  
  // Error handling
  lastError: K1Error | null;
  errorHistory: K1Error[];
  
  // Feature flags
  featureFlags: {
    autoReconnect: boolean;
    persistState: boolean;
    enableTelemetry: boolean;
  };
  
  // Enhanced telemetry with detailed metrics
  telemetry: K1TelemetryState;
  recording: boolean;
}

/**
 * K1 provider actions
 */
export interface K1ProviderActions {
  // Connection management
  connect: (endpoint?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Pattern control
  selectPattern: (patternId: string) => Promise<void>;
  
  updateParameters: (params: Partial<K1Parameters>) => Promise<K1ApiResponse<{ params: K1Parameters }>>;
  
  setPalette: (paletteId: number) => Promise<void>;
  
  clearError: () => void;
  clearErrorHistory: () => void;
  
  setFeatureFlag: (flag: keyof K1ProviderState['featureFlags'], value: boolean) => void;
  
  startReconnection: () => void;
  stopReconnection: () => void;
  
  setWebSocketEnabled: (enabled: boolean) => void;
  getTransportStatus: () => {
    wsAvailable: boolean;
    wsEnabled: boolean;
    restAvailable: boolean;
    activeTransport: K1Transport;
    lastWSError: Error | null;
  };
  testTransportRouting: () => Promise<K1ApiResponse<{ params: K1Parameters }>>;
  
  backupConfig: () => Promise<K1ConfigBackup>;
  restoreConfig: (config: K1ConfigBackup) => Promise<K1ConfigRestoreResponse>;
  
  getStorageInfo: () => {
    totalKeys: number;
    k1Keys: number;
    totalSize: number;
    k1Size: number;
    metadata: any;
    health: 'good' | 'warning' | 'error';
    issues: string[];
  };
  cleanupStorage: (maxAge?: number) => { removed: string[]; errors: string[] };
  exportStorageData: () => { success: boolean; data?: any; error?: string };
  importStorageData: (data: any) => { success: boolean; imported: string[]; errors: string[] };
  
  getTelemetryState: () => K1TelemetryState;
  resetTelemetry: () => void;
  registerTelemetryHook: (hook: K1TelemetryHook) => () => void; // Returns unregister function
  setErrorSurfaceConfig: (config: Partial<K1ErrorSurfaceConfig>) => void;
  getErrorSurfaceConfig: () => K1ErrorSurfaceConfig;

  // Realtime subscriptions
  subscribeRealtime: (handler: (data: K1RealtimeData) => void) => () => void;
  subscribeAudio: (handler: (data: K1AudioData) => void) => () => void;
  subscribePerformance: (handler: (data: K1PerformanceData) => void) => () => void;
  startSessionRecording: () => void;
  stopSessionRecording: () => void;
  exportSessionRecording: () => { success: boolean; data?: any; error?: string };
}

/**
 * Event map for typed K1Client events
 */
export interface K1EventMap {
  // Connection events
  open: { endpoint: string; deviceInfo: K1DeviceInfo };
  close: { code: number; reason: string };
  error: { error: K1Error };
  
  // State change events
  paramsUpdated: { parameters: K1Parameters };
  paletteUpdated: { paletteId: number };
  patternSelected: { patternId: string; pattern: K1Pattern };
  deviceInfoUpdated: { deviceInfo: K1DeviceInfo };
  
  // Real-time data events
  realtimeData: K1RealtimeData;
  audioData: K1AudioData;
  performanceData: K1PerformanceData;
  
  // Transport events
  transportChanged: { transport: K1Transport; available: boolean };
  reconnectAttempt: { attempt: number; delay: number };
  reconnectSuccess: { attempt: number; totalTime: number };
  reconnectGiveUp: { totalAttempts: number; totalTime: number };
}

/**
 * Persistence keys for localStorage with versioning
 */
export const K1_STORAGE_KEYS = {
  ENDPOINT: 'k1:v1:endpoint',
  PARAMS: 'k1:v1:params',
  PALETTE: 'k1:v1:palette',
  PATTERN: 'k1:v1:pattern',
  FEATURE_FLAGS: 'k1:v1:featureFlags',
  TRANSPORT_PREFS: 'k1:v1:transportPrefs',
  METADATA: 'k1:v1:metadata',
} as const;

/**
 * Default values for provider state
 */
export const K1_DEFAULTS = {
  PARAMETERS: {
    brightness: 80,
    softness: 50,
    color: 50,
    color_range: 50,
    saturation: 75,
    warmth: 50,
    background: 10,
    dithering: 100,
    speed: 50,
    palette_id: 0,
    custom_param_1: 0,
    custom_param_2: 0,
    custom_param_3: 0,
  } as K1Parameters,
  
  RECONNECT: {
    BASE_DELAY: 500,
    MAX_DELAY: 30000,
    JITTER_PERCENT: 20,
    MAX_ATTEMPTS: 10,
  },
  
  FEATURE_FLAGS: {
    autoReconnect: true,
    persistState: true,
    enableTelemetry: true,
  },
  
  TELEMETRY: {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    errorCounts: {
      connect_error: 0,
      reconnect_giveup: 0,
      ws_send_error: 0,
      rest_error: 0,
      validation_error: 0,
      backup_error: 0,
      restore_error: 0,
    },
    averageLatency: 0,
    latencyHistory: [],
    totalRequests: 0,
    successfulRequests: 0,
    wsConnectionAttempts: 0,
    wsSuccessfulConnections: 0,
    wsErrors: 0,
    restRequests: 0,
    restErrors: 0,
    sessionStartTime: Date.now(),
    totalUptime: 0,
    featureUsage: {
      patternChanges: 0,
      parameterUpdates: 0,
      paletteChanges: 0,
      backups: 0,
      restores: 0,
    },
  } as K1TelemetryState,
  
  ERROR_SURFACE: {
    showToasts: true,
    logToConsole: true,
    reportToTelemetry: true,
    maxErrorHistory: 10,
    errorDisplayDuration: 5000,
  } as K1ErrorSurfaceConfig,
} as const;


/**
 * Enhanced telemetry state with detailed metrics
 */
export interface K1TelemetryState {
  // Connection metrics
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  
  // Error metrics by category
  errorCounts: {
    connect_error: number;
    reconnect_giveup: number;
    ws_send_error: number;
    rest_error: number;
    validation_error: number;
    backup_error: number;
    restore_error: number;
  };
  
  // Performance metrics
  averageLatency: number;
  latencyHistory: number[]; // Last 10 latencies
  totalRequests: number;
  successfulRequests: number;
  
  // Transport metrics
  wsConnectionAttempts: number;
  wsSuccessfulConnections: number;
  wsErrors: number;
  restRequests: number;
  restErrors: number;
  
  // Session metrics
  sessionStartTime: number;
  totalUptime: number;
  lastErrorTime?: number;
  
  // Feature usage
  featureUsage: {
    patternChanges: number;
    parameterUpdates: number;
    paletteChanges: number;
    backups: number;
    restores: number;
  };
}

/**
 * Telemetry event for external reporting
 */
export interface K1TelemetryEvent {
  type: 'connection' | 'error' | 'request' | 'feature_usage' | 'performance';
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Telemetry hook interface for external integrations
 */
export interface K1TelemetryHook {
  onEvent: (event: K1TelemetryEvent) => void;
  onError: (error: K1Error, context?: Record<string, any>) => void;
  onMetric: (metric: string, value: number, tags?: Record<string, string>) => void;
}

/**
 * Error surface configuration
 */
export interface K1ErrorSurfaceConfig {
  showToasts: boolean;
  logToConsole: boolean;
  reportToTelemetry: boolean;
  maxErrorHistory: number;
  errorDisplayDuration: number;
}

/**
 * Persistence metadata for versioning and validation
 */
export interface K1PersistenceMetadata {
  version: string;
  timestamp: number;
  deviceInfo?: {
    device: string;
    firmware: string;
    ip: string;
  };
  userAgent: string;
  schemaVersion: number;
}

/**
 * Versioned storage wrapper for type safety and migration support
 */
export interface K1StorageWrapper<T> {
  version: string;
  timestamp: number;
  data: T;
  metadata: K1PersistenceMetadata;
}

/**
 * Transport preferences for persistence
 */
export interface K1TransportPreferences {
  wsEnabled: boolean;
  preferredTransport: K1Transport;
  autoReconnect: boolean;
}

/**
 * Device discovery types
 */
export interface K1DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  mac: string;
  firmware: string;
  lastSeen: Date;
  rssi?: number; // Signal strength
  discoveryMethod: 'mdns' | 'scan' | 'manual';
}

export interface K1DiscoveryOptions {
  timeout?: number;
  includeOffline?: boolean;
  preferredMethods?: ('mdns' | 'scan')[];
}

export interface K1DiscoveryResult {
  devices: K1DiscoveredDevice[];
  method: 'mdns' | 'scan' | 'hybrid';
  duration: number;
  errors?: string[];
}

/**
 * Configuration backup/restore interfaces
 */
export interface K1ConfigBackup {
  version: string;
  timestamp: string;
  device_info: {
    device: string;
    firmware: string;
    mac: string;
  };
  configuration: {
    patterns: K1Pattern[];
    current_pattern: number;
    parameters: K1Parameters;
    audio_config: K1AudioConfig;
    palette_id: number;
  };
}

export interface K1ConfigRestoreResponse {
  success: boolean;
  message: string;
  restored_items: string[];
  warnings?: string[];
}