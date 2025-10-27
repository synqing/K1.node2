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
  K1DiscoveredDevice,
} from '../types/k1-types'
import { K1Error, ErrorCode, isAbortError } from '../utils/error-types'
import { withRetry } from '../utils/retry'

export class K1Client {
  private _isConnected = false
  private _endpoint = ''
  private _listeners = new Map<string, Set<(payload: any) => void>>()
  private _errorHandler: (error: K1Error) => void = () => {}
  // Realtime transport state
  private _wsEnabled: boolean = true
  private _wsAvailable: boolean = false
  private _activeTransport: 'ws' | 'rest' = 'rest'
  private _ws: WebSocket | null = null
  private _lastWSError: Error | null = null
  private _pollTimer: ReturnType<typeof setInterval> | null = null

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

  /**
   * Set error handler for client errors
   */
  setErrorHandler(handler: (error: K1Error) => void) {
    this._errorHandler = handler
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
    return withRetry(async () => {
      try {
        this._endpoint = endpoint
        
        // Test connection first
        const response = await fetch(`${endpoint}/api/device-info`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/json' }
        })
        
        if (!response.ok) {
          throw new K1Error(
            ErrorCode.CONNECTION_FAILED,
            `HTTP ${response.status}: ${response.statusText}`,
            `Failed to connect to device at ${endpoint}. Please check the IP address and try again.`,
            true,
            { endpoint, status: response.status }
          )
        }
        
        const deviceInfo = await response.json()
        this._isConnected = true
        
        this.emit('open', { endpoint, deviceInfo })
        return deviceInfo
        
      } catch (error) {
        const k1Error = K1Error.fromUnknown(error, { endpoint })
        this._errorHandler(k1Error)
        throw k1Error
      }
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      retryCondition: (error) => {
        const k1Error = K1Error.fromUnknown(error)
        return k1Error.code === ErrorCode.CONNECTION_TIMEOUT || 
               k1Error.code === ErrorCode.NETWORK_ERROR
      }
    })
  }

  setWebSocketEnabled(enabled: boolean): void {
    this._wsEnabled = enabled
    this.emit('transportChanged', { transport: enabled ? 'ws' : 'rest', available: this._wsAvailable })
    if (!enabled) {
      // Stop WS and fall back to REST polling
      if (this._ws) {
        try { this._ws.close() } catch (_) {}
        this._ws = null
      }
      this._wsAvailable = false
      this._activeTransport = 'rest'
      this.startPolling()
    } else {
      // Try to (re)connect WS
      if (this._isConnected) {
        this.connectWebSocket(() => {}, () => {})
      }
    }
  }

  isWebSocketEnabled(): boolean {
    return this._wsEnabled
  }

  getTransportStatus(): { wsAvailable: boolean; wsEnabled: boolean; restAvailable: boolean; activeTransport: 'ws' | 'rest'; lastWSError: Error | null } {
    return {
      wsAvailable: this._wsAvailable,
      wsEnabled: this._wsEnabled,
      restAvailable: true,
      activeTransport: this._activeTransport,
      lastWSError: this._lastWSError,
    }
  }

  private buildWsUrl(): string {
    const endpoint = this._endpoint
    if (!endpoint) return ''
    if (endpoint.startsWith('http://')) return endpoint.replace('http://', 'ws://') + '/ws'
    if (endpoint.startsWith('https://')) return endpoint.replace('https://', 'wss://') + '/ws'
    // Plain host/IP
    return `ws://${endpoint}/ws`
  }

  private startPolling() {
    if (this._pollTimer) return
    // Emit combined realtime data at ~20Hz
    this._pollTimer = setInterval(async () => {
      try {
        const perf = await this.getPerformanceMetrics()
        const audio = await this.getAudioMetrics()
        const data = {
          performance: {
            fps: Math.round(perf.fps),
            frame_time_us: Math.round((perf.frameTime || 16) * 1000),
            cpu_percent: Math.round(perf.cpuUsage || 0),
            memory_percent: Math.round(perf.memoryUsage || 0),
            memory_free_kb: 0,
            temperature: undefined,
          },
          audio: {
            spectrum: (audio.frequencyBands || []).map((v: number) => Math.max(0, v)),
            chromagram: new Array(12).fill(0).map(() => Math.random()),
            vu_level: Math.max(0, Math.min(1, (audio.rms || 0) / 100)),
            vu_level_raw: Math.max(0, Math.min(1, (audio.peak || 0) / 100)),
            tempo_confidence: Math.max(0, Math.min(1, (audio.beatConfidence || 0) / 100)),
            novelty_curve: Math.random(),
            update_counter: Date.now(),
            timestamp_us: Date.now() * 1000,
          },
        }
        this.emit('realtimeData', data)
        this.emit('performanceData', data.performance)
        this.emit('audioData', data.audio)
      } catch (err) {
        // ignore polling errors
      }
    }, 50)
  }

  private stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  }

  connectWebSocket(onData: (data: any) => void, onStatus: (status: any) => void): void {
    if (!this._wsEnabled) {
      this._wsAvailable = false
      this._activeTransport = 'rest'
      this.startPolling()
      onStatus({ wsAvailable: false, activeTransport: this._activeTransport })
      return
    }

    const url = this.buildWsUrl()
    if (!url) {
      this._wsAvailable = false
      this._activeTransport = 'rest'
      this.startPolling()
      onStatus({ wsAvailable: false, activeTransport: this._activeTransport })
      return
    }

    try {
      // Tear down existing
      if (this._ws) {
        try { this._ws.close() } catch (_) {}
        this._ws = null
      }

      const ws = new WebSocket(url)
      this._ws = ws
      this._activeTransport = 'ws'

      ws.onopen = () => {
        this._wsAvailable = true
        this._lastWSError = null
        this.stopPolling()
        this.emit('transportChanged', { transport: 'ws', available: true })
        onStatus({ wsAvailable: true, activeTransport: 'ws' })
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          // Expect either full realtimeData or separate channels
          const data = msg as any
          try {
            onData(data)
          } catch (err: any) {
            if (isAbortError(err)) {
              // ignore abort during HMR/navigation
            } else {
              // swallow handler errors to avoid noisy logs
            }
          }
          if (data.performance) this.emit('performanceData', data.performance)
          if (data.audio) this.emit('audioData', data.audio)
          if (data) this.emit('realtimeData', data)
        } catch (_) {
          // Non-JSON payloads ignored
        }
      }

      ws.onerror = (evt) => {
        this._lastWSError = new Error('WebSocket error')
      }

      ws.onclose = () => {
        this._wsAvailable = false
        this._activeTransport = 'rest'
        this.startPolling()
        this.emit('transportChanged', { transport: 'rest', available: true })
        onStatus({ wsAvailable: false, activeTransport: 'rest' })
      }
    } catch (err: any) {
      this._lastWSError = err
      this._wsAvailable = false
      this._activeTransport = 'rest'
      this.startPolling()
      onStatus({ wsAvailable: false, activeTransport: 'rest', error: err?.message })
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false
    if (this._ws) {
      try { this._ws.close() } catch (_) {}
      this._ws = null
    }
    this.stopPolling()
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

  // Debug API Methods
  async getPerformanceMetrics(): Promise<any> {
    // Simulate performance metrics collection
    return {
      fps: 60 + Math.random() * 10 - 5,
      frameTime: 16 + Math.random() * 4 - 2,
      cpuUsage: 30 + Math.random() * 40,
      memoryUsage: 45 + Math.random() * 30,
      droppedFrames: Math.floor(Math.random() * 5),
      renderTime: 12 + Math.random() * 6,
      timestamp: Date.now(),
    };
  }

  async getAudioMetrics(): Promise<any> {
    // Simulate audio metrics collection
    const time = Date.now();
    const baseFreq = 0.001;
    const musicIntensity = 0.3 + 0.7 * Math.sin(time * baseFreq * 2);
    
    return {
      rms: 20 + 60 * musicIntensity + 10 * Math.random(),
      peak: 30 + 70 * musicIntensity + 15 * Math.random(),
      beatDetected: Math.random() > 0.7,
      beatConfidence: 50 + 50 * Math.random(),
      bpm: 120 + 20 * Math.sin(time * baseFreq * 0.1),
      spectralCentroid: 1000 + 2000 * musicIntensity,
      spectralRolloff: 3000 + 5000 * musicIntensity,
      zeroCrossingRate: 0.1 + 0.4 * musicIntensity,
      frequencyBands: Array.from({ length: 10 }, (_, i) => 
        30 * musicIntensity * (1 - i * 0.08) + 10 * Math.random()
      ),
      mfcc: Array.from({ length: 13 }, (_, i) => 
        (i === 0 ? 10 : 0) + 5 * Math.sin(time * baseFreq * (i + 1))
      ),
      timestamp: time,
    };
  }

  async getParameterHistory(timeRange: number = 300000): Promise<any[]> {
    // Simulate parameter history collection
    const now = Date.now();
    const history = [];
    
    for (let i = 0; i < 50; i++) {
      const timestamp = now - (timeRange * (50 - i) / 50);
      history.push({
        timestamp,
        brightness: 50 + 30 * Math.sin(timestamp * 0.0001),
        speed: 40 + 40 * Math.sin(timestamp * 0.00015),
        intensity: 60 + 30 * Math.sin(timestamp * 0.00012),
        hue: (timestamp * 0.0002) % 360,
        saturation: 70 + 20 * Math.sin(timestamp * 0.00008),
        pattern: ['Spectrum', 'Beat Tunnel', 'Pulse'][Math.floor(Math.random() * 3)],
      });
    }
    
    return history;
  }

  async startPerformanceMonitoring(): Promise<void> {
    // Simulate starting performance monitoring
    this.emit('performance-monitoring-started');
  }

  async stopPerformanceMonitoring(): Promise<void> {
    // Simulate stopping performance monitoring
    this.emit('performance-monitoring-stopped');
  }

  async startAudioMonitoring(): Promise<void> {
    // Simulate starting audio monitoring
    this.emit('audio-monitoring-started');
  }

  async stopAudioMonitoring(): Promise<void> {
    // Simulate stopping audio monitoring
    this.emit('audio-monitoring-stopped');
  }

  async exportDebugData(type: 'performance' | 'audio' | 'parameters'): Promise<any> {
    // Simulate debug data export
    const baseData = {
      exportedAt: new Date().toISOString(),
      deviceInfo: await this.getDeviceInfo(),
      type,
    };

    switch (type) {
      case 'performance':
        return {
          ...baseData,
          metrics: await this.getPerformanceMetrics(),
        };
      case 'audio':
        return {
          ...baseData,
          metrics: await this.getAudioMetrics(),
        };
      case 'parameters':
        return {
          ...baseData,
          history: await this.getParameterHistory(),
        };
      default:
        return baseData;
    }
  }

  /**
   * Discover K1 devices on the network
   * This is a basic implementation - in production this would use mDNS or network scanning
   */
  static async discover(timeout: number = 5000): Promise<K1DiscoveredDevice[]> {
    // Simulate network discovery with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock discovered devices
        const devices: K1DiscoveredDevice[] = [
          {
            id: 'k1-001',
            name: 'K1.reinvented',
            ip: '192.168.1.100',
            port: 80,
            mac: '00:11:22:33:44:55',
            firmware: '1.0.0',
            lastSeen: new Date(),
            rssi: -45,
            discoveryMethod: 'mdns',
          },
          {
            id: 'k1-002', 
            name: 'K1.studio',
            ip: '192.168.1.101',
            port: 80,
            mac: '00:11:22:33:44:66',
            firmware: '1.0.1',
            lastSeen: new Date(Date.now() - 30000), // 30 seconds ago
            rssi: -62,
            discoveryMethod: 'scan',
          },
        ]
        resolve(devices)
      }, Math.min(timeout, 2000)) // Simulate discovery time
    })
  }
}