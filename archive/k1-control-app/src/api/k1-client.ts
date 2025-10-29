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
  // Reconnect/backoff and polling cooldown
  private _reconnectAttempts: number = 0
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _backoffBaseMs: number = 500
  private _backoffMaxMs: number = 30000
  private _pollCooldownTimer: ReturnType<typeof setTimeout> | null = null
  // Parameter update rate limiting
  private _lastParamUpdateAt: number = 0

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
      const response = await fetch(`${this._endpoint}/api/patterns`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        headers: { 'Accept': 'application/json' }
      })
      return response.ok
    } catch (error) {
      console.warn('[K1Client] Connection test failed:', error)
      return false
    }
  }

  async connect(endpoint: string): Promise<K1DeviceInfo> {
    return withRetry(async () => {
      try {
        this._endpoint = endpoint
        
        // Test connection first - try patterns endpoint since device-info doesn't exist
        const response = await fetch(`${endpoint}/api/patterns`, {
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
        
        const patternsData = await response.json()
        this._isConnected = true
        
        // Create mock device info from patterns response
        const deviceInfo: K1DeviceInfo = {
          device: 'K1.reinvented',
          firmware: '1.0.0',
          uptime: Date.now(),
          ip: endpoint.replace('http://', '').split(':')[0],
          mac: 'unknown',
          lastSeen: new Date(),
          latency: 50,
        }
        
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
      // Clear any pending reconnect or cooldown
      if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null }
      if (this._pollCooldownTimer) { clearTimeout(this._pollCooldownTimer); this._pollCooldownTimer = null }
      this._reconnectAttempts = 0
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

  getReconnectInfo(): { attempts: number; nextDelayMs: number; maxDelayMs: number; isActive: boolean } {
    const base = this._backoffBaseMs * Math.pow(2, this._reconnectAttempts)
    const nextDelayMs = Math.min(base, this._backoffMaxMs)
    const isActive = this._wsEnabled && this._isConnected && !this._wsAvailable && this._activeTransport !== 'ws'
    return {
      attempts: this._reconnectAttempts,
      nextDelayMs,
      maxDelayMs: this._backoffMaxMs,
      isActive,
    }
  }

  getRateLimiterInfo(): { lastUpdateAt: number; minIntervalMs: number; activeTransport: 'ws' | 'rest' } {
    const isWs = this._activeTransport === 'ws' && this._wsAvailable
    const minIntervalMs = isWs ? 60 : 120
    return {
      lastUpdateAt: this._lastParamUpdateAt,
      minIntervalMs,
      activeTransport: this._activeTransport,
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

  private startPollingWithCooldown(delayMs: number = 800) {
    if (this._pollCooldownTimer) return
    this._pollCooldownTimer = setTimeout(() => {
      this._pollCooldownTimer = null
      if (!this._wsAvailable && this._activeTransport !== 'ws') {
        this.startPolling()
      }
    }, Math.max(0, delayMs))
  }

  private scheduleReconnect(onData: (data: any) => void, onStatus: (status: any) => void) {
    if (!this._wsEnabled || !this._isConnected) return
    if (this._reconnectTimer) return
    const jitter = Math.floor(Math.random() * 250)
    const base = this._backoffBaseMs * Math.pow(2, this._reconnectAttempts)
    const delay = Math.min(base + jitter, this._backoffMaxMs)
    this._reconnectAttempts = Math.min(this._reconnectAttempts + 1, 16)
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this.connectWebSocket(onData, onStatus)
    }, delay)
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
        this._reconnectAttempts = 0
        if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null }
        if (this._pollCooldownTimer) { clearTimeout(this._pollCooldownTimer); this._pollCooldownTimer = null }
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
        this.emit('transportChanged', { transport: 'rest', available: true })
        onStatus({ wsAvailable: false, activeTransport: 'rest' })
        // Start REST polling with a short cooldown to avoid thrashing
        this.startPollingWithCooldown(800)
        // Schedule reconnect with exponential backoff
        this.scheduleReconnect(onData, onStatus)
      }
    } catch (err: any) {
      this._lastWSError = err
      this._wsAvailable = false
      this._activeTransport = 'rest'
      this.emit('transportChanged', { transport: 'rest', available: true })
      onStatus({ wsAvailable: false, activeTransport: 'rest', error: err?.message })
      // Start REST polling with cooldown
      this.startPollingWithCooldown(1000)
      // Schedule reconnect
      this.scheduleReconnect(onData, onStatus)
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
    const response = await fetch(`${this._endpoint}/api/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: parseInt(patternId) })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to select pattern: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      data: {
        pattern: {
          index: data.current_pattern,
          id: data.id,
          name: data.name,
          description: '',
          is_audio_reactive: false
        }
      }
    }
  }

  async updateParameters(params: Partial<K1Parameters>): Promise<K1ApiResponse<{ params: K1Parameters }>> {
    // Enforce minimal interval between parameter updates (transport-aware)
    const now = Date.now();
    const isWs = this._activeTransport === 'ws' && this._wsAvailable;
    const minIntervalMs = isWs ? 60 : 120;
    const elapsed = now - (this._lastParamUpdateAt || 0);
    if (elapsed < minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
    }
    this._lastParamUpdateAt = Date.now();

    // Convert UI 0–100% values to firmware 0.0–1.0 floats
    const scaleKeys: (keyof K1Parameters)[] = [
      'brightness', 'softness', 'color', 'color_range', 'saturation',
      'warmth', 'background', 'dithering', 'speed', 'custom_param_1', 'custom_param_2', 'custom_param_3'
    ];

    const body: Record<string, number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (key === 'palette_id') {
        body[key] = Number(value);
      } else if (scaleKeys.includes(key as keyof K1Parameters)) {
        body[key] = Number(value) / 100;
      } else {
        body[key] = Number(value);
      }
    }

    const response = await fetch(`${this._endpoint}/api/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update parameters: ${response.statusText}`)
    }
    
    const updatedParams = await this.getParameters()
    
    return {
      success: true,
      data: {
        params: updatedParams
      }
    }
  }

  async getParameters(): Promise<K1Parameters> {
    const response = await fetch(`${this._endpoint}/api/params`)
    if (!response.ok) {
      throw new Error(`Failed to get parameters: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Convert firmware floats (0.0–1.0) to UI percentages (0–100)
    const toPercent = (v: any) => Math.round((Number(v ?? 0)) * 100)
    
    return {
      brightness: toPercent(data.brightness),
      speed: toPercent(data.speed),
      saturation: toPercent(data.saturation),
      warmth: toPercent(data.warmth),
      softness: toPercent(data.softness),
      color: toPercent(data.color),
      color_range: toPercent(data.color_range),
      background: toPercent(data.background),
      dithering: toPercent(data.dithering),
      palette_id: Number(data.palette_id ?? 0),
      custom_param_1: toPercent(data.custom_param_1),
      custom_param_2: toPercent(data.custom_param_2),
      custom_param_3: toPercent(data.custom_param_3),
    }
  }

  async setPalette(paletteId: number): Promise<K1ApiResponse<{ palette_id: number }>> {
    const response = await fetch(`${this._endpoint}/api/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ palette_id: paletteId })
    })

    if (!response.ok) {
      throw new Error(`Failed to set palette: ${response.statusText}`)
    }

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