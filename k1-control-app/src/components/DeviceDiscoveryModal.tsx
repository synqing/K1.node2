/**
 * Device Discovery Modal
 * Implements Phase 1 Week 1: Auto-discovery modal on first launch
 * Addresses critical blocker: 40% bounce rate due to missing device discovery UI
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Wifi, RefreshCw, AlertCircle, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { K1DiscoveredDevice } from '../types/k1-types';
import { useDeviceDiscovery } from '../services/discovery-service';
import { useAutoDiscovery, saveLastConnectedDevice } from '../hooks/useAutoDiscovery';
import { useK1State } from '../providers/K1Provider';

interface DeviceDiscoveryModalProps {
  isOpen: boolean;
  isConnected: boolean;
  onDiscoveryComplete: (device: K1DiscoveredDevice) => Promise<void>;
  onClose?: () => void;
}

/**
 * Modal that guides users through device discovery and connection
 * - Auto-discovers devices on mount (mDNS + network scan)
 * - Shows discovered devices with one-click connect
 * - Fallback to manual IP entry
 * - Auto-suggests previously connected device
 * - Auto-dismisses when connection is successful
 */
export function DeviceDiscoveryModal({
  isOpen,
  isConnected,
  onDiscoveryComplete,
  onClose,
}: DeviceDiscoveryModalProps) {
  const discovery = useDeviceDiscovery();
  const autoDiscovery = useAutoDiscovery();
  const k1State = useK1State();
  const providerIsConnected = k1State.connection === 'connected';

  const [discoveredDevices, setDiscoveredDevices] = useState<K1DiscoveredDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<K1DiscoveredDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualIp, setManualIp] = useState('192.168.1.103');
  const [manualPort, setManualPort] = useState('80');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  // Auto-dismiss when successfully connected
  useEffect(() => {
    if (providerIsConnected && connectionSuccess) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 1500); // Give user time to see success message
      return () => clearTimeout(timer);
    }
  }, [providerIsConnected, connectionSuccess, onClose]);

  // Auto-discover on mount
  useEffect(() => {
    if ((isOpen && !providerIsConnected)) {
      runDiscovery();
    }
  }, [isOpen, providerIsConnected]);

  const runDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    setConnectionError(null);

    try {
      console.log('[DeviceDiscoveryModal] Starting auto-discovery...');

      const result = await discovery.discoverDevices({
        timeout: 3000,
        preferredMethods: ['mdns', 'scan'],
      });

      console.log(`[DeviceDiscoveryModal] Found ${result.devices.length} devices`);

      setDiscoveredDevices(result.devices);

      // If we found at least one device, auto-select first one
      if (result.devices.length > 0) {
        setSelectedDevice(result.devices[0]);
      }

      // Check for previously connected device suggestion
      if (result.devices.length > 0 && autoDiscovery.autoConnectSuggestion) {
        const suggestion = result.devices.find(
          (d) =>
            d.ip === autoDiscovery.autoConnectSuggestion?.ip ||
            d.mac === autoDiscovery.autoConnectSuggestion?.mac,
        );
        if (suggestion) {
          console.log('[DeviceDiscoveryModal] Found previously connected device:', suggestion.name);
          setSelectedDevice(suggestion);
        }
      }
    } catch (error) {
      console.error('[DeviceDiscoveryModal] Discovery failed:', error);
      setDiscoveryError(
        error instanceof Error
          ? error.message
          : 'Failed to discover devices. Try manual entry.',
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnectToDevice = async (device: K1DiscoveredDevice) => {
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    try {
      console.log('[DeviceDiscoveryModal] Connecting to device:', device.name);

      // Save as last connected device
      saveLastConnectedDevice(device);

      // Call parent's connection handler
      await onDiscoveryComplete(device);

      console.log('[DeviceDiscoveryModal] Successfully connected to device');
      setConnectionSuccess(true);
    } catch (error) {
      console.error('[DeviceDiscoveryModal] Connection failed:', error);
      setConnectionError(
        error instanceof Error
          ? error.message
          : 'Failed to connect to device. Check network and device availability.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualIp.trim()) {
      setConnectionError('Please enter a device IP address');
      return;
    }

    const port = parseInt(manualPort) || 80;
    const device = discovery.addManualDevice(manualIp.trim(), port);

    await handleConnectToDevice(device);
  };

  const handleRetryDiscovery = () => {
    setDiscoveredDevices([]);
    setSelectedDevice(null);
    setShowManualEntry(false);
    setConnectionError(null);
    runDiscovery();
  };

  const handleClose = () => {
    if (!isConnecting) {
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen && !providerIsConnected} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[var(--k1-text)] flex items-center gap-2">
              <Wifi className="w-5 h-5 text-[var(--k1-accent)]" />
              Connect to K1 Device
            </DialogTitle>
            {!isConnecting && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription className="text-[var(--k1-text-dim)]">
            {connectionSuccess
              ? '✅ Successfully connected! This dialog will close automatically.'
              : isDiscovering
                ? 'Searching for K1 devices on your network...'
                : discoveredDevices.length > 0
                  ? 'Select a device to connect or enter IP manually'
                  : 'No devices found. Enter your device IP address below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Success */}
          {connectionSuccess && (
            <Card className="p-6 text-center bg-green-900/20 border-green-600/30">
              <Check className="w-8 h-8 mx-auto text-green-400 mb-3" />
              <p className="text-green-300 font-medium">Connection Successful!</p>
              <p className="text-sm text-green-200 mt-1">
                You're now connected to your K1 device
              </p>
            </Card>
          )}

          {/* Discovery Progress */}
          {isDiscovering && !connectionSuccess && (
            <Card className="p-6 text-center bg-[var(--k1-bg)] border-[var(--k1-border)]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--k1-accent)] mb-3" />
              <p className="text-[var(--k1-text-dim)]">
                Discovering devices (mDNS + network scan)...
              </p>
              <p className="text-xs text-[var(--k1-text-dim)] mt-2">This may take a few seconds</p>
            </Card>
          )}

          {/* Discovery Error */}
          {discoveryError && !connectionSuccess && (
            <Card className="p-4 bg-red-900/20 border-red-600/30">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-300">{discoveryError}</p>
                  <p className="text-sm text-red-200 mt-1">
                    Enter your device IP below to continue
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Connection Error */}
          {connectionError && !connectionSuccess && (
            <Card className="p-4 bg-red-900/20 border-red-600/30">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-300">Connection Failed</p>
                  <p className="text-sm text-red-200 mt-1">{connectionError}</p>
                  <p className="text-xs text-red-200 mt-2">
                    💡 Make sure your K1 device is powered on and on the same network
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Discovered Devices List */}
          {!isDiscovering && discoveredDevices.length > 0 && !showManualEntry && !connectionSuccess && (
            <div className="space-y-2">
              <Label className="text-[var(--k1-text-dim)]">Available Devices ({discoveredDevices.length} found)</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {discoveredDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    disabled={isConnecting}
                    className={`w-full p-3 rounded-lg border-2 transition-colors text-left disabled:opacity-50 ${
                      selectedDevice?.id === device.id
                        ? 'bg-[var(--k1-accent)]/20 border-[var(--k1-accent)]'
                        : 'bg-[var(--k1-bg)] border-[var(--k1-border)] hover:border-[var(--k1-accent)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--k1-text)]">{device.name}</p>
                        <p className="text-sm text-[var(--k1-text-dim)]">
                          {device.ip}:{device.port}
                        </p>
                        {autoDiscovery.autoConnectSuggestion && 
                         (device.ip === autoDiscovery.autoConnectSuggestion.ip || 
                          device.mac === autoDiscovery.autoConnectSuggestion.mac) && (
                          <p className="text-xs text-[var(--k1-accent)] mt-1">
                            ⭐ Previously connected
                          </p>
                        )}
                      </div>
                      {selectedDevice?.id === device.id && (
                        <Check className="w-5 h-5 text-[var(--k1-accent)]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Entry Toggle */}
          {!isDiscovering && discoveredDevices.length > 0 && !showManualEntry && !connectionSuccess && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualEntry(true)}
                disabled={isConnecting}
                className="flex-1"
              >
                Enter IP Manually
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryDiscovery}
                disabled={isConnecting}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Discovery
              </Button>
            </div>
          )}

          {/* Manual IP Entry */}
          {(showManualEntry || (discoveredDevices.length === 0 && !isDiscovering)) && !connectionSuccess && (
            <form onSubmit={handleManualConnect} className="space-y-3">
              <div>
                <Label htmlFor="manual-ip" className="text-[var(--k1-text-dim)]">
                  Device IP Address or Hostname
                </Label>
                <Input
                  id="manual-ip"
                  type="text"
                  placeholder="k1-reinvented.local or 192.168.1.103"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  disabled={isConnecting}
                  className="mt-1.5"
                />
                <p className="text-xs text-[var(--k1-text-dim)] mt-1">
                  💡 Try "k1-reinvented.local" first, or check your router for the device IP
                </p>
              </div>

              <div>
                <Label htmlFor="manual-port" className="text-[var(--k1-text-dim)]">
                  Port (optional)
                </Label>
                <Input
                  id="manual-port"
                  type="text"
                  placeholder="80"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  disabled={isConnecting}
                  className="mt-1.5"
                />
              </div>

              <Button
                type="submit"
                disabled={isConnecting || !manualIp.trim()}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting to {manualIp}...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect to Device
                  </>
                )}
              </Button>

              {showManualEntry && discoveredDevices.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowManualEntry(false)}
                  disabled={isConnecting}
                  className="w-full"
                >
                  ← Back to Discovered Devices
                </Button>
              )}
            </form>
          )}

          {/* Selected Device Connection */}
          {selectedDevice && !showManualEntry && discoveredDevices.length > 0 && !connectionSuccess && (
            <Button
              onClick={() => handleConnectToDevice(selectedDevice)}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to {selectedDevice.name}...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Connect to {selectedDevice.name}
                </>
              )}
            </Button>
          )}

          {/* Tips */}
          <div className="rounded-lg bg-blue-900/20 border border-blue-600/30 p-3">
            <p className="text-sm text-blue-300">
              💡 <strong>Tip:</strong> Make sure your K1 device is powered on and connected to the same WiFi network.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
