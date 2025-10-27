/**
 * Device Discovery Modal
 * Implements Phase 1 Week 1: Auto-discovery modal on first launch
 * Addresses critical blocker: 40% bounce rate due to missing device discovery UI
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Wifi, RefreshCw, AlertCircle, Check } from 'lucide-react';
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

interface DeviceDiscoveryModalProps {
  isOpen: boolean;
  isConnected: boolean;
  onDiscoveryComplete: (device: K1DiscoveredDevice) => Promise<void>;
}

/**
 * Modal that guides users through device discovery and connection
 * - Auto-discovers devices on mount (mDNS + network scan)
 * - Shows discovered devices with one-click connect
 * - Fallback to manual IP entry
 * - Auto-suggests previously connected device
 */
export function DeviceDiscoveryModal({
  isOpen,
  isConnected,
  onDiscoveryComplete,
}: DeviceDiscoveryModalProps) {
  const discovery = useDeviceDiscovery();
  const autoDiscovery = useAutoDiscovery();

  const [discoveredDevices, setDiscoveredDevices] = useState<K1DiscoveredDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<K1DiscoveredDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('80');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-discover on mount
  useEffect(() => {
    if (isOpen && !isConnected) {
      runDiscovery();
    }
  }, [isOpen, isConnected]);

  const runDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);

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

    try {
      console.log('[DeviceDiscoveryModal] Connecting to device:', device.name);

      // Save as last connected device
      saveLastConnectedDevice(device);

      // Call parent's connection handler
      await onDiscoveryComplete(device);

      console.log('[DeviceDiscoveryModal] Successfully connected to device');
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
    runDiscovery();
  };

  return (
    <Dialog open={isOpen && !isConnected} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--k1-text)] flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[var(--k1-accent)]" />
            Connect to K1 Device
          </DialogTitle>
          <DialogDescription className="text-[var(--k1-text-dim)]">
            {isDiscovering
              ? 'Searching for K1 devices on your network...'
              : discoveredDevices.length > 0
                ? 'Select a device to connect or enter IP manually'
                : 'No devices found. Enter your device IP address below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discovery Progress */}
          {isDiscovering && (
            <Card className="p-6 text-center bg-[var(--k1-bg)] border-[var(--k1-border)]">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--k1-accent)] mb-3" />
              <p className="text-[var(--k1-text-dim)]">
                Discovering devices (mDNS + network scan)...
              </p>
              <p className="text-xs text-[var(--k1-text-dim)] mt-2">This may take a few seconds</p>
            </Card>
          )}

          {/* Discovery Error */}
          {discoveryError && (
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

          {/* Discovered Devices List */}
          {!isDiscovering && discoveredDevices.length > 0 && !showManualEntry && (
            <div className="space-y-2">
              <Label className="text-[var(--k1-text-dim)]">Available Devices</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {discoveredDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
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
          {!isDiscovering && discoveredDevices.length > 0 && !showManualEntry && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualEntry(true)}
                className="flex-1"
              >
                Enter IP Manually
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryDiscovery}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Discovery
              </Button>
            </div>
          )}

          {/* Manual IP Entry */}
          {(showManualEntry || (discoveredDevices.length === 0 && !isDiscovering)) && (
            <form onSubmit={handleManualConnect} className="space-y-3">
              <div>
                <Label htmlFor="manual-ip" className="text-[var(--k1-text-dim)]">
                  Device IP Address
                </Label>
                <Input
                  id="manual-ip"
                  type="text"
                  placeholder="192.168.1.100"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  disabled={isConnecting}
                  className="mt-1.5"
                />
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

              {connectionError && (
                <Card className="p-3 bg-red-900/20 border-red-600/30">
                  <p className="text-sm text-red-300">{connectionError}</p>
                </Card>
              )}

              <Button
                type="submit"
                disabled={isConnecting || !manualIp.trim()}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to Device'
                )}
              </Button>
            </form>
          )}

          {/* Selected Device Connection */}
          {selectedDevice && !showManualEntry && discoveredDevices.length > 0 && (
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
