/**
 * Enhanced persistence utility for K1 provider state
 * Implements Subtask 2.6 requirements: versioned keys, validation, cross-tab sync
 */

import { K1Parameters, K1_STORAGE_KEYS, K1_DEFAULTS } from '../types/k1-types';

// ============================================================================
// STORAGE KEY GENERATORS
// ============================================================================

/**
 * Generate per-pattern parameter storage key
 */
export function getPatternParamsKey(patternId: string): string {
  return `k1:v1:params:${patternId}`;
}

/**
 * Generate per-pattern palette storage key
 */
export function getPatternPaletteKey(patternId: string): string {
  return `k1:v1:palette:${patternId}`;
}

/**
 * Get all pattern-specific storage keys
 */
export function getPatternStorageKeys(patternId: string) {
  return {
    params: getPatternParamsKey(patternId),
    palette: getPatternPaletteKey(patternId),
    preset: getPatternPresetKey(patternId),
  };
}

// ============================================================================
// DATA VALIDATION AND SANITIZATION
// ============================================================================

/**
 * Validate and sanitize K1Parameters
 */
export function validateParameters(params: any): K1Parameters | null {
  if (!params || typeof params !== 'object') {
    return null;
  }

  try {
    const sanitized: K1Parameters = {
      brightness: clampNumber(params.brightness, 0, 100, K1_DEFAULTS.PARAMETERS.brightness),
      softness: clampNumber(params.softness, 0, 100, K1_DEFAULTS.PARAMETERS.softness),
      color: clampNumber(params.color, 0, 100, K1_DEFAULTS.PARAMETERS.color),
      color_range: clampNumber(params.color_range, 0, 100, K1_DEFAULTS.PARAMETERS.color_range),
      saturation: clampNumber(params.saturation, 0, 100, K1_DEFAULTS.PARAMETERS.saturation),
      warmth: clampNumber(params.warmth, 0, 100, K1_DEFAULTS.PARAMETERS.warmth),
      background: clampNumber(params.background, 0, 100, K1_DEFAULTS.PARAMETERS.background),
      dithering: clampNumber(params.dithering, 0, 100, K1_DEFAULTS.PARAMETERS.dithering),
      speed: clampNumber(params.speed, 0, 100, K1_DEFAULTS.PARAMETERS.speed),
      palette_id: clampNumber(params.palette_id, 0, 32, K1_DEFAULTS.PARAMETERS.palette_id),
      custom_param_1: clampNumber(params.custom_param_1, 0, 100, K1_DEFAULTS.PARAMETERS.custom_param_1),
      custom_param_2: clampNumber(params.custom_param_2, 0, 100, K1_DEFAULTS.PARAMETERS.custom_param_2),
      custom_param_3: clampNumber(params.custom_param_3, 0, 100, K1_DEFAULTS.PARAMETERS.custom_param_3),
    };

    return sanitized;
  } catch (error) {
    console.warn('Failed to validate parameters:', error);
    return null;
  }
}

/**
 * Validate and sanitize palette ID
 */
export function validatePaletteId(paletteId: any): number {
  const id = parseInt(String(paletteId));
  return clampNumber(id, 0, 32, 0);
}

/**
 * Validate and sanitize endpoint
 */
export function validateEndpoint(endpoint: any): string | null {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    return null;
  }

  const trimmed = endpoint.trim();
  
  // Basic IP validation (IPv4)
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  if (ipRegex.test(trimmed)) {
    return trimmed;
  }
  
  // Basic hostname validation
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (hostnameRegex.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Clamp number to range with fallback
 */
function clampNumber(value: any, min: number, max: number, fallback: number): number {
  const num = parseFloat(String(value));
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

// ============================================================================
// PERSISTENCE OPERATIONS
// ============================================================================

/**
 * Safe localStorage setItem with error handling
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Safe localStorage getItem with error handling
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Safe localStorage removeItem with error handling
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Save parameters for a specific pattern
 */
export function savePatternParameters(patternId: string, params: K1Parameters): boolean {
  const key = getPatternParamsKey(patternId);
  const validated = validateParameters(params);
  
  if (!validated) {
    console.warn(`Invalid parameters for pattern ${patternId}`);
    return false;
  }
  
  return safeSetItem(key, JSON.stringify(validated));
}

/**
 * Load parameters for a specific pattern
 */
export function loadPatternParameters(patternId: string): K1Parameters | null {
  const key = getPatternParamsKey(patternId);
  const data = safeGetItem(key);
  
  if (!data) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(data);
    return validateParameters(parsed);
  } catch (error) {
    console.warn(`Failed to parse parameters for pattern ${patternId}:`, error);
    return null;
  }
}

/**
 * Save palette for a specific pattern
 */
export function savePatternPalette(patternId: string, paletteId: number): boolean {
  const key = getPatternPaletteKey(patternId);
  const validated = validatePaletteId(paletteId);
  
  return safeSetItem(key, validated.toString());
}

/**
 * Load palette for a specific pattern
 */
export function loadPatternPalette(patternId: string): number | null {
  const key = getPatternPaletteKey(patternId);
  const data = safeGetItem(key);
  
  if (!data) {
    return null;
  }
  
  return validatePaletteId(data);
}

/**
 * Save global endpoint
 */
export function saveEndpoint(endpoint: string): boolean {
  const validated = validateEndpoint(endpoint);
  
  if (!validated) {
    console.warn('Invalid endpoint:', endpoint);
    return false;
  }
  
  return safeSetItem(K1_STORAGE_KEYS.ENDPOINT, validated);
}

/**
 * Load global endpoint
 */
export function loadEndpoint(): string | null {
  const data = safeGetItem(K1_STORAGE_KEYS.ENDPOINT);
  
  if (!data) {
    return null;
  }
  
  return validateEndpoint(data);
}

/**
 * Clear all pattern-specific data
 */
export function clearPatternData(patternId: string): void {
  const keys = getPatternStorageKeys(patternId);
  safeRemoveItem(keys.params);
  safeRemoveItem(keys.palette);
  safeRemoveItem(keys.preset);
}

/**
 * Get all stored pattern IDs
 */
export function getStoredPatternIds(): string[] {
  const patternIds: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('k1:v1:params:')) {
        const patternId = key.replace('k1:v1:params:', '');
        if (patternId && !patternIds.includes(patternId)) {
          patternIds.push(patternId);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to enumerate stored patterns:', error);
  }
  
  return patternIds;
}

// ============================================================================
// CROSS-TAB SYNCHRONIZATION
// ============================================================================

/**
 * Storage event listener for cross-tab synchronization
 */
export type StorageChangeHandler = (key: string, newValue: string | null, oldValue: string | null) => void;

/**
 * Add storage event listener for cross-tab sync
 */
export function addStorageListener(handler: StorageChangeHandler): () => void {
  const listener = (event: StorageEvent) => {
    // Only handle K1-related storage changes
    if (event.key && event.key.startsWith('k1:v1:')) {
      handler(event.key, event.newValue, event.oldValue);
    }
  };
  
  window.addEventListener('storage', listener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', listener);
  };
}

/**
 * Trigger storage event for testing (same-tab simulation)
 */
export function triggerStorageEvent(key: string, newValue: string | null, oldValue: string | null): void {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    storageArea: localStorage,
  });
  
  window.dispatchEvent(event);
}

// ============================================================================
// MIGRATION AND CLEANUP
// ============================================================================

/**
 * Migrate old storage format to new per-pattern format
 */
export function migrateStorage(): void {
  try {
    // Check if we have old global params that need migration
    const oldParams = safeGetItem(K1_STORAGE_KEYS.PARAMS);
    const oldPalette = safeGetItem(K1_STORAGE_KEYS.PALETTE);
    const currentPattern = safeGetItem(K1_STORAGE_KEYS.PATTERN);
    
    if (oldParams && currentPattern) {
      // Migrate to per-pattern storage
      const params = JSON.parse(oldParams);
      const validated = validateParameters(params);
      
      if (validated) {
        savePatternParameters(currentPattern, validated);
        console.log(`Migrated parameters for pattern: ${currentPattern}`);
      }
    }
    
    if (oldPalette && currentPattern) {
      const paletteId = validatePaletteId(oldPalette);
      savePatternPalette(currentPattern, paletteId);
      console.log(`Migrated palette for pattern: ${currentPattern}`);
    }
    
  } catch (error) {
    console.warn('Storage migration failed:', error);
  }
}

/**
 * Clean up old or invalid storage entries
 */
export function cleanupStorage(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('k1:v1:')) {
        // Validate stored data
        const value = localStorage.getItem(key);
        
        if (!value) {
          keysToRemove.push(key);
          continue;
        }
        
        // Validate specific data types
        if (key.includes(':params:')) {
          try {
            const params = JSON.parse(value);
            if (!validateParameters(params)) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        } else if (key.includes(':palette:')) {
          if (validatePaletteId(value) === 0 && value !== '0') {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    // Remove invalid entries
    keysToRemove.forEach(key => {
      safeRemoveItem(key);
      console.log(`Cleaned up invalid storage entry: ${key}`);
    });
    
  } catch (error) {
    console.warn('Storage cleanup failed:', error);
  }
}

export function getPatternPresetKey(patternId: string): string {
  return `k1:v1:preset:${patternId}`;
}

export function savePatternPreset(patternId: string, presetLabel: string): boolean {
  const key = getPatternPresetKey(patternId);
  const label = (presetLabel || '').toString().trim();
  if (!label) {
    // Empty label clears preset
    return safeRemoveItem(key), true;
  }
  // Basic validation: restrict length
  const sanitized = label.slice(0, 64);
  return safeSetItem(key, sanitized);
}

export function loadPatternPreset(patternId: string): string | null {
  const key = getPatternPresetKey(patternId);
  const data = safeGetItem(key);
  if (!data) return null;
  const label = data.toString().trim();
  return label.length ? label : null;
}