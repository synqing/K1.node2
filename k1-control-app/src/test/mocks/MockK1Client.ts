/**
 * Mock K1Client for comprehensive unit testing
 * Implements Subtask 2.8: Comprehensive unit tests with fake timers and mocked K1Client
 */

import { vi } from 'vitest'
import { EventEmitter } from 'events'
import {
  K1DeviceInfo,
  K1Parameters,
  K1Pattern,
  K1PatternResponse,
  K1ApiResponse,
  K1ConfigBackup,
  K1ConfigRestoreResponse,
  K1RealtimeData,
} from '../../types/k1-types'

/**
 * Mock K1Client with event emitter capabilities for testing
 * Implements the exact same interface as the real K1Client
 */
export class MockK1Client {
  private _listeners = new Map<string, Set<(payload: any) => void>>()
  
  // Event system matching real K1Client
  on(event: string, handler: (payload: any) => void) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(handler)
  }

  off(event: string, handler: (payload: any) => void) {
    this._listeners.get(event)?.delete(handler)
  }

  emit(event: string, payload?: any) {
    const handlers = this._listeners.get(event)
    if (handlers) {
      handlers.forEach((h) => {
        try { h(payload) } catch (_) { /* noop */ }
      })
    }
  }
  private _isConnected = false
  private _endpoint = ''
  private _deviceInfo: K1DeviceInfo | null = null
  private _parameters: K1Parameters = {
    brightness: 80,
    softness: 50,
    color: 50,
    color_range: 50,
    saturation: 75,
    warmth: 50,
    background: 10,
    speed: 50,
    palette_id: 0,
    custom_param_1: 0,
    custom_param_2: 0,
    custom_param_3: 0,
  }
  private _selectedPattern = 'rainbow'
  private _wsEnabled = true
  private _connectionDelay = 100
  private _shouldFailConnection = false
  private _shouldFailRequests = false
  private _requestLatency = 50

  // Mock control methods
  setConnectionDelay(delay: number) {
    this._connectionDelay = delay
  }

  setShouldFailConnection(shouldFail: boolean) {
    this._shouldFailConnection = shouldFail
  }

  setShouldFailRequests(shouldFail: boolean) {
    this._shouldFailRequests = shouldFail
  }

  setRequestLatency(latency: number) {
    this._requestLatency = latency
  }

  setMockDeviceInfo(deviceInfo: K1DeviceInfo) {
    this._deviceInfo = deviceInfo
  }

  // K1Client interface implementation
  async connect(endpoint: string): Promise<K1DeviceInfo> {
    this._endpoint = endpoint

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this._shouldFailConnection) {
          const error = new Error(`Failed to connect to ${endpoint}`)
          this.emit('error', { error })
          reject(error)
          return
        }

        this._isConnected = true
        this._deviceInfo = this._deviceInfo || {
          device: 'K1.test',
          firmware: '1.0.0-test',
          uptime: 12345,
          ip: endpoint.replace('http://', '').split(':')[0],
          mac: '00:11:22:33:44:55',
          lastSeen: new Date(),
          latency: this._requestLatency,
        }

        this.emit('open', { endpoint, deviceInfo: this._deviceInfo })
        resolve(this._deviceInfo)
      }, this._connectionDelay)
    })
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this._isConnected = false
        this.emit('close', { code: 1000, reason: 'Normal closure' })
        resolve()
      }, 10)
    })
  }

  isConnected(): boolean {
    return this._isConnected
  }

  // Provide error handler registration to match client interface
  setErrorHandler(handler: (error: unknown) => void): void {
    this.on('error', ({ error }) => handler(error))
  }

  getEndpoint(): string {
    return this._endpoint
  }

  async getDeviceInfo(): Promise<K1DeviceInfo> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      throw new Error('Device info request failed')
    }

    if (!this._deviceInfo) {
      throw new Error('Not connected')
    }

    return this._deviceInfo
  }

  async getPatterns(): Promise<K1PatternResponse> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      throw new Error('Patterns request failed')
    }

    const mockPatterns: K1Pattern[] = [
      {
        index: 0,
        id: 'rainbow',
        name: 'Rainbow',
        description: 'Classic rainbow pattern',
        is_audio_reactive: false,
      },
      {
        index: 1,
        id: 'pulse',
        name: 'Pulse',
        description: 'Pulsing pattern',
        is_audio_reactive: true,
      },
      {
        index: 2,
        id: 'wave',
        name: 'Wave',
        description: 'Wave pattern',
        is_audio_reactive: false,
      },
    ]

    return {
      patterns: mockPatterns,
      current_pattern: mockPatterns.findIndex(p => p.id === this._selectedPattern),
    }
  }

  async selectPattern(patternId: string): Promise<K1ApiResponse<{ pattern: K1Pattern }>> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      return {
        success: false,
        error: { error: 'Pattern selection failed' },
      }
    }

    this._selectedPattern = patternId
    const patterns = await this.getPatterns()
    const pattern = patterns.patterns.find(p => p.id === patternId)

    if (!pattern) {
      return {
        success: false,
        error: { error: 'Pattern not found' },
      }
    }

    this.emit('patternSelected', { patternId, pattern })

    return {
      success: true,
      data: { pattern },
    }
  }

  async updateParameters(params: Partial<K1Parameters>): Promise<K1ApiResponse<{ params: K1Parameters }>> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      return {
        success: false,
        error: { error: 'Parameter update failed' },
      }
    }

    this._parameters = { ...this._parameters, ...params }
    
    this.emit('paramsUpdated', { parameters: this._parameters })

    return {
      success: true,
      data: { params: this._parameters },
    }
  }

  async getParameters(): Promise<K1Parameters> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      throw new Error('Parameters request failed')
    }

    return this._parameters
  }

  async setPalette(paletteId: number): Promise<K1ApiResponse<{ palette_id: number }>> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      return {
        success: false,
        error: { error: 'Palette update failed' },
      }
    }

    this._parameters.palette_id = paletteId
    
    this.emit('paletteUpdated', { paletteId })

    return {
      success: true,
      data: { palette_id: paletteId },
    }
  }

  setWebSocketEnabled(enabled: boolean): void {
    this._wsEnabled = enabled
    this.emit('transportChanged', { transport: enabled ? 'ws' : 'rest', available: true })
  }

  isWebSocketEnabled(): boolean {
    return this._wsEnabled
  }

  async backupConfig(): Promise<K1ConfigBackup> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      throw new Error('Backup failed')
    }

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      device_info: {
        device: this._deviceInfo?.device || 'K1.test',
        firmware: this._deviceInfo?.firmware || '1.0.0-test',
        mac: this._deviceInfo?.mac || '00:11:22:33:44:55',
      },
      configuration: {
        patterns: (await this.getPatterns()).patterns,
        current_pattern: (await this.getPatterns()).current_pattern,
        parameters: this._parameters,
        audio_config: { microphone_gain: 1.0 },
        palette_id: this._parameters.palette_id,
      },
    }
  }

  async restoreConfig(config: K1ConfigBackup): Promise<K1ConfigRestoreResponse> {
    await this._simulateLatency()
    
    if (this._shouldFailRequests) {
      throw new Error('Restore failed')
    }

    // Simulate restoring configuration
    this._parameters = config.configuration.parameters
    this._selectedPattern = config.configuration.patterns[config.configuration.current_pattern]?.id || 'rainbow'

    return {
      success: true,
      message: 'Configuration restored successfully',
      restored_items: ['parameters', 'pattern', 'palette'],
    }
  }

  // Test utility methods
  simulateReconnection() {
    this.emit('close', { code: 1006, reason: 'Connection lost' })
    
    setTimeout(() => {
      if (!this._shouldFailConnection) {
        this._isConnected = true
        this.emit('open', { endpoint: this._endpoint, deviceInfo: this._deviceInfo })
      }
    }, this._connectionDelay)
  }

  simulateWebSocketError() {
    this.emit('error', { error: new Error('WebSocket connection failed') })
  }

  simulateRealtimeData() {
    const realtimeData: K1RealtimeData = {
      audio: {
        spectrum: new Array(64).fill(0).map(() => Math.random()),
        chromagram: new Array(12).fill(0).map(() => Math.random()),
        vu_level: Math.random(),
        vu_level_raw: Math.random(),
        tempo_confidence: Math.random(),
        novelty_curve: Math.random(),
        update_counter: Date.now(),
        timestamp_us: Date.now() * 1000,
      },
      performance: {
        fps: 60,
        frame_time_us: 16666,
        cpu_percent: 25,
        memory_percent: 40,
        memory_free_kb: 1024,
        temperature: 45,
      },
      parameters: this._parameters,
    }

    this.emit('realtimeData', realtimeData)
  }

  private async _simulateLatency(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this._requestLatency)
    })
  }

  // Cleanup method for tests
  cleanup() {
    this._listeners.clear()
    this._isConnected = false
    this._endpoint = ''
    this._deviceInfo = null
  }
}

/**
 * Factory function to create mock K1Client instances
 */
export function createMockK1Client(): MockK1Client {
  return new MockK1Client()
}

/**
 * Mock K1Client constructor for dependency injection
 */
export const MockK1ClientConstructor = vi.fn().mockImplementation(() => createMockK1Client())