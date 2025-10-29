/**
 * Auto-discovery hook for K1 devices
 */

import { useState, useEffect } from 'react';
import { K1DiscoveredDevice } from '../types/k1-types';
import { useDeviceDiscovery } from '../services/discovery-service';
import { useErrorHandler } from './useErrorHandler';

interface AutoDiscoveryState {
  isAutoDiscovering: boolean;
  discoveredDevices: K1DiscoveredDevice[];
  lastDiscovery: Date | null;
  autoConnectSuggestion: K1DiscoveredDevice | null;
}

export function useAutoDiscovery() {
  const [state, setState] = useState<AutoDiscoveryState>({
    isAutoDiscovering: false,
    discoveredDevices: [],
    lastDiscovery: null,
    autoConnectSuggestion: null
  });
  
  const discovery = useDeviceDiscovery();
  const { showError } = useErrorHandler();
  
  // Auto-discover on mount
  useEffect(() => {
    runAutoDiscovery();
  }, []);
  
  const runAutoDiscovery = async () => {
    setState(prev => ({ ...prev, isAutoDiscovering: true }));
    
    try {
      console.log('[AutoDiscovery] Starting automatic device discovery...');
      
      const result = await discovery.discoverDevices({ 
        timeout: 3000,
        preferredMethods: ['mdns', 'scan'] 
      });
      
      console.log(`[AutoDiscovery] Found ${result.devices.length} devices`);
      
      setState(prev => ({
        ...prev,
        discoveredDevices: result.devices,
        lastDiscovery: new Date()
      }));
      
      // Check for auto-connect suggestion
      const lastDevice = getLastConnectedDevice();
      if (lastDevice && result.devices.length > 0) {
        const matchingDevice = result.devices.find(d => 
          d.ip === lastDevice.ip || d.mac === lastDevice.mac
        );
        
        if (matchingDevice) {
          setState(prev => ({
            ...prev,
            autoConnectSuggestion: matchingDevice
          }));
          
          console.log('[AutoDiscovery] Found previously connected device:', matchingDevice.name);
        }
      }
      
    } catch (error) {
      console.warn('[AutoDiscovery] Auto-discovery failed:', error);
      showError(error, { context: 'auto-discovery' });
    } finally {
      setState(prev => ({ ...prev, isAutoDiscovering: false }));
    }
  };
  
  const dismissAutoConnectSuggestion = () => {
    setState(prev => ({ ...prev, autoConnectSuggestion: null }));
  };
  
  const refreshDiscovery = () => {
    runAutoDiscovery();
  };
  
  return {
    ...state,
    refreshDiscovery,
    dismissAutoConnectSuggestion
  };
}

/**
 * Get last connected device from localStorage
 */
function getLastConnectedDevice(): { ip: string; mac?: string } | null {
  try {
    const stored = localStorage.getItem('k1.lastConnectedDevice');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save last connected device to localStorage
 */
export function saveLastConnectedDevice(device: K1DiscoveredDevice) {
  try {
    localStorage.setItem('k1.lastConnectedDevice', JSON.stringify({
      ip: device.ip,
      mac: device.mac,
      name: device.name
    }));
  } catch (error) {
    console.warn('Failed to save last connected device:', error);
  }
}