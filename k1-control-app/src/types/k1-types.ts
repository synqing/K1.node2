// K1.reinvented TypeScript type definitions
// Based on the existing K1 firmware API structure

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

export interface K1DeviceInfo {
  device: string;
  firmware: string;
  uptime: number;
  ip: string;
  mac: string;
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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface K1ConnectionState {
  status: ConnectionStatus;
  ip: string;
  lastUpdate: Date | null;
  error?: string;
  latency?: number;
}

// UI-specific types for parameter display
export interface K1ParameterUI {
  brightness: number;    // 0-100%
  speed: number;         // 0-100%
  saturation: number;    // 0-100%
  warmth: number;        // 0-100%
  softness: number;      // 0-100%
  background: number;    // 0-100%
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