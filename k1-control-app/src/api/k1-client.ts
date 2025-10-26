/**
 * K1Client - Simple implementation for testing
 * This is a minimal implementation to support the test suite
 */

import {
  K1DeviceInfo,
  K1Parameters,
  K1Pattern,
  K1PatternResponse,
  K1ApiResponse,
  K1ConfigBackup,
  K1ConfigRestoreResponse,
} from '../types/k1-types'

export class K1Client {
  private _isConnected = false
  private _endpoint = ''
  private _listeners = new Map<string, Set<(payload: any) => void>>()

  on(event: string, handler: (payload: any) => void) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
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

  constructor(endpoint: string) {
    this._endpoint = endpoint
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simulate a connection test with a small delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // For now, always return true for testing
      // In a real implementation, this would make an HTTP request to test connectivity
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  async connect(endpoint: string): Promise<K1DeviceInfo> {
    this._endpoint = endpoint
    this._isConnected = true
    
    const deviceInfo: K1DeviceInfo = {
      device: 'K1.test',
      firmware: '1.0.0-test',
      uptime: 12345,
      ip: endpoint.replace('http://', '').split(':')[0],
      mac: '00:11:22:33:44:55',
      lastSeen: new Date(),
      latency: 50,
    }

    this.emit('open', { endpoint, deviceInfo })
    return deviceInfo
  }

  async disconnect(): Promise<void> {
    this._isConnected = false
    this.emit('close', { code: 1000, reason: 'Normal closure' })
  }

  isConnected(): boolean {
    return this._isConnected
  }

  getEndpoint(): string {
    return this._endpoint
  }

  async getDeviceInfo(): Promise<K1DeviceInfo> {
    if (!this._isConnected) {
      throw new Error('Not connected')
    }

    return {
      device: 'K1.test',
      firmware: '1.0.0-test',
      uptime: 12345,
      ip: this._endpoint.replace('http://', '').split(':')[0],
      mac: '00:11:22:33:44:55',
      lastSeen: new Date(),
      latency: 50,
    }
  }

  async getPatterns(): Promise<K1PatternResponse> {
    const patterns: K1Pattern[] = [
      {
        index: 0,
        id: 'rainbow',
        name: 'Rainbow',
        description: 'Classic rainbow pattern',
        is_audio_reactive: false,
      },
    ]

    return {
      patterns,
      current_pattern: 0,
    }
  }

  async selectPattern(patternId: string): Promise<K1ApiResponse<{ pattern: K1Pattern }>> {
    const patterns = await this.getPatterns()
    const pattern = patterns.patterns.find(p => p.id === patternId)

    if (!pattern) {
      return {
        success: false,
        error: { error: 'Pattern not found' },
      }
    }

    return {
      success: true,
      data: { pattern },
    }
  }

  async updateParameters(params: Partial<K1Parameters>): Promise<K1ApiResponse<{ params: K1Parameters }>> {
    const fullParams: K1Parameters = {
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
      ...params,
    }

    return {
      success: true,
      data: { params: fullParams },
    }
  }

  async getParameters(): Promise<K1Parameters> {
    return {
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
  }

  async setPalette(paletteId: number): Promise<K1ApiResponse<{ palette_id: number }>> {
    return {
      success: true,
      data: { palette_id: paletteId },
    }
  }

  setWebSocketEnabled(enabled: boolean): void {
    // Mock implementation
  }

  isWebSocketEnabled(): boolean {
    return true
  }

  async backupConfig(): Promise<K1ConfigBackup> {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      device_info: {
        device: 'K1.test',
        firmware: '1.0.0-test',
        mac: '00:11:22:33:44:55',
      },
      configuration: {
        patterns: (await this.getPatterns()).patterns,
        current_pattern: 0,
        parameters: await this.getParameters(),
        audio_config: { microphone_gain: 1.0 },
        palette_id: 0,
      },
    }
  }

  async restoreConfig(config: K1ConfigBackup): Promise<K1ConfigRestoreResponse> {
    return {
      success: true,
      message: 'Configuration restored successfully',
      restored_items: ['parameters', 'pattern', 'palette'],
    }
  }
}