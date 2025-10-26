// K1.reinvented API Client
// Handles all communication with K1 devices via REST API

import {
  K1Pattern,
  K1PatternResponse,
  K1Parameters,
  K1ParameterUI,
  K1AudioConfig,
  K1AudioData,
  K1DeviceInfo,
  K1PerformanceData,
  K1RealtimeData,
  K1ApiResponse,
  ConnectionStatus
} from '../types/k1-types';

export class K1Client {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(ip: string, port: number = 80) {
    this.baseURL = `http://${ip}:${port}`;
  }

  // Update the base URL (when user changes IP)
  updateConnection(ip: string, port: number = 80) {
    this.baseURL = `http://${ip}:${port}`;
    this.disconnect(); // Close any existing WebSocket
    this.reconnectAttempts = 0;
  }

  // Test connection to device
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/patterns`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Pattern Management
  async getPatterns(): Promise<K1PatternResponse> {
    const response = await fetch(`${this.baseURL}/api/patterns`);
    if (!response.ok) {
      throw new Error(`Failed to fetch patterns: ${response.statusText}`);
    }
    return response.json();
  }

  async selectPattern(index: number): Promise<K1ApiResponse<{ current_pattern: number }>> {
    const response = await fetch(`${this.baseURL}/api/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to select pattern: ${response.statusText}`);
    }
    return response.json();
  }

  async selectPatternById(id: string): Promise<K1ApiResponse<{ current_pattern: number }>> {
    const response = await fetch(`${this.baseURL}/api/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to select pattern: ${response.statusText}`);
    }
    return response.json();
  }

  // Parameter Management
  async getParameters(): Promise<K1Parameters> {
    const response = await fetch(`${this.baseURL}/api/params`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parameters: ${response.statusText}`);
    }
    return response.json();
  }

  async updateParameters(params: Partial<K1ParameterUI>): Promise<K1ApiResponse<{ params: K1Parameters }>> {
    // Convert UI parameters (0-100%) to firmware parameters (0.0-1.0)
    const firmwareParams: Partial<K1Parameters> = {};
    
    if (params.brightness !== undefined) firmwareParams.brightness = params.brightness / 100;
    if (params.speed !== undefined) firmwareParams.speed = params.speed / 100;
    if (params.saturation !== undefined) firmwareParams.saturation = params.saturation / 100;
    if (params.warmth !== undefined) firmwareParams.warmth = params.warmth / 100;
    if (params.softness !== undefined) firmwareParams.softness = params.softness / 100;
    if (params.background !== undefined) firmwareParams.background = params.background / 100;
    if (params.palette_id !== undefined) firmwareParams.palette_id = params.palette_id;

    const response = await fetch(`${this.baseURL}/api/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firmwareParams)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update parameters: ${response.statusText}`);
    }
    return response.json();
  }

  async resetParameters(): Promise<K1Parameters> {
    const response = await fetch(`${this.baseURL}/api/reset`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reset parameters: ${response.statusText}`);
    }
    return response.json();
  }

  // Audio Configuration
  async getAudioConfig(): Promise<K1AudioConfig> {
    const response = await fetch(`${this.baseURL}/api/audio-config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio config: ${response.statusText}`);
    }
    return response.json();
  }

  async updateAudioConfig(config: Partial<K1AudioConfig>): Promise<K1AudioConfig> {
    const response = await fetch(`${this.baseURL}/api/audio-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update audio config: ${response.statusText}`);
    }
    return response.json();
  }

  // Device Information (future endpoints)
  async getDeviceInfo(): Promise<K1DeviceInfo> {
    try {
      const response = await fetch(`${this.baseURL}/api/device/info`);
      if (!response.ok) {
        // Fallback to basic info if endpoint doesn't exist
        return {
          device: 'K1.reinvented',
          firmware: 'Unknown',
          uptime: 0,
          ip: this.baseURL.replace('http://', '').split(':')[0],
          mac: 'Unknown'
        };
      }
      return response.json();
    } catch (error) {
      // Return fallback info if endpoint not implemented
      return {
        device: 'K1.reinvented',
        firmware: 'Unknown',
        uptime: 0,
        ip: this.baseURL.replace('http://', '').split(':')[0],
        mac: 'Unknown'
      };
    }
  }

  // WebSocket for Real-time Updates (future enhancement)
  connectWebSocket(onUpdate: (data: K1RealtimeData) => void, onStatusChange?: (status: ConnectionStatus) => void): void {
    if (this.websocket) {
      this.websocket.close();
    }

    const wsURL = this.baseURL.replace('http://', 'ws://') + '/ws';
    
    try {
      this.websocket = new WebSocket(wsURL);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected to K1 device');
        this.reconnectAttempts = 0;
        onStatusChange?.('connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data: K1RealtimeData = JSON.parse(event.data);
          onUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected from K1 device');
        onStatusChange?.('disconnected');
        
        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connectWebSocket(onUpdate, onStatusChange);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatusChange?.('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onStatusChange?.('error');
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // Utility Methods
  
  // Convert firmware parameters (0.0-1.0) to UI parameters (0-100%)
  static firmwareToUI(params: K1Parameters): K1ParameterUI {
    return {
      brightness: Math.round(params.brightness * 100),
      speed: Math.round(params.speed * 100),
      saturation: Math.round(params.saturation * 100),
      warmth: Math.round(params.warmth * 100),
      softness: Math.round(params.softness * 100),
      background: Math.round(params.background * 100),
      palette_id: params.palette_id
    };
  }

  // Device Discovery (future enhancement)
  static async discoverDevices(): Promise<string[]> {
    // This would implement mDNS discovery for K1 devices
    // For now, return empty array - users must enter IP manually
    return [];
  }

  // Validate IP address format
  static isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}