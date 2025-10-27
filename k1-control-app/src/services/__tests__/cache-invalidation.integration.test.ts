/**
 * Integration tests for Smart Cache Invalidation with Device Discovery
 *
 * Tests the complete integration between:
 * - DeviceDiscoveryAbstraction
 * - CacheInvalidationManager
 * - Adaptive TTL and state tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceDiscoveryAbstraction } from '../device-discovery';
import { cacheInvalidationManager } from '../cache-invalidation';

describe('Cache Invalidation Integration Tests', () => {
  let discovery: DeviceDiscoveryAbstraction;

  beforeEach(() => {
    // Reset both systems before each test
    cacheInvalidationManager.reset();
    discovery = new DeviceDiscoveryAbstraction();
  });

  describe('Device State Recording During Discovery', () => {
    it('should record device states during discovery operations', async () => {
      // Verify no devices tracked initially
      expect(cacheInvalidationManager.getStats().trackedDevices).toBe(0);

      // Perform discovery
      const result = await discovery.discover({ timeout: 1000 });
      expect(result.devices.length).toBeGreaterThan(0);

      // Verify device states were recorded
      const stats = cacheInvalidationManager.getStats();
      expect(stats.trackedDevices).toBe(result.devices.length);

      // Check that each discovered device has history
      result.devices.forEach(device => {
        const history = cacheInvalidationManager.getDeviceHistory(device.id);
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].ip).toBe(device.ip);
        expect(history[0].mac).toBe(device.mac);
      });
    });

    it('should build device confidence over multiple discoveries', async () => {
      // First discovery
      const result1 = await discovery.discover({ timeout: 1000 });
      expect(result1.devices.length).toBeGreaterThan(0);

      const deviceId = result1.devices[0].id;
      const initialConfidence = cacheInvalidationManager.getDeviceConfidence(deviceId);

      // Second discovery (should increase confidence)
      const result2 = await discovery.discover({ timeout: 1000 });
      const updatedConfidence = cacheInvalidationManager.getDeviceConfidence(deviceId);

      expect(updatedConfidence).toBeGreaterThanOrEqual(initialConfidence);

      // Verify history grew
      const history = cacheInvalidationManager.getDeviceHistory(deviceId);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Adaptive TTL in Cache Eviction', () => {
    it('should use adaptive TTL instead of fixed TTL for cache eviction', async () => {
      // Perform discovery to populate cache
      const result = await discovery.discover({ timeout: 1000 });
      expect(result.devices.length).toBeGreaterThan(0);

      const deviceId = result.devices[0].id;
      
      // Get adaptive TTL for the device
      const adaptiveTTL = cacheInvalidationManager.computeAdaptiveTTL(deviceId);
      expect(adaptiveTTL).toBeGreaterThan(0);
      expect(adaptiveTTL).toBeLessThanOrEqual(7200000); // Max 2 hours

      // For new devices, should be minimum TTL (5 minutes)
      expect(adaptiveTTL).toBe(300000);
    });

    it('should increase TTL for devices with higher confidence', async () => {
      // Create a device with high discovery count to simulate reliability
      const mockDevice = {
        id: 'reliable-device',
        name: 'Reliable Device',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns' as const,
        discoveryCount: 1,
      };

      // Record multiple stable states to build confidence
      for (let i = 0; i < 10; i++) {
        mockDevice.discoveryCount = i + 10; // High discovery count
        cacheInvalidationManager.recordDeviceState(mockDevice);
      }

      const highConfidenceTTL = cacheInvalidationManager.computeAdaptiveTTL('reliable-device');
      const lowConfidenceTTL = cacheInvalidationManager.computeAdaptiveTTL('unknown-device');

      expect(highConfidenceTTL).toBeGreaterThan(lowConfidenceTTL);
    });
  });

  describe('Smart Invalidation Logic', () => {
    it('should invalidate devices when IP changes are detected', async () => {
      // First discovery
      await discovery.discover({ timeout: 1000 });
      
      // Get cached devices
      const cachedDevices = discovery.getCachedDevices();
      expect(cachedDevices.length).toBeGreaterThan(0);

      const testDevice = cachedDevices[0];
      
      // Record initial state multiple times to establish baseline
      cacheInvalidationManager.recordDeviceState(testDevice);
      cacheInvalidationManager.recordDeviceState(testDevice);

      // Simulate IP change
      const changedDevice = { ...testDevice, ip: '192.168.1.999' };
      
      // Check if device should be invalidated
      const shouldInvalidate = cacheInvalidationManager.shouldInvalidate(changedDevice);
      expect(shouldInvalidate).toBe(true);
    });

    it('should not invalidate stable devices within TTL', async () => {
      // Perform discovery
      await discovery.discover({ timeout: 1000 });
      
      const cachedDevices = discovery.getCachedDevices();
      expect(cachedDevices.length).toBeGreaterThan(0);

      const stableDevice = cachedDevices[0];
      
      // Record stable states
      for (let i = 0; i < 5; i++) {
        stableDevice.discoveryCount = i + 5;
        cacheInvalidationManager.recordDeviceState(stableDevice);
      }

      // Device should not be invalidated (stable and recent)
      const shouldInvalidate = cacheInvalidationManager.shouldInvalidate(stableDevice);
      expect(shouldInvalidate).toBe(false);
    });
  });

  describe('Invalidation Event Logging', () => {
    it('should log invalidation events during cache eviction', async () => {
      // Perform discovery
      await discovery.discover({ timeout: 1000 });
      
      const cachedDevices = discovery.getCachedDevices();
      expect(cachedDevices.length).toBeGreaterThan(0);

      // Manually trigger invalidation
      const deviceId = cachedDevices[0].id;
      cacheInvalidationManager.markAsStale(deviceId, 'ttl_expired');

      // Verify event was logged
      const history = cacheInvalidationManager.getInvalidationHistory();
      expect(history.length).toBe(1);
      expect(history[0].deviceId).toBe(deviceId);
      expect(history[0].reason).toBe('ttl_expired');
    });

    it('should track invalidation statistics', async () => {
      // Perform discovery
      await discovery.discover({ timeout: 1000 });
      
      // Get initial stats
      const initialStats = cacheInvalidationManager.getStats();
      expect(initialStats.trackedDevices).toBeGreaterThan(0);
      expect(initialStats.totalInvalidations).toBe(0);

      // Trigger some invalidations
      const cachedDevices = discovery.getCachedDevices();
      cachedDevices.slice(0, 2).forEach(device => {
        cacheInvalidationManager.markAsStale(device.id, 'changed');
      });

      // Verify stats updated
      const updatedStats = cacheInvalidationManager.getStats();
      expect(updatedStats.totalInvalidations).toBe(2);
      expect(updatedStats.avgConfidence).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should maintain reasonable memory usage with history limits', async () => {
      // Perform multiple discoveries to build up history
      for (let i = 0; i < 3; i++) {
        await discovery.discover({ timeout: 500 });
      }

      const stats = cacheInvalidationManager.getStats();
      expect(stats.trackedDevices).toBeGreaterThan(0);

      // Check that device histories are capped
      const cachedDevices = discovery.getCachedDevices();
      cachedDevices.forEach(device => {
        const history = cacheInvalidationManager.getDeviceHistory(device.id);
        expect(history.length).toBeLessThanOrEqual(20); // Max history per device
      });
    });

    it('should cap invalidation log size', async () => {
      // Generate many invalidation events
      for (let i = 0; i < 150; i++) {
        cacheInvalidationManager.markAsStale(`device-${i}`, 'ttl_expired');
      }

      const history = cacheInvalidationManager.getInvalidationHistory(200);
      expect(history.length).toBeLessThanOrEqual(100); // Max log size
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle complete device lifecycle: discovery -> confidence building -> invalidation', async () => {
      // 1. Initial discovery
      const result1 = await discovery.discover({ timeout: 500 });
      expect(result1.devices.length).toBeGreaterThan(0);

      const deviceId = result1.devices[0].id;
      const initialConfidence = cacheInvalidationManager.getDeviceConfidence(deviceId);
      expect(initialConfidence).toBeGreaterThan(0);

      // 2. Multiple discoveries to build confidence
      for (let i = 0; i < 2; i++) {
        await discovery.discover({ timeout: 500 });
      }

      const builtConfidence = cacheInvalidationManager.getDeviceConfidence(deviceId);
      expect(builtConfidence).toBeGreaterThanOrEqual(initialConfidence);

      // 3. Verify adaptive TTL increased with confidence
      const adaptiveTTL = cacheInvalidationManager.computeAdaptiveTTL(deviceId);
      expect(adaptiveTTL).toBeGreaterThan(300000); // Should be more than minimum

      // 4. Device should not be invalidated (stable and confident)
      const cachedDevice = discovery.getCachedDevices().find(d => d.id === deviceId);
      expect(cachedDevice).toBeDefined();
      
      const shouldInvalidate = cacheInvalidationManager.shouldInvalidate(cachedDevice!);
      expect(shouldInvalidate).toBe(false);

      // 5. Verify complete integration
      const stats = cacheInvalidationManager.getStats();
      expect(stats.trackedDevices).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(initialConfidence);
    });

    it('should handle device state changes and recovery', async () => {
      // Initial discovery
      await discovery.discover({ timeout: 1000 });
      
      const cachedDevices = discovery.getCachedDevices();
      expect(cachedDevices.length).toBeGreaterThan(0);

      const testDevice = { ...cachedDevices[0] };
      
      // Build baseline
      cacheInvalidationManager.recordDeviceState(testDevice);
      cacheInvalidationManager.recordDeviceState(testDevice);

      // Simulate IP change
      testDevice.ip = '192.168.1.999';
      const changeResult = cacheInvalidationManager.detectChanges(testDevice);
      
      expect(changeResult).toBeDefined();
      expect(changeResult!.changeType).toBe('ip_change');
      expect(changeResult!.confidence).toBeGreaterThan(0.8);

      // Device should be marked for invalidation
      const shouldInvalidate = cacheInvalidationManager.shouldInvalidate(testDevice);
      expect(shouldInvalidate).toBe(true);

      // Record the change
      cacheInvalidationManager.recordDeviceState(testDevice);

      // After recording the change, confidence might be affected
      const newConfidence = cacheInvalidationManager.getDeviceConfidence(testDevice.id);
      expect(newConfidence).toBeGreaterThan(0);
    });
  });
});