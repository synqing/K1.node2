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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { useK1State, useK1Actions } from '../providers/K1Provider';
import { useAutoReconnect } from '../hooks/useAutoReconnect';
import { getDeviceDiscovery } from '../services/device-discovery';
import { validateEndpoint, stripCredentialsFromEndpoint } from '../utils/endpoint-validation';
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
  const [displayedDevices, setDisplayedDevices] = useState(discovery.getCachedDevices(true));
  const discoveredDevicesRef = useRef(new Map());
  const updateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 300; // Debounce device list updates by 300ms
  const MAX_DISPLAYED_DEVICES = 8; // Show up to 8 devices before "View All"

  /**
   * Update displayed devices with debouncing to prevent UI thrash
   * This prevents re-rendering on every single discovery update
   */
  const updateDisplayedDevices = useCallback(() => {
    // Clear any pending debounce timer
    if (updateDebounceTimerRef.current) {
      clearTimeout(updateDebounceTimerRef.current);
    }

    // Set up debounce timer for next update
    updateDebounceTimerRef.current = setTimeout(() => {
      const cachedDevices = discovery.getCachedDevices(true); // Already sorted by lastSeen
      setDisplayedDevices(cachedDevices);
      lastUpdateTimeRef.current = Date.now();
    }, DEBOUNCE_DELAY);
  }, [discovery, DEBOUNCE_DELAY]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (updateDebounceTimerRef.current) {
        clearTimeout(updateDebounceTimerRef.current);
      }
    };
  }, []);

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
        // Persist endpoint on successful connection (strip credentials for security)
        const safeEndpoint = stripCredentialsFromEndpoint(validation.normalizedEndpoint!);
        localStorage.setItem(K1_STORAGE_KEYS.ENDPOINT, safeEndpoint);
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
      // Store discovered devices for quick access
      result.devices.forEach(device => {
        discoveredDevicesRef.current.set(device.id, device);
      });
      // Update displayed devices (debounced to prevent UI thrash)
      updateDisplayedDevices();
    } catch (error) {
      console.error('[DeviceManager] Discovery failed:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, [discovery, updateDisplayedDevices]);

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
        // Persist endpoint (strip credentials for security)
        const safeEndpoint = stripCredentialsFromEndpoint(endpoint);
        localStorage.setItem(K1_STORAGE_KEYS.ENDPOINT, safeEndpoint);
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
   * Handle immediate retry action
   */
  const handleRetry = useCallback(async () => {
    try {
      // Get last endpoint from state or localStorage
      const lastEndpoint =
        localStorage.getItem('k1:v1:endpoint') ||
        (k1State.deviceInfo?.ip ? `http://${k1State.deviceInfo.ip}` : null);

      if (!lastEndpoint) {
        console.warn('[DeviceManager] No endpoint to retry');
        return;
      }

      // Clear previous error and attempt connection
      k1Actions.clearError();
      await k1Actions.connect(lastEndpoint);

      // Stop auto-reconnect if it was running
      if (autoReconnect.isReconnecting) {
        autoReconnect.stop();
      }
    } catch (error) {
      console.error('[DeviceManager] Retry connection failed:', error);
    }
  }, [k1State.deviceInfo, k1Actions, autoReconnect]);

  /**
   * Get user-friendly error title based on error type
   */
  const getErrorTitle = (errorType?: string): string => {
    switch (errorType) {
      case 'connect_error':
        return 'Connection Failed';
      case 'timeout_error':
        return 'Connection Timeout';
      case 'network_error':
        return 'Network Error';
      case 'validation_error':
        return 'Invalid Input';
      case 'reconnect_giveup':
        return 'Reconnection Failed';
      case 'ws_send_error':
        return 'WebSocket Error';
      case 'rest_error':
        return 'API Error';
      default:
        return 'Connection Error';
    }
  };

  /**
   * Get troubleshooting guidance based on error type
   */
  const getErrorDiagnosis = (errorType?: string): string | null => {
    switch (errorType) {
      case 'connect_error':
        return 'Check that the device IP/hostname is correct and the device is powered on and connected to the network.';
      case 'timeout_error':
        return 'The connection took too long. Try moving closer to the device or check if the network is congested.';
      case 'network_error':
        return 'Unable to reach the network. Check your internet connection and firewall settings.';
      case 'validation_error':
        return 'The entered endpoint is invalid. Use format: IP (e.g., 192.168.1.100) or hostname:port (e.g., k1.local:8080)';
      case 'reconnect_giveup':
        return 'Auto-reconnect reached maximum attempts. Try refreshing the page or check the device status.';
      default:
        return null;
    }
  };

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

  /**
   * Format relative timestamp in human-readable format
   */
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

  /**
   * Determine if device should show "premium" indicator
   * (seen multiple times or very recently)
   */
  const isPremiumDevice = (device: typeof displayedDevices[0]): boolean => {
    // Show star if seen 3+ times or seen within last 5 minutes
    const seenMultipleTimes = device.discoveryCount >= 3;
    const recentlySeen = (() => {
      const now = new Date();
      const diffMs = now.getTime() - device.lastSeen.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      return diffMinutes <= 5;
    })();

    return seenMultipleTimes || recentlySeen;
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
                className="px-4 py-2.5 bg-[var(--k1-primary)] text-white rounded-lg hover:bg-[var(--k1-primary-hover)] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                aria-label="Scan network for K1 devices"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
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
              {displayedDevices.slice(0, MAX_DISPLAYED_DEVICES).map((device, index) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 bg-[var(--k1-background)] border border-[var(--k1-border)] rounded-lg hover:bg-[var(--k1-surface)] transition-all hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[var(--k1-text)]">{device.name}</h3>
                      {isPremiumDevice(device) && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" title="Frequently seen device" />
                      )}
                      {index === 0 && displayedDevices.length > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Most Recent</span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--k1-text-dim)] space-y-1 mt-1">
                      <div className="flex items-center gap-4">
                        <span>📍 {device.ip}:{device.port}</span>
                        <span>🔧 {device.firmware}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>⏰ {formatLastSeen(device.lastSeen)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${device.discoveryCount >= 3 ? 'bg-blue-100 text-blue-700' : 'text-[var(--k1-text-dim)]'}`}>
                          Seen {device.discoveryCount}x
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectToDiscoveredDevice(device.id)}
                    disabled={k1State.connection === 'connecting'}
                    className="px-4 py-2 bg-[var(--k1-primary)] text-white rounded-lg hover:bg-[var(--k1-primary-hover)] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium ml-4 whitespace-nowrap shadow-sm hover:shadow-md flex items-center gap-1"
                    aria-label={`Connect to ${device.name}`}
                  >
                    {k1State.connection === 'connecting' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>📡 Connect</>
                    )}
                  </button>
                </div>
              ))}

              {/* Show "View All Devices" if more than MAX_DISPLAYED_DEVICES */}
              {displayedDevices.length > MAX_DISPLAYED_DEVICES && (
                <button
                  onClick={() => {
                    // Toggle view of all devices by temporarily showing all
                    setDisplayedDevices(discovery.getCachedDevices(true));
                  }}
                  className="w-full text-center py-2 text-sm text-[var(--k1-primary)] hover:text-[var(--k1-primary-hover)] font-medium transition-colors"
                >
                  📋 View all {displayedDevices.length} devices
                </button>
              )}

              {displayedDevices.length === 0 && !isDiscovering && (
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
                className="w-full px-4 py-2.5 bg-[var(--k1-primary)] text-white rounded-lg hover:bg-[var(--k1-primary-hover)] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg"
              >
                {k1State.connection === 'connecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  '🔗 Connect'
                )}
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
              <div className="border-t border-[var(--k1-border)] pt-4 space-y-3">
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-red-800 mb-1">
                        {getErrorTitle(k1State.lastError.type)}
                      </h3>
                      <p className="text-sm text-red-700 mb-2">
                        {k1State.lastError.message}
                      </p>
                      {k1State.lastError.details && (
                        <p className="text-xs text-red-600 bg-white bg-opacity-50 rounded px-2 py-1 mb-2">
                          {k1State.lastError.details}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleRetry}
                          disabled={k1State.connection === 'connecting'}
                          className="text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Retry connection immediately"
                        >
                          Retry Now
                        </button>
                        <button
                          onClick={() => k1Actions.clearError()}
                          className="text-xs font-medium px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded hover:bg-red-50 transition-colors"
                          aria-label="Dismiss error message"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Diagnosis Helper */}
                {getErrorDiagnosis(k1State.lastError.type) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                    <p className="font-medium mb-1">💡 Troubleshooting:</p>
                    <p>{getErrorDiagnosis(k1State.lastError.type)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {k1State.connection === 'connected' && (
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                aria-label="Disconnect from device"
              >
                🔌 Disconnect
              </button>
            )}

            {autoReconnect.isReconnecting && (
              <div className="space-y-2">
                <button
                  onClick={autoReconnect.stop}
                  className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:bg-amber-700 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                  aria-label="Stop automatic reconnection attempts"
                >
                  ⏹️ Stop Retrying
                </button>
                <p className="text-xs text-[var(--k1-text-dim)] text-center">
                  Retrying in {Math.ceil((autoReconnect.nextDelay || 0) / 1000)}s...
                </p>
              </div>
            )}

            {k1State.connection === 'error' && !autoReconnect.isReconnecting && (
              <button
                onClick={handleRetry}
                className="w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                aria-label="Attempt to reconnect immediately"
              >
                🔄 Retry Now
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
