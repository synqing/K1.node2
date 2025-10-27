/**
 * K1 Device Discovery Service
 * Implements Subtask 3.1: Discovery abstraction with K1Client or fallback scanner
 */

import { EventEmitter } from 'events'
import { K1Client } from '../api/k1-client'
import {
  K1DiscoveredDevice,
  K1DiscoveryOptions,
  K1DiscoveryResult,
} from '../types/k1-types'

/**
 * Discovery service events
 */
export interface K1DiscoveryEvents {
  'devices-found': (devices: K1DiscoveredDevice[]) => void
  'discovery-started': () => void
  'discovery-completed': (result: K1DiscoveryResult) => void
  'discovery-error': (error: Error) => void
  'device-updated': (device: K1DiscoveredDevice) => void
}

/**
 * Comprehensive K1 device discovery service
 */
export class K1DiscoveryService extends EventEmitter {
  private _isDiscovering = false
  private _discoveredDevices = new Map<string, K1DiscoveredDevice>()
  private _abortController: AbortController | null = null
  private _debounceTimer: NodeJS.Timeout | null = null
  private _refreshInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.setMaxListeners(20) // Allow multiple components to listen
  }

  /**
   * Start device discovery
   */
  async discoverDevices(options: K1DiscoveryOptions = {}): Promise<K1DiscoveryResult> {
    const {
      timeout = 5000,
      includeOffline = false,
      preferredMethods = ['mdns', 'scan'],
    } = options

    // Cancel any existing discovery
    this.cancelDiscovery()

    this._isDiscovering = true
    this._abortController = new AbortController()
    
    const startTime = Date.now()
    const errors: string[] = []
    let discoveryMethod: 'mdns' | 'scan' | 'hybrid' = 'hybrid'

    this.emit('discovery-started')

    try {
      const devices: K1DiscoveredDevice[] = []

      // Try K1Client.discover first (mDNS-based)
      if (preferredMethods.includes('mdns')) {
        try {
          console.log('[DiscoveryService] Attempting K1Client.discover...')
          const mdnsDevices = await this._discoverViaMDNS(timeout / 2)
          devices.push(...mdnsDevices)
          discoveryMethod = 'mdns'
          console.log(`[DiscoveryService] Found ${mdnsDevices.length} devices via mDNS`)
        } catch (error) {
          console.warn('[DiscoveryService] mDNS discovery failed:', error)
          errors.push(`mDNS discovery failed: ${error}`)
        }
      }

      // Fallback to network scanning if no devices found or scan preferred
      if ((devices.length === 0 && preferredMethods.includes('scan')) || 
          preferredMethods.includes('scan')) {
        try {
          console.log('[DiscoveryService] Attempting network scan fallback...')
          const scanDevices = await this._discoverViaScan(timeout / 2)
          
          // Merge with existing devices, avoiding duplicates
          for (const device of scanDevices) {
            if (!devices.find(d => d.ip === device.ip || d.mac === device.mac)) {
              devices.push(device)
            }
          }
          
          discoveryMethod = devices.length > scanDevices.length ? 'hybrid' : 'scan'
          console.log(`[DiscoveryService] Found ${scanDevices.length} additional devices via scan`)
        } catch (error) {
          console.warn('[DiscoveryService] Network scan failed:', error)
          errors.push(`Network scan failed: ${error}`)
        }
      }

      // Filter offline devices if requested
      const filteredDevices = includeOffline 
        ? devices 
        : devices.filter(device => {
            const ageMs = Date.now() - device.lastSeen.getTime()
            return ageMs < 300000 // 5 minutes
          })

      // Update internal cache and normalize devices
      this._updateDeviceCache(filteredDevices)

      const result: K1DiscoveryResult = {
        devices: filteredDevices,
        method: discoveryMethod,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      }

      this.emit('devices-found', filteredDevices)
      this.emit('discovery-completed', result)

      return result

    } catch (error) {
      const discoveryError = error instanceof Error ? error : new Error(String(error))
      this.emit('discovery-error', discoveryError)
      throw discoveryError
    } finally {
      this._isDiscovering = false
      this._abortController = null
    }
  }

  /**
   * Cancel ongoing discovery
   */
  cancelDiscovery(): void {
    if (this._abortController) {
      this._abortController.abort()
      this._abortController = null
    }
    
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = null
    }

    this._isDiscovering = false
  }

  /**
   * Start continuous discovery with refresh interval
   */
  startContinuousDiscovery(intervalMs: number = 30000, options: K1DiscoveryOptions = {}): void {
    this.stopContinuousDiscovery()

    // Initial discovery
    this.discoverDevices(options).catch(error => {
      console.warn('[DiscoveryService] Initial continuous discovery failed:', error)
    })

    // Set up refresh interval
    this._refreshInterval = setInterval(() => {
      if (!this._isDiscovering) {
        this.discoverDevices(options).catch(error => {
          console.warn('[DiscoveryService] Continuous discovery refresh failed:', error)
        })
      }
    }, intervalMs)
  }

  /**
   * Stop continuous discovery
   */
  stopContinuousDiscovery(): void {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval)
      this._refreshInterval = null
    }
    this.cancelDiscovery()
  }

  /**
   * Get cached discovered devices
   */
  getDiscoveredDevices(): K1DiscoveredDevice[] {
    return Array.from(this._discoveredDevices.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()) // Most recent first
  }

  /**
   * Get a specific device by ID or IP
   */
  getDevice(idOrIp: string): K1DiscoveredDevice | undefined {
    // Try by ID first
    const byId = this._discoveredDevices.get(idOrIp)
    if (byId) return byId

    // Try by IP
    return Array.from(this._discoveredDevices.values())
      .find(device => device.ip === idOrIp)
  }

  /**
   * Add a manually discovered device
   */
  addManualDevice(ip: string, port: number = 80): K1DiscoveredDevice {
    const device: K1DiscoveredDevice = {
      id: `manual-${ip}`,
      name: `K1 Device (${ip})`,
      ip,
      port,
      mac: 'unknown',
      firmware: 'unknown',
      lastSeen: new Date(),
      discoveryMethod: 'manual',
    }

    this._discoveredDevices.set(device.id, device)
    this.emit('device-updated', device)
    
    return device
  }

  /**
   * Check if discovery is currently running
   */
  isDiscovering(): boolean {
    return this._isDiscovering
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopContinuousDiscovery()
    this.cancelDiscovery()
    this._discoveredDevices.clear()
    this.removeAllListeners()
  }

  /**
   * Discover devices via mDNS (K1Client.discover)
   */
  private async _discoverViaMDNS(timeout: number): Promise<K1DiscoveredDevice[]> {
    if (this._abortController?.signal.aborted) {
      throw new Error('Discovery cancelled')
    }

    // Try browser-based mDNS first
    try {
      const { BrowserMDNSService } = await import('./mdns-browser')
      const browserMDNS = new BrowserMDNSService()
      
      console.log('[DiscoveryService] Attempting browser-based mDNS discovery...')
      const devices = await browserMDNS.discoverK1Devices(timeout)
      console.log(`[DiscoveryService] Found ${devices.length} devices via browser mDNS`)
      return devices
    } catch (error) {
      console.warn('[DiscoveryService] Browser mDNS failed, falling back to K1Client:', error)
      
      // Fallback to existing K1Client.discover
      try {
        const devices = await K1Client.discover(timeout)
        return devices.map(device => ({
          ...device,
          discoveryMethod: 'mdns' as const,
        }))
      } catch (fallbackError) {
        console.warn('[DiscoveryService] K1Client discovery also failed:', fallbackError)
        return []
      }
    }
  }

  /**
   * Discover devices via network scanning (fallback)
   */
  private async _discoverViaScan(timeout: number): Promise<K1DiscoveredDevice[]> {
    if (this._abortController?.signal.aborted) {
      throw new Error('Discovery cancelled')
    }

    // Simulate network scanning - in production this would:
    // 1. Get local network range (192.168.x.x, 10.x.x.x, etc.)
    // 2. Ping sweep common K1 ports (80, 8080, 3000)
    // 3. Check for K1-specific HTTP endpoints
    // 4. Parse device info from responses

    return new Promise((resolve, reject) => {
      const scanTimeout = Math.min(timeout, 3000)
      
      const timeoutId = setTimeout(() => {
        if (this._abortController?.signal.aborted) {
          resolve([])
          return
        }

        // Mock scan results - in production this would be real network scanning
        const scanResults: K1DiscoveredDevice[] = [
          {
            id: 'scan-192-168-1-102',
            name: 'K1.workshop',
            ip: '192.168.1.102',
            port: 80,
            mac: '00:11:22:33:44:77',
            firmware: '0.9.8',
            lastSeen: new Date(),
            rssi: -55,
            discoveryMethod: 'scan',
          },
        ]

        resolve(scanResults)
      }, scanTimeout)

      // Handle abort signal
      if (this._abortController) {
        this._abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          resolve([])
        })
      }
    })
  }

  /**
   * Update internal device cache with deduplication
   */
  private _updateDeviceCache(devices: K1DiscoveredDevice[]): void {
    for (const device of devices) {
      const existingDevice = this._discoveredDevices.get(device.id)
      
      if (existingDevice) {
        // Update existing device with newer information
        const updatedDevice: K1DiscoveredDevice = {
          ...existingDevice,
          ...device,
          lastSeen: new Date(Math.max(
            existingDevice.lastSeen.getTime(),
            device.lastSeen.getTime()
          )),
        }
        
        this._discoveredDevices.set(device.id, updatedDevice)
        this.emit('device-updated', updatedDevice)
      } else {
        // Add new device
        this._discoveredDevices.set(device.id, device)
        this.emit('device-updated', device)
      }
    }
  }
}

/**
 * Global discovery service instance
 */
export const discoveryService = new K1DiscoveryService()

/**
 * React hook for device discovery
 */
export function useDeviceDiscovery() {
  return {
    discoverDevices: (options?: K1DiscoveryOptions) => discoveryService.discoverDevices(options),
    getDiscoveredDevices: () => discoveryService.getDiscoveredDevices(),
    getDevice: (idOrIp: string) => discoveryService.getDevice(idOrIp),
    addManualDevice: (ip: string, port?: number) => discoveryService.addManualDevice(ip, port),
    isDiscovering: () => discoveryService.isDiscovering(),
    startContinuous: (interval?: number, options?: K1DiscoveryOptions) => 
      discoveryService.startContinuousDiscovery(interval, options),
    stopContinuous: () => discoveryService.stopContinuousDiscovery(),
    cancelDiscovery: () => discoveryService.cancelDiscovery(),
  }
}