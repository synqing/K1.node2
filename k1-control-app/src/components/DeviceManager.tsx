/**
 * DeviceManager Component
 * Professional device discovery, manual connection, and status management
 *
 * Implements Task 3.4: K1Provider integration with auto-reconnect
 * - Wires discovery abstraction to K1Provider actions
 * - Implements auto-connect on startup with exponential backoff
 * - Displays reconnection attempts and status
 * - Manages device persistence to localStorage
 */

import React, { useState, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useK1State, useK1Actions } from '../providers/K1Provider';
import { useAutoReconnect } from '../hooks/useAutoReconnect';
import { getDeviceDiscovery } from '../services/device-discovery';
import { validateEndpoint } from '../utils/endpoint-validation';
import { K1_STORAGE_KEYS } from '../types/k1-types';

/**
 * Professional device management interface
 */
export function DeviceManager() {
  const k1State = useK1State();
  const k1Actions = useK1Actions();
  const autoReconnect = useAutoReconnect({ autoStart: true });
  const discovery = getDeviceDiscovery();

  const [manualEndpoint, setManualEndpoint] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const discoveredDevicesRef = useRef(new Map());

  /**
   * Attempt manual connection with endpoint validation
   */
  const handleManualConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualEndpoint.trim()) return;

      const validation = validateEndpoint(manualEndpoint);
      if (!validation.isValid) {
        k1Actions.setFeatureFlag('autoReconnect', false);
        // Error would be shown via error handler
        return;
      }

      try {
        await k1Actions.connect(validation.normalizedEndpoint!);
        // Persist endpoint on successful connection
        localStorage.setItem(K1_STORAGE_KEYS.ENDPOINT, validation.normalizedEndpoint!);
        setManualEndpoint('');
      } catch (error) {
        console.error('[DeviceManager] Manual connection failed:', error);
      }
    },
    [manualEndpoint, k1Actions]
  );

  /**
   * Trigger device discovery scan
   */
  const handleStartDiscovery = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const result = await discovery.discover({ timeout: 5000 });
      // Store discovered devices for UI display
      result.devices.forEach(device => {
        discoveredDevicesRef.current.set(device.id, device);
      });
    } catch (error) {
      console.error('[DeviceManager] Discovery failed:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, [discovery]);

  /**
   * Connect to a discovered device
   */
  const handleConnectToDiscoveredDevice = useCallback(
    async (deviceId: string) => {
      const device = discoveredDevicesRef.current.get(deviceId);
      if (!device) return;

      const endpoint = `http://${device.ip}:${device.port}`;
      try {
        await k1Actions.connect(endpoint);
        // Persist endpoint
        localStorage.setItem(K1_STORAGE_KEYS.ENDPOINT, endpoint);
        // Stop any ongoing reconnection attempts since we're now connected
        if (autoReconnect.isReconnecting) {
          autoReconnect.stop();
        }
      } catch (error) {
        console.error('[DeviceManager] Device connection failed:', error);
      }
    },
    [k1Actions, autoReconnect]
  );

  /**
   * Handle disconnect action
   */
  const handleDisconnect = useCallback(async () => {
    try {
      await k1Actions.disconnect();
      // After disconnect, trigger auto-reconnect if enabled
      if (k1State.featureFlags.autoReconnect) {
        autoReconnect.start();
      }
    } catch (error) {
      console.error('[DeviceManager] Disconnect failed:', error);
    }
  }, [k1Actions, k1State.featureFlags.autoReconnect, autoReconnect]);

  /**
   * Get visual status indicator
   */
  const getConnectionStatusIcon = () => {
    switch (k1State.connection) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const getConnectionStatusText = () => {
    switch (k1State.connection) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        if (autoReconnect.isReconnecting) {
          return `Reconnecting (attempt ${autoReconnect.attempt}/${10})...`;
        }
        return 'Connecting...';
      case 'error':
        if (autoReconnect.isReconnecting) {
          return `Connection failed, retrying...`;
        }
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[var(--k1-text)] mb-2">
          Device Manager
        </h1>
        <p className="text-[var(--k1-text-dim)]">
          Discover and connect to K1 devices on your network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discovery & Manual Connect Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auto-Reconnect Status */}
          {autoReconnect.isReconnecting && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
                <div>
                  <h3 className="font-medium text-yellow-900">
                    Attempting to reconnect...
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Attempt {autoReconnect.attempt} of 10
                    {autoReconnect.nextDelay && ` • Next in ${Math.ceil(autoReconnect.nextDelay / 1000)}s`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Device Discovery Section */}
          <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--k1-text)]">
                Device Discovery
              </h2>
              <button
                onClick={handleStartDiscovery}
                disabled={isDiscovering || k1State.connection === 'connecting'}
                className="px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Start device discovery"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Discover Devices
                  </>
                )}
              </button>
            </div>

            {/* Discovered Devices List */}
            <div className="space-y-3">
              {discovery.getCachedDevices(true).slice(0, 5).map(device => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-md hover:bg-[var(--k1-surface)] transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-[var(--k1-text)]">{device.name}</h3>
                    <div className="text-sm text-[var(--k1-text-dim)] space-y-1 mt-1">
                      <div className="flex items-center gap-4">
                        <span>📍 {device.ip}:{device.port}</span>
                        <span>🔧 {device.firmware}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>⏰ {formatLastSeen(device.lastSeen)}</span>
                        <span className="text-xs">Seen {device.discoveryCount}x</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectToDiscoveredDevice(device.id)}
                    disabled={k1State.connection === 'connecting'}
                    className="px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4"
                    aria-label={`Connect to ${device.name}`}
                  >
                    Connect
                  </button>
                </div>
              ))}

              {discovery.getCachedDevices().length === 0 && !isDiscovering && (
                <div className="text-center py-8 text-[var(--k1-text-dim)]">
                  <p className="mb-2">No devices found yet</p>
                  <p className="text-sm">Click "Discover Devices" to scan your network</p>
                </div>
              )}

              {isDiscovering && (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-[var(--k1-border)] rounded w-3/4 mx-auto"></div>
                    <p className="text-[var(--k1-text-dim)]">Scanning network...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Connect Section */}
          <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[var(--k1-text)] mb-4">
              Manual Connection
            </h2>
            <form onSubmit={handleManualConnect} className="space-y-4">
              <div>
                <label
                  htmlFor="endpoint-input"
                  className="block text-sm font-medium text-[var(--k1-text)] mb-2"
                >
                  Endpoint (IP/Hostname with optional port)
                </label>
                <input
                  id="endpoint-input"
                  type="text"
                  value={manualEndpoint}
                  onChange={e => setManualEndpoint(e.target.value)}
                  placeholder="192.168.1.103 or k1.local:8080"
                  className="w-full px-3 py-2 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-md text-[var(--k1-text)] placeholder-[var(--k1-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--k1-primary)] focus:border-transparent"
                />
                <p className="text-xs text-[var(--k1-text-dim)] mt-1">
                  Supports IPv4, IPv6 (e.g., [fe80::1]), and hostnames
                </p>
              </div>
              <button
                type="submit"
                disabled={!manualEndpoint.trim() || k1State.connection === 'connecting'}
                className="w-full px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {k1State.connection === 'connecting' ? 'Connecting...' : 'Connect'}
              </button>
            </form>
          </div>
        </div>

        {/* Status Panel */}
        <div className="bg-[var(--k1-surface)] border border-[var(--k1-border)] rounded-lg p-6 h-fit">
          <h2 className="text-xl font-semibold text-[var(--k1-text)] mb-4">
            Connection Status
          </h2>

          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--k1-text)]">Status</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getConnectionStatusIcon()}</span>
                <span className="text-sm font-medium text-[var(--k1-text)]">
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>

            {/* Device Info */}
            {k1State.deviceInfo && (
              <>
                <div className="border-t border-[var(--k1-border)] pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--k1-text-dim)]">Device</span>
                    <span className="text-sm text-[var(--k1-text)]">
                      {k1State.deviceInfo.device}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--k1-text-dim)]">Firmware</span>
                    <span className="text-sm text-[var(--k1-text)]">
                      {k1State.deviceInfo.firmware}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--k1-text-dim)]">IP</span>
                    <span className="text-sm text-[var(--k1-text)] font-mono">
                      {k1State.deviceInfo.ip}
                    </span>
                  </div>

                  {k1State.deviceInfo.latency !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--k1-text-dim)]">Latency</span>
                      <span className="text-sm text-[var(--k1-text)]">
                        {k1State.deviceInfo.latency}ms
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Error Display */}
            {k1State.lastError && (
              <div className="border-t border-[var(--k1-border)] pt-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        {k1State.lastError.message}
                      </p>
                      {k1State.lastError.details && (
                        <p className="text-xs text-red-600 mt-1">
                          {k1State.lastError.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {k1State.connection === 'connected' && (
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Disconnect
              </button>
            )}

            {autoReconnect.isReconnecting && (
              <button
                onClick={autoReconnect.stop}
                className="w-full px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm font-medium"
              >
                Cancel Retry
              </button>
            )}
          </div>

          {/* Auto-Reconnect Toggle */}
          <div className="border-t border-[var(--k1-border)] mt-4 pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={k1State.featureFlags.autoReconnect}
                onChange={e =>
                  k1Actions.setFeatureFlag('autoReconnect', e.target.checked)
                }
                className="w-4 h-4 rounded border-[var(--k1-border)] cursor-pointer"
              />
              <span className="text-sm text-[var(--k1-text)]">
                Auto-reconnect on disconnect
              </span>
            </label>
            <p className="text-xs text-[var(--k1-text-dim)] mt-2">
              Automatically reconnect with exponential backoff if connection is lost
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
