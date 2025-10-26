import {
  K1PatternResponse,
  K1Parameters,
  K1ParameterUI,
  K1AudioConfig,
  K1DeviceInfo,
  K1RealtimeData,
  K1ApiResponse,
  ConnectionStatus,
  K1ConfigBackup,
  K1ConfigRestoreResponse,
} from '../types/k1-types';

/**
 * K1.reinvented API Client
 * Handles REST API and WebSocket communication with K1 device
 * Supports transport routing with WebSocket-preferred, REST-fallback
 */
export class K1Client {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // Transport state
  private wsAvailable = false;
  private wsEnabled = true;
  private lastWSError: Error | null = null;

  constructor(ip: string, port: number = 80) {
    this.baseURL = `http://${ip}:${port}`;
  }

  // ============================================================================
  // TRANSPORT ROUTING METHODS
  // ============================================================================

  /**
   * Get current transport availability status
   */
  getTransportStatus() {
    return {
      wsAvailable: this.wsAvailable,
      wsEnabled: this.wsEnabled,
      restAvailable: true, // REST is always available if we can reach the device
      activeTransport: this.wsAvailable && this.wsEnabled ? 'ws' : 'rest',
      lastWSError: this.lastWSError,
    };
  }

  /**
   * Enable or disable WebSocket transport
   */
  setWebSocketEnabled(enabled: boolean) {
    this.wsEnabled = enabled;
    if (!enabled && this.websocket) {
      this.disconnect();
    }
  }



  /**
   * Transport router: prefer WebSocket when available, fallback to REST
   * Implements Subtask 2.5 requirements
   */
  private async routeCommand<T>(
    wsCommand: string,
    wsPayload: any,
    restFallback: () => Promise<T>
  ): Promise<T> {
    // Check if WebSocket is preferred and available
    if (this.shouldUseWebSocket()) {
      try {
        // For now, we'll use a hybrid approach:
        // Send command via WebSocket for real-time operations
        // But still use REST for the response since we need request/response correlation
        
        if (this.websocket?.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            command: wsCommand,
            payload: wsPayload,
            id: Date.now(), // Simple request ID for future correlation
            timestamp: new Date().toISOString(),
          });
          
          // Send via WebSocket (fire-and-forget for now)
          this.websocket.send(message);
          console.log(`Command sent via WebSocket: ${wsCommand}`);
        }
      } catch (error) {
        console.warn('WebSocket send failed, using REST fallback:', error);
        this.lastWSError = error instanceof Error ? error : new Error(String(error));
        // Continue to REST fallback
      }
    }
    
    // Always use REST for the actual response (for now)
    // In a full implementation, we'd wait for WebSocket response with correlation ID
    return await restFallback();
  }

  /**
   * Check if WebSocket transport should be used
   */
  private shouldUseWebSocket(): boolean {
    return this.wsEnabled && this.wsAvailable;
  }

  // Centralized request with simple retry/backoff for transient failures
  private async request<T>(path: string, init?: RequestInit, retries = 2, backoffMs = 250): Promise<T> {
    const devEnv = (import.meta as any).env;
    let attempt = 0;
    const url = `${this.baseURL}${path}`;
    while (attempt <= retries) {
      try {
        const res = await fetch(url, init);
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as T;
      } catch (error) {
        if (attempt === retries) {
          if (!devEnv?.DEV) {
            console.error('API request error:', error);
          }
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
        attempt++;
      }
    }
    throw new Error('Unexpected retry loop exit');
  }

  // Update the base URL (when user changes IP)
  updateConnection(ip: string, port: number = 80) {
    this.baseURL = `http://${ip}:${port}`;
    this.disconnect(); // Close any existing WebSocket
    this.reconnectAttempts = 0;
  }

  // Test connection to device
  async testConnection(): Promise<boolean> {
    const devEnv = (import.meta as any).env;
    // Skip connection probing in dev to avoid noisy errors when device is offline
    if (devEnv?.DEV) {
      return false;
    }
    try {
      const response = await fetch(`${this.baseURL}/api/patterns`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      } as RequestInit);
      return response.ok;
    } catch (error) {
      console.warn('Connection test failed:', error);
      return false;
    }
  }

  // Pattern Management
  async getPatterns(): Promise<K1PatternResponse> {
    return this.request<K1PatternResponse>("/api/patterns");
  }

  async selectPattern(index: number): Promise<K1ApiResponse<{ current_pattern: number }>> {
    // Use transport routing: prefer WebSocket, fallback to REST
    return this.routeCommand(
      'selectPattern',
      { index },
      () => this.request<K1ApiResponse<{ current_pattern: number }>>("/api/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      })
    );
  }

  async selectPatternById(id: string): Promise<K1ApiResponse<{ current_pattern: number }>> {
    // Use transport routing: prefer WebSocket, fallback to REST
    return this.routeCommand(
      'selectPatternById',
      { id },
      () => this.request<K1ApiResponse<{ current_pattern: number }>>("/api/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    );
  }

  // Parameter Management
  async getParameters(): Promise<K1Parameters> {
    return this.request<K1Parameters>("/api/params");
  }

  async updateParameters(params: Partial<K1ParameterUI>): Promise<K1ApiResponse<{ params: K1Parameters }>> {
    const firmwareParams: Partial<K1Parameters> = {};
    if (params.brightness !== undefined) firmwareParams.brightness = params.brightness / 100;
    if (params.speed !== undefined) firmwareParams.speed = params.speed / 100;
    if (params.saturation !== undefined) firmwareParams.saturation = params.saturation / 100;
    if (params.warmth !== undefined) firmwareParams.warmth = params.warmth / 100;
    if (params.softness !== undefined) firmwareParams.softness = params.softness / 100;
    if (params.background !== undefined) firmwareParams.background = params.background / 100;
    if (params.palette_id !== undefined) firmwareParams.palette_id = params.palette_id;

    // Use transport routing: prefer WebSocket, fallback to REST
    return this.routeCommand(
      'updateParameters',
      firmwareParams,
      () => this.request<K1ApiResponse<{ params: K1Parameters }>>("/api/params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firmwareParams),
      })
    );
  }

  async resetParameters(): Promise<K1Parameters> {
    return this.request<K1Parameters>("/api/reset", { method: "POST" });
  }

  // Audio Configuration
  async getAudioConfig(): Promise<K1AudioConfig> {
    return this.request<K1AudioConfig>("/api/audio-config");
  }

  async updateAudioConfig(config: Partial<K1AudioConfig>): Promise<K1AudioConfig> {
    return this.request<K1AudioConfig>("/api/audio-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  // Device Information
  async getDeviceInfo(): Promise<K1DeviceInfo> {
    try {
      const response = await fetch(`${this.baseURL}/api/device/info`);
      if (!response.ok) {
        // Return mock device info for development
        return {
          device: 'K1.reinvented',
          firmware: '1.0.0-dev',
          uptime: 0,
          ip: this.baseURL.replace('http://', '').split(':')[0],
          mac: '00:00:00:00:00:00',
        };
      }
      return response.json();
    } catch (error) {
      // Return mock device info if request fails
      return {
        device: 'K1.reinvented',
        firmware: '1.0.0-dev',
        uptime: 0,
        ip: this.baseURL.replace('http://', '').split(':')[0],
        mac: '00:00:00:00:00:00',
      };
    }
  }

  // WebSocket Connection with transport state tracking
  connectWebSocket(onUpdate: (data: K1RealtimeData) => void, onStatusChange?: (status: ConnectionStatus) => void): void {
    if (!this.wsEnabled) {
      console.log('WebSocket disabled, skipping connection');
      return;
    }

    if (this.websocket) {
      this.disconnect();
    }

    const wsURL = this.baseURL.replace('http://', 'ws://') + '/ws';
    this.websocket = new WebSocket(wsURL);

    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      this.wsAvailable = true;
      this.lastWSError = null;
      this.reconnectAttempts = 0;
      onStatusChange?.('connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as K1RealtimeData;
        onUpdate(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.wsAvailable = false;
      onStatusChange?.('disconnected');
      
      // Auto-reconnect with exponential backoff if enabled
      if (this.wsEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connectWebSocket(onUpdate, onStatusChange);
        }, delay);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.wsAvailable = false;
      this.lastWSError = error instanceof Error ? error : new Error('WebSocket error');
      onStatusChange?.('error');
    };
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.wsAvailable = false;
    this.reconnectAttempts = 0;
  }

  // Utility Methods
  static firmwareToUI(params: K1Parameters): K1ParameterUI {
    return {
      brightness: Math.round(params.brightness * 100),
      speed: Math.round(params.speed * 100),
      saturation: Math.round(params.saturation * 100),
      warmth: Math.round(params.warmth * 100),
      softness: Math.round(params.softness * 100),
      background: Math.round(params.background * 100),
      palette_id: params.palette_id,
    };
  }

  static async discoverDevices(): Promise<string[]> {
    // TODO: Implement mDNS discovery or subnet scanning
    // For now, return empty array
    return [];
  }

  static isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Backup device configuration
   * Downloads complete device configuration as JSON
   */
  async backupConfig(): Promise<K1ConfigBackup> {
    return this.request<K1ConfigBackup>('/api/config/backup');
  }

  /**
   * Restore device configuration
   * Uploads and applies configuration to device
   */
  async restoreConfig(config: K1ConfigBackup): Promise<K1ConfigRestoreResponse> {
    return this.request<K1ConfigRestoreResponse>('/api/config/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
  }
}