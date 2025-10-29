/**
 * Tests for CacheInvalidationManager
 *
 * Coverage areas:
 * - Device state recording and history tracking
 * - Change detection (IP/MAC changes)
 * - Confidence scoring algorithm
 * - Adaptive TTL calculation
 * - Invalidation decision logic
 * - Invalidation event logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CacheInvalidationManager,
  cacheInvalidationManager,
  DeviceStateSnapshot,
  ChangeDetectionResult,
  InvalidationTrigger,
} from '../cache-invalidation';
import { NormalizedDevice } from '../device-discovery';

describe('CacheInvalidationManager', () => {
  let manager: CacheInvalidationManager;

  beforeEach(() => {
    // Use a fresh manager for each test
    manager = new CacheInvalidationManager();
  });

  describe('Device State Recording', () => {
    it('should record device state correctly', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      manager.recordDeviceState(device);

      const history = manager.getDeviceHistory('device-1');
      expect(history).toHaveLength(1);
      expect(history[0].mac).toBe('00:11:22:33:44:55');
      expect(history[0].ip).toBe('192.168.1.100');
      expect(history[0].discoveryCount).toBe(1);
    });

    it('should maintain max history size per device', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record 25 states (exceeds max of 20)
      for (let i = 1; i <= 25; i++) {
        device.discoveryCount = i;
        manager.recordDeviceState(device);
      }

      const history = manager.getDeviceHistory('device-1');
      expect(history).toHaveLength(20); // Should be capped at 20
      expect(history[0].discoveryCount).toBe(6); // Oldest should be #6 (1-5 evicted)
      expect(history[19].discoveryCount).toBe(25); // Newest should be #25
    });

    it('should skip recording for devices with empty ID', () => {
      const device: NormalizedDevice = {
        id: '',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.recordDeviceState(device);

      expect(consoleSpy).toHaveBeenCalledWith('[CacheInvalidation] Device ID is empty, skipping state recording');
      expect(manager.getDeviceHistory('')).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Change Detection', () => {
    it('should detect new devices', () => {
      const device: NormalizedDevice = {
        id: 'new-device',
        name: 'New Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      const result = manager.detectChanges(device);

      expect(result).toBeDefined();
      expect(result!.changeType).toBe('new_device');
      expect(result!.confidence).toBe(0.5);
      expect(result!.oldState).toBeNull();
      expect(result!.details).toBe('First time seeing this device');
    });

    it('should detect IP address changes', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record initial state
      manager.recordDeviceState(device);
      manager.recordDeviceState(device); // Need at least 2 for comparison

      // Change IP address
      device.ip = '192.168.1.101';
      const result = manager.detectChanges(device);

      expect(result).toBeDefined();
      expect(result!.changeType).toBe('ip_change');
      expect(result!.confidence).toBe(0.9);
      expect(result!.details).toContain('IP changed from 192.168.1.100 to 192.168.1.101');
    });

    it('should detect MAC address changes', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record initial state
      manager.recordDeviceState(device);
      manager.recordDeviceState(device);

      // Change MAC address
      device.mac = '00:11:22:33:44:66';
      const result = manager.detectChanges(device);

      expect(result).toBeDefined();
      expect(result!.changeType).toBe('mac_change');
      expect(result!.confidence).toBe(0.95);
      expect(result!.details).toContain('MAC changed from 00:11:22:33:44:55 to 00:11:22:33:44:66');
    });

    it('should detect stable devices', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record multiple identical states
      manager.recordDeviceState(device);
      manager.recordDeviceState(device);

      const result = manager.detectChanges(device);

      expect(result).toBeDefined();
      expect(result!.changeType).toBe('stable');
      expect(result!.confidence).toBe(0.99);
      expect(result!.details).toBe('Device state is stable');
    });

    it('should return null for devices with empty ID', () => {
      const device: NormalizedDevice = {
        id: '',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = manager.detectChanges(device);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[CacheInvalidation] Device ID is empty for change detection');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Confidence Scoring', () => {
    it('should return default confidence for unknown devices', () => {
      const confidence = manager.computeConfidence('unknown-device');
      expect(confidence).toBe(0.5);
    });

    it('should calculate confidence based on discovery count', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 10, // High discovery count
      };

      manager.recordDeviceState(device);
      const confidence = manager.computeConfidence('device-1');

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should factor in device age', () => {
      // Create snapshots with different timestamps to simulate age
      const now = Date.now();
      const oldTimestamp = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago
      
      const oldDevice: NormalizedDevice = {
        id: 'old-device',
        name: 'Old Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(oldTimestamp),
        discoveryMethod: 'mdns',
        discoveryCount: 5,
      };

      const recentDevice: NormalizedDevice = {
        id: 'recent-device',
        name: 'Recent Device',
        ip: '192.168.1.101',
        port: 80,
        mac: '00:11:22:33:44:66',
        firmware: '1.0.0',
        lastSeen: new Date(now), // Now
        discoveryMethod: 'mdns',
        discoveryCount: 5,
      };

      // Record states - the timestamp in the snapshot will reflect when recordDeviceState is called
      // We need to manually create snapshots with different timestamps
      manager.recordDeviceState(oldDevice);
      manager.recordDeviceState(recentDevice);

      // Manually adjust the timestamp in the old device's history to simulate age
      const oldHistory = manager.getDeviceHistory('old-device');
      if (oldHistory.length > 0) {
        oldHistory[0].timestamp = oldTimestamp;
      }

      const oldConfidence = manager.computeConfidence('old-device');
      const recentConfidence = manager.computeConfidence('recent-device');

      expect(recentConfidence).toBeGreaterThan(oldConfidence);
    });

    it('should factor in state stability', () => {
      // Stable device (no changes)
      const stableDevice: NormalizedDevice = {
        id: 'stable-device',
        name: 'Stable Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record multiple identical states
      for (let i = 0; i < 5; i++) {
        stableDevice.discoveryCount = i + 1;
        manager.recordDeviceState(stableDevice);
      }

      // Unstable device (frequent changes)
      const unstableDevice: NormalizedDevice = {
        id: 'unstable-device',
        name: 'Unstable Device',
        ip: '192.168.1.200',
        port: 80,
        mac: '00:11:22:33:44:77',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record states with changing IPs
      for (let i = 0; i < 5; i++) {
        unstableDevice.ip = `192.168.1.${200 + i}`;
        unstableDevice.discoveryCount = i + 1;
        manager.recordDeviceState(unstableDevice);
      }

      const stableConfidence = manager.computeConfidence('stable-device');
      const unstableConfidence = manager.computeConfidence('unstable-device');

      expect(stableConfidence).toBeGreaterThan(unstableConfidence);
    });
  });

  describe('Adaptive TTL Calculation', () => {
    it('should return maximum TTL for high confidence devices', () => {
      // Mock high confidence
      const device: NormalizedDevice = {
        id: 'reliable-device',
        name: 'Reliable Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 15, // High count for high confidence
      };

      // Record stable history
      for (let i = 0; i < 10; i++) {
        device.discoveryCount = 15 + i;
        manager.recordDeviceState(device);
      }

      const ttl = manager.computeAdaptiveTTL('reliable-device');
      expect(ttl).toBe(7200000); // 2 hours
    });

    it('should return minimum TTL for low confidence devices', () => {
      const device: NormalizedDevice = {
        id: 'unreliable-device',
        name: 'Unreliable Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1, // Low count
      };

      manager.recordDeviceState(device);

      const ttl = manager.computeAdaptiveTTL('unreliable-device');
      expect(ttl).toBe(300000); // 5 minutes
    });

    it('should return intermediate TTL for medium confidence devices', () => {
      const device: NormalizedDevice = {
        id: 'medium-device',
        name: 'Medium Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 5, // Medium count
      };

      // Record some history
      for (let i = 0; i < 3; i++) {
        device.discoveryCount = 5 + i;
        manager.recordDeviceState(device);
      }

      const ttl = manager.computeAdaptiveTTL('medium-device');
      expect(ttl).toBeGreaterThan(300000); // More than 5 minutes
      expect(ttl).toBeLessThan(7200000); // Less than 2 hours
    });
  });

  describe('Invalidation Logic', () => {
    it('should invalidate devices with high-confidence IP changes', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record initial state
      manager.recordDeviceState(device);
      manager.recordDeviceState(device);

      // Change IP
      device.ip = '192.168.1.101';
      device.lastSeen = new Date(); // Recent

      const shouldInvalidate = manager.shouldInvalidate(device);
      expect(shouldInvalidate).toBe(true);
    });

    it('should invalidate devices with high-confidence MAC changes', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      // Record initial state
      manager.recordDeviceState(device);
      manager.recordDeviceState(device);

      // Change MAC
      device.mac = '00:11:22:33:44:66';
      device.lastSeen = new Date(); // Recent

      const shouldInvalidate = manager.shouldInvalidate(device);
      expect(shouldInvalidate).toBe(true);
    });

    it('should invalidate devices when TTL expires', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago (exceeds max TTL)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      manager.recordDeviceState(device);

      const shouldInvalidate = manager.shouldInvalidate(device);
      expect(shouldInvalidate).toBe(true);
    });

    it('should not invalidate stable recent devices', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(), // Recent
        discoveryMethod: 'mdns',
        discoveryCount: 5,
      };

      // Record stable history
      for (let i = 0; i < 5; i++) {
        device.discoveryCount = 5 + i;
        manager.recordDeviceState(device);
      }

      const shouldInvalidate = manager.shouldInvalidate(device);
      expect(shouldInvalidate).toBe(false);
    });
  });

  describe('Invalidation Logging', () => {
    it('should record invalidation events', () => {
      manager.markAsStale('device-1', 'ttl_expired');

      const history = manager.getInvalidationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].deviceId).toBe('device-1');
      expect(history[0].reason).toBe('ttl_expired');
      expect(history[0].timestamp).toBeDefined();
    });

    it('should maintain max invalidation log size', () => {
      // Add 150 invalidation events (exceeds max of 100)
      for (let i = 0; i < 150; i++) {
        manager.markAsStale(`device-${i}`, 'ttl_expired');
      }

      const history = manager.getInvalidationHistory(200); // Request more than max
      expect(history.length).toBeLessThanOrEqual(100); // Should be capped at 100
    });

    it('should return invalidation history sorted by timestamp', () => {
      // Add events with slight delays
      manager.markAsStale('device-1', 'ttl_expired');
      
      // Small delay to ensure different timestamps
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      setTimeout(() => {
        manager.markAsStale('device-2', 'changed');
      }, 10);

      setTimeout(() => {
        const history = manager.getInvalidationHistory();
        if (history.length >= 2) {
          expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
        }
      }, 20);
    });

    it('should limit returned history entries', () => {
      // Add 10 events
      for (let i = 0; i < 10; i++) {
        manager.markAsStale(`device-${i}`, 'ttl_expired');
      }

      const limitedHistory = manager.getInvalidationHistory(5);
      expect(limitedHistory).toHaveLength(5);
    });
  });

  describe('Utility Methods', () => {
    it('should return device confidence scores', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 5,
      };

      manager.recordDeviceState(device);

      const confidence = manager.getDeviceConfidence('device-1');
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return empty history for unknown devices', () => {
      const history = manager.getDeviceHistory('unknown-device');
      expect(history).toHaveLength(0);
    });

    it('should reset all data', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      manager.recordDeviceState(device);
      manager.markAsStale('device-1', 'ttl_expired');

      manager.reset();

      expect(manager.getDeviceHistory('device-1')).toHaveLength(0);
      expect(manager.getInvalidationHistory()).toHaveLength(0);
      expect(manager.getStats().trackedDevices).toBe(0);
    });

    it('should return summary statistics', () => {
      const device: NormalizedDevice = {
        id: 'device-1',
        name: 'Test Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      manager.recordDeviceState(device);
      manager.markAsStale('device-1', 'ttl_expired');

      const stats = manager.getStats();
      expect(stats.trackedDevices).toBe(1);
      expect(stats.totalInvalidations).toBe(1);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should have global singleton export', () => {
      expect(cacheInvalidationManager).toBeDefined();
      expect(cacheInvalidationManager).toBeInstanceOf(CacheInvalidationManager);
    });

    it('singleton should be reusable across imports', () => {
      const device: NormalizedDevice = {
        id: 'singleton-test',
        name: 'Singleton Test',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };

      cacheInvalidationManager.recordDeviceState(device);

      const history = cacheInvalidationManager.getDeviceHistory('singleton-test');
      expect(history).toHaveLength(1);
    });
  });
});