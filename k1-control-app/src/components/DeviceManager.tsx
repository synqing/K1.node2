/**
 * DeviceManager Component
 * Implements Subtask 3.2: DeviceManager UI with Discovery, Manual Connect, and Status panels
 */

import React, { useState, useEffect } from 'react'
import { useK1State, useK1Actions } from '../providers/K1Provider'
import { useDeviceDiscovery } from '../services/discovery-service'
import { useAutoDiscovery, saveLastConnectedDevice } from '../hooks/useAutoDiscovery'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { K1DiscoveredDevice } from '../types/k1-types'

/**
 * Professional device management interface
 */
export function DeviceManager() {
  const k1State = useK1State()
  const k1Actions = useK1Actions()
  const discovery = useDeviceDiscovery()
  const { showError } = useErrorHandler()
  const autoDiscovery = useAutoDiscovery()
  
  const [discoveredDevices, setDiscoveredDevices] = useState<K1DiscoveredDevice[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [manualIp, setManualIp] = useState('')
  const [manualPort, setManualPort] = useState('80')

  // Update discovered devices when discovery completes
  useEffect(() => {
    const handleDevicesFound = (devices: K1DiscoveredDevice[]) => {
      setDiscoveredDevices(devices)
    }

    const handleDiscoveryStarted = () => {
      setIsDiscovering(true)
    }

    const handleDiscoveryCompleted = () => {
      setIsDiscovering(false)
    }

    // Subscribe to discovery events
    const discoveryService = discovery as any // Access the underlying service
    if (discoveryService.on) {
      discoveryService.on('devices-found', handleDevicesFound)
      discoveryService.on('discovery-started', handleDiscoveryStarted)
      discoveryService.on('discovery-completed', handleDiscoveryCompleted)
    }

    return () => {
      if (discoveryService.off) {
        discoveryService.off('devices-found', handleDevicesFound)
        discoveryService.off('discovery-started', handleDiscoveryStarted)
        discoveryService.off('discovery-completed', handleDiscoveryCompleted)
      }
    }
  }, [discovery])

  const handleStartDiscovery = async () => {
    try {
      const result = await discovery.discoverDevices({ timeout: 5000 })
      setDiscoveredDevices(result.devices)
    } catch (error) {
      showError(error, { context: 'manual-discovery' })
    }
  }

  const handleConnectToDevice = async (device: K1DiscoveredDevice) => {
    try {
      const endpoint = `http://${device.ip}:${device.port}`
      await k1Actions.connect(endpoint)
      
      // Save as last connected device
      saveLastConnectedDevice(device)
    } catch (error) {
      showError(error, { 
        context: 'device-connection',
        device: device.name,
        endpoint: `${device.ip}:${device.port}`
      })
    }
  }

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualIp.trim()) return

    try {
      const port = parseInt(manualPort) || 80
      const endpoint = `http://${manualIp.trim()}:${port}`
      
      // Add to discovery cache
      const device = discovery.addManualDevice(manualIp.trim(), port)
      
      // Connect
      await k1Actions.connect(endpoint)
      
      // Save as last connected device
      saveLastConnectedDevice(device)
    } catch (error) {
      showError(error, { 
        context: 'manual-connection',
        endpoint: `${manualIp.trim()}:${manualPort}`
      })
    }
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getConnectionStatusColor = () => {
    switch (k1State.connection) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (k1State.connection) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--k1-text)] mb-2">
          Device Manager
        </h1>
        <p className="text-[var(--k1-text-dim)]">
          Discover and connect to K1 devices on your network
        </p>
      </div>

      {/* Auto-Discovery Status */}
      {autoDiscovery.isAutoDiscovering && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-2xl">🔍</div>
            <div>
              <h3 className="font-medium text-blue-900">Searching for K1 devices...</h3>
              <p className="text-sm text-blue-700">This usually takes 2-3 seconds</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Auto-Connect Suggestion */}
      {autoDiscovery.autoConnectSuggestion && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✨</div>
              <div>
                <h3 className="font-medium text-green-900">
                  Found your previous device: {autoDiscovery.autoConnectSuggestion.name}
                </h3>
                <p className="text-sm text-green-700">
                  {autoDiscovery.autoConnectSuggestion.ip}:{autoDiscovery.autoConnectSuggestion.port}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleConnectToDevice(autoDiscovery.autoConnectSuggestion!)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Connect
              </button>
              <button
                onClick={autoDiscovery.dismissAutoConnectSuggestion}
                className="px-3 py-2 text-green-700 hover:text-green-900 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Connect from Auto-Discovery */}
      {!autoDiscovery.isAutoDiscovering && autoDiscovery.discoveredDevices.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              Found {autoDiscovery.discoveredDevices.length} device(s) on your network
            </h3>
            <button
              onClick={autoDiscovery.refreshDiscovery}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoDiscovery.discoveredDevices.slice(0, 4).map(device => (
              <button
                key={device.id}
                onClick={() => handleConnectToDevice(device)}
                className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                📡 {device.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discovery Panel */}
        <div className="lg:col-span-2">
          <DiscoveryPanel
            devices={discoveredDevices}
            isDiscovering={isDiscovering}
            onStartDiscovery={handleStartDiscovery}
            onConnectToDevice={handleConnectToDevice}
            formatLastSeen={formatLastSeen}
            currentConnection={k1State.connection}
          />
        </div>

        {/* Manual Connect & Status Panel */}
        <div className="space-y-6">
          <ManualConnectPanel
            manualIp={manualIp}
            manualPort={manualPort}
            onIpChange={setManualIp}
            onPortChange={setManualPort}
            onSubmit={handleManualConnect}
            isConnecting={k1State.connection === 'connecting'}
          />

          <StatusPanel
            connectionState={k1State.connection}
            deviceInfo={k1State.deviceInfo}
            lastError={k1State.lastError}
            statusColor={getConnectionStatusColor()}
            statusText={getConnectionStatusText()}
            onDisconnect={() => k1Actions.disconnect()}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Discovery Panel Component
 */
interface DiscoveryPanelProps {
  devices: K1DiscoveredDevice[]
  isDiscovering: boolean
  onStartDiscovery: () => void
  onConnectToDevice: (device: K1DiscoveredDevice) => void
  formatLastSeen: (date: Date) => string
  currentConnection: string
}

function DiscoveryPanel({
  devices,
  isDiscovering,
  onStartDiscovery,
  onConnectToDevice,
  formatLastSeen,
  currentConnection
}: DiscoveryPanelProps) {
  return (
    <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--k1-text)]">
          Device Discovery
        </h2>
        <button
          onClick={onStartDiscovery}
          disabled={isDiscovering}
          className="px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Start device discovery"
        >
          {isDiscovering ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Discovering...
            </>
          ) : (
            'Discover Devices'
          )}
        </button>
      </div>

      <div className="space-y-3" role="list" aria-label="Discovered devices">
        {devices.length === 0 ? (
          <div className="text-center py-8 text-[var(--k1-text-dim)]">
            {isDiscovering ? (
              <div className="space-y-2">
                <div className="animate-pulse">
                  <div className="h-4 bg-[var(--k1-border)] rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-[var(--k1-border)] rounded w-1/2 mx-auto"></div>
                </div>
                <p>Scanning network for K1 devices...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>No devices found</p>
                <p className="text-sm">Click "Discover Devices" to scan your network</p>
              </div>
            )}
          </div>
        ) : (
          devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onConnect={() => onConnectToDevice(device)}
              formatLastSeen={formatLastSeen}
              isConnecting={currentConnection === 'connecting'}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Device Card Component
 */
interface DeviceCardProps {
  device: K1DiscoveredDevice
  onConnect: () => void
  formatLastSeen: (date: Date) => string
  isConnecting: boolean
}

function DeviceCard({ device, onConnect, formatLastSeen, isConnecting }: DeviceCardProps) {
  const getDiscoveryMethodIcon = (method: string) => {
    switch (method) {
      case 'mdns': return '📡'
      case 'scan': return '🔍'
      case 'manual': return '✏️'
      default: return '❓'
    }
  }

  const getSignalStrength = (rssi?: number) => {
    if (!rssi) return null
    if (rssi > -50) return '📶'
    if (rssi > -70) return '📶'
    return '📶'
  }

  return (
    <div 
      className="flex items-center justify-between p-4 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-md hover:bg-[var(--k1-surface)] transition-colors"
      role="listitem"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{getDiscoveryMethodIcon(device.discoveryMethod)}</span>
          <h3 className="font-medium text-[var(--k1-text)]">{device.name}</h3>
          {device.rssi && (
            <span className="text-sm" title={`Signal: ${device.rssi} dBm`}>
              {getSignalStrength(device.rssi)}
            </span>
          )}
        </div>
        
        <div className="text-sm text-[var(--k1-text-dim)] space-y-1">
          <div className="flex items-center gap-4">
            <span>📍 {device.ip}:{device.port}</span>
            <span>🔧 {device.firmware}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>🏷️ {device.mac}</span>
            <span>⏰ {formatLastSeen(device.lastSeen)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4"
        aria-label={`Connect to ${device.name}`}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  )
}

/**
 * Manual Connect Panel Component
 */
interface ManualConnectPanelProps {
  manualIp: string
  manualPort: string
  onIpChange: (ip: string) => void
  onPortChange: (port: string) => void
  onSubmit: (e: React.FormEvent) => void
  isConnecting: boolean
}

function ManualConnectPanel({
  manualIp,
  manualPort,
  onIpChange,
  onPortChange,
  onSubmit,
  isConnecting
}: ManualConnectPanelProps) {
  return (
    <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--k1-text)] mb-4">
        Manual Connect
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="manual-ip" 
            className="block text-sm font-medium text-[var(--k1-text)] mb-2"
          >
            IP Address or Hostname
          </label>
          <input
            id="manual-ip"
            type="text"
            value={manualIp}
            onChange={(e) => onIpChange(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full px-3 py-2 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-md text-[var(--k1-text)] placeholder-[var(--k1-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--k1-primary)] focus:border-transparent"
            aria-describedby="ip-help"
          />
          <p id="ip-help" className="text-xs text-[var(--k1-text-dim)] mt-1">
            Enter the IP address or hostname of your K1 device
          </p>
        </div>

        <div>
          <label 
            htmlFor="manual-port" 
            className="block text-sm font-medium text-[var(--k1-text)] mb-2"
          >
            Port
          </label>
          <input
            id="manual-port"
            type="number"
            value={manualPort}
            onChange={(e) => onPortChange(e.target.value)}
            placeholder="80"
            min="1"
            max="65535"
            className="w-full px-3 py-2 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-md text-[var(--k1-text)] placeholder-[var(--k1-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--k1-primary)] focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={!manualIp.trim() || isConnecting}
          className="w-full px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  )
}

/**
 * Status Panel Component
 */
interface StatusPanelProps {
  connectionState: string
  deviceInfo: any
  lastError: any
  statusColor: string
  statusText: string
  onDisconnect: () => void
}

function StatusPanel({
  connectionState,
  deviceInfo,
  lastError,
  statusColor,
  statusText,
  onDisconnect
}: StatusPanelProps) {
  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = uptime % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--k1-text)] mb-4">
        Connection Status
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--k1-text)]">Status</span>
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {deviceInfo && (
          <>
            <div className="border-t border-[var(--k1-border)] pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--k1-text-dim)]">Device</span>
                <span className="text-sm text-[var(--k1-text)]">{deviceInfo.device}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-[var(--k1-text-dim)]">Firmware</span>
                <span className="text-sm text-[var(--k1-text)]">{deviceInfo.firmware}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-[var(--k1-text-dim)]">IP Address</span>
                <span className="text-sm text-[var(--k1-text)]">{deviceInfo.ip}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-[var(--k1-text-dim)]">MAC Address</span>
                <span className="text-sm text-[var(--k1-text)] font-mono text-xs">{deviceInfo.mac}</span>
              </div>
              
              {deviceInfo.uptime && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--k1-text-dim)]">Uptime</span>
                  <span className="text-sm text-[var(--k1-text)]">{formatUptime(deviceInfo.uptime)}</span>
                </div>
              )}
              
              {deviceInfo.latency && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--k1-text-dim)]">Latency</span>
                  <span className="text-sm text-[var(--k1-text)]">{deviceInfo.latency}ms</span>
                </div>
              )}
            </div>
          </>
        )}

        {lastError && (
          <div className="border-t border-[var(--k1-border)] pt-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {lastError.message}
                  </p>
                  {lastError.details && (
                    <p className="text-xs text-red-600 mt-1">
                      {lastError.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {connectionState === 'connected' && (
          <button
            onClick={onDisconnect}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}