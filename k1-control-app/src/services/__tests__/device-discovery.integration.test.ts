/**
 * Device Discovery Integration Tests
 *
 * Tests full discovery flow with:
 * - K1Client.discover (primary method)
 * - K1DiscoveryService (fallback)
 * - Error handling
 * - Cancellation
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeviceDiscoveryAbstraction } from '../device-discovery';
import { K1Client } from '../../api/k1-client';
import { K1DiscoveryService } from '../discovery-service';

describe('Device Discovery Integration Tests', () => {
  let discovery: DeviceDiscoveryAbstraction;

  beforeEach(() => {
    discovery = new DeviceDiscoveryAbstraction();
    discovery.setDebounceDelay(50);
    vi.clearAllMocks();
  });

  afterEach(() => {
    discovery.clearCache();
  });

  // ============================================================================
  // SUCCESS PATH: K1Client.discover
  // ============================================================================

  describe('Primary Path: K1Client.discover', () => {
    it('should use K1Client.discover as primary discovery method', async () => {
      const mockDevices = [
        {
          id: 'k1-001',
          name: 'K1.reinvented',
          ip: '192.168.1.100',
          port: 80,
          mac: '00:11:22:33:44:55',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
          rssi: -45,
        },
      ];

      const discoverSpy = vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const result = await discovery.discover();

      expect(discoverSpy).toHaveBeenCalled();
      expect(result.method).toBe('mdns');
      expect(result.devices.length).toBe(1);
      expect(result.devices[0].id).toBe('00:11:22:33:44:55'); // MAC-based ID
      expect(result.hasErrors).toBe(false);
    });

    it('should normalize K1Client results correctly', async () => {
      const mockDevices = [
        {
          id: '192.168.1.100',
          name: 'K1 Device',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:FF',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
          rssi: -50,
        },
      ];

      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const result = await discovery.discover();

      const device = result.devices[0];
      expect(device.id).toBe('AA:BB:CC:DD:EE:FF'); // Primary ID is MAC
      expect(device.alternateId).toBe('192.168.1.100'); // Alternate ID is IP
      expect(device.discoveryCount).toBe(1);
      expect(device.discoveryMethod).toBe('mdns');
    });

    it('should handle multiple devices from K1Client', async () => {
      const mockDevices = Array.from({ length: 5 }, (_, i) => ({
        id: `192.168.1.${100 + i}`,
        name: `K1 Device ${i}`,
        ip: `192.168.1.${100 + i}`,
        port: 80,
        mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`,
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns' as const,
        rssi: -50,
      }));

      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const result = await discovery.discover();

      expect(result.devices.length).toBe(5);
      result.devices.forEach((device, i) => {
        expect(device.id).toBe(`AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`);
      });
    });
  });

  // ============================================================================
  // FALLBACK PATH: K1DiscoveryService
  // ============================================================================

  describe('Fallback Path: K1DiscoveryService', () => {
    it('should fallback to K1DiscoveryService if K1Client fails', async () => {
      vi.spyOn(K1Client, 'discover').mockRejectedValue(new Error('K1Client unavailable'));

      const mockServiceResult = {
        devices: [
          {
            id: 'k1-scan',
            name: 'K1.scan',
            ip: '192.168.1.200',
            port: 80,
            mac: '00:11:22:33:44:77',
            firmware: '1.0.0',
            lastSeen: new Date(),
            discoveryMethod: 'scan' as const,
          },
        ],
        method: 'scan' as const,
        duration: 100,
      };

      vi.spyOn(K1DiscoveryService.prototype, 'discoverDevices').mockResolvedValue(
        mockServiceResult
      );

      const result = await discovery.discover();

      expect(result.method).toBe('scan');
      expect(result.devices.length).toBe(1);
      expect(result.devices[0].id).toBe('00:11:22:33:44:77');
      expect(result.hasErrors).toBe(true); // K1Client error recorded
      // Check that some error was recorded
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.some(e => e.includes('failed') || e.includes('unavailable'))).toBe(true);
    });

    it('should not call K1DiscoveryService if K1Client succeeds', async () => {
      const mockDevices = [
        {
          id: 'k1-mdns',
          name: 'K1.mdns',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:01',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const serviceSpy = vi.spyOn(K1DiscoveryService.prototype, 'discoverDevices');

      const result = await discovery.discover();

      expect(result.method).toBe('mdns');
      // Service should NOT have been called
      expect(serviceSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR SCENARIOS
  // ============================================================================

  describe('Error Handling', () => {
    it('should return errors if both K1Client and K1DiscoveryService fail', async () => {
      vi.spyOn(K1Client, 'discover').mockRejectedValue(new Error('K1Client unavailable'));
      vi.spyOn(K1DiscoveryService.prototype, 'discoverDevices').mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await discovery.discover();

      expect(result.devices).toHaveLength(0);
      expect(result.hasErrors).toBe(true);
      expect(result.errors?.length).toBeGreaterThanOrEqual(1);
      // At least one error should mention failure
      expect(result.errors?.some(e => e.includes('failed') || e.includes('Network'))).toBe(true);
    });

    it('should handle K1Client timeout gracefully', async () => {
      vi.spyOn(K1Client, 'discover').mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 50)
        )
      );

      const mockServiceResult = {
        devices: [],
        method: 'scan' as const,
        duration: 50,
      };

      vi.spyOn(K1DiscoveryService.prototype, 'discoverDevices').mockResolvedValue(
        mockServiceResult
      );

      const result = await discovery.discover();

      expect(result.hasErrors).toBe(true);
      expect(result.method).toBe('scan'); // Fell back to service
    });

    it('should handle malformed device data', async () => {
      const malformedDevices = [
        {
          id: 'device-1',
          name: 'Malformed Device',
          ip: '192.168.1.100',
          port: 80,
          mac: '',  // Empty MAC
          firmware: '',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      vi.spyOn(K1Client, 'discover').mockResolvedValue(malformedDevices);

      const result = await discovery.discover();

      // Should still process (normalization handles empty MAC)
      expect(result.devices.length).toBe(1);
      // Without MAC, falls back to the provided ID (not IP)
      expect(result.devices[0].id).toBe('device-1');
      // Verify it's still a valid device object with IP
      expect(result.devices[0].ip).toBe('192.168.1.100');
    });
  });

  // ============================================================================
  // CANCELLATION
  // ============================================================================

  describe('Cancellation', () => {
    it('should clear pending resolvers when cancel() called before debounce fires', async () => {
      vi.spyOn(K1Client, 'discover').mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      discovery.setDebounceDelay(500); // Long debounce

      // Start a discovery
      discovery.discover();

      // Verify promise is queued
      expect(discovery['_pendingResolvers'].length).toBe(1);

      // Cancel before debounce fires
      discovery.cancel();

      // Queue should be cleared
      expect(discovery['_pendingResolvers'].length).toBe(0);
      expect(discovery.isDiscoveryInProgress()).toBe(false);
    });

    it('should resolve all pending promises with cancelled result when cancel() called', async () => {
      vi.spyOn(K1Client, 'discover').mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      discovery.setDebounceDelay(500);

      // Make multiple rapid calls
      const promises = Array.from({ length: 5 }, () => discovery.discover());

      // Cancel before debounce fires (so promises are still pending)
      discovery.cancel();

      const results = await Promise.all(promises);

      // All should be cancelled
      results.forEach(result => {
        expect(result.cancelled).toBe(true);
        expect(result.hasErrors).toBe(true);
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty device list from K1Client', async () => {
      vi.spyOn(K1Client, 'discover').mockResolvedValue([]);

      const result = await discovery.discover();

      expect(result.devices).toHaveLength(0);
      expect(result.hasErrors).toBe(false); // No error, just no devices
      expect(result.method).toBe('mdns');
    });

    it('should handle discovery during active discovery (concurrent guard)', async () => {
      const mockDevices = [
        {
          id: 'k1-001',
          name: 'K1 Device',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:FF',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      vi.spyOn(K1Client, 'discover').mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockDevices), 100))
      );

      // Use longer debounce so calls overlap
      discovery.setDebounceDelay(200);

      // First call starts discovery
      const promise1 = discovery.discover();

      // Wait for debounce to complete but before actual discovery finishes
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call during active discovery (after debounce fired but before discovery complete)
      const promise2 = discovery.discover();

      // Both should eventually resolve
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should get results (result2 gets result1's cached result since they use debouncing)
      expect(result1.devices.length).toBe(1);
      expect(result2.devices.length).toBe(1);
    });

    it('should maintain cache across multiple discoveries', async () => {
      const mockDevices1 = [
        {
          id: 'k1-001',
          name: 'K1 Device 1',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:01',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      const mockDevices2 = [
        {
          id: 'k1-001',
          name: 'K1 Device 1',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:01',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
        {
          id: 'k1-002',
          name: 'K1 Device 2',
          ip: '192.168.1.101',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:02',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      let callNum = 0;
      vi.spyOn(K1Client, 'discover').mockImplementation(async () => {
        callNum++;
        return callNum === 1 ? mockDevices1 : mockDevices2;
      });

      // First discovery
      const result1 = await discovery.discover();
      expect(result1.devices.length).toBe(1);
      expect(result1.devices[0].discoveryCount).toBe(1);

      // Second discovery
      const result2 = await discovery.discover();
      expect(result2.devices.length).toBe(2);

      // First device should have incremented count
      const device1 = result2.devices.find(d => d.mac === 'AA:BB:CC:DD:EE:01');
      expect(device1?.discoveryCount).toBe(2);

      // Second device should be new
      const device2 = result2.devices.find(d => d.mac === 'AA:BB:CC:DD:EE:02');
      expect(device2?.discoveryCount).toBe(1);
    });

    it('should handle cache eviction correctly', async () => {
      // Create more than max cache size (100)
      const mockDevices = Array.from({ length: 150 }, (_, i) => ({
        id: `192.168.1.${100 + i}`,
        name: `K1 Device ${i}`,
        ip: `192.168.1.${100 + i}`,
        port: 80,
        mac: `CC:DD:EE:FF:${i.toString(16).padStart(4, '0')}`,
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns' as const,
        rssi: -50,
      }));

      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const result = await discovery.discover();

      // Should have returned all 150 devices
      expect(result.devices.length).toBe(150);

      // But cache should be limited to max size (100)
      const cached = discovery.getCachedDevices();
      expect(cached.length).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // FULL WORKFLOW SCENARIOS
  // ============================================================================

  describe('Full Workflow Scenarios', () => {
    it('should handle complete discovery workflow: search -> cache -> dedupe', async () => {
      // First discovery finds 3 devices
      const batch1 = [
        {
          id: 'k1-001',
          name: 'K1 Device 1',
          ip: '192.168.1.100',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:01',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
        {
          id: 'k1-002',
          name: 'K1 Device 2',
          ip: '192.168.1.101',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:02',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
        {
          id: 'k1-003',
          name: 'K1 Device 3',
          ip: '192.168.1.102',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:03',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      // Second discovery: one device disappeared, two remain with new IPs
      const batch2 = [
        {
          id: 'k1-001',
          name: 'K1 Device 1',
          ip: '192.168.1.150', // IP changed
          port: 80,
          mac: 'AA:BB:CC:DD:EE:01',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
        {
          id: 'k1-002',
          name: 'K1 Device 2',
          ip: '192.168.1.151', // IP changed
          port: 80,
          mac: 'AA:BB:CC:DD:EE:02',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
        {
          id: 'k1-004',
          name: 'K1 Device 4',
          ip: '192.168.1.152',
          port: 80,
          mac: 'AA:BB:CC:DD:EE:04',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
        },
      ];

      let callNum = 0;
      vi.spyOn(K1Client, 'discover').mockImplementation(async () => {
        callNum++;
        return callNum === 1 ? batch1 : batch2;
      });

      // First discovery
      const result1 = await discovery.discover();
      expect(result1.devices.length).toBe(3);

      // Second discovery
      const result2 = await discovery.discover();
      // result2 returns what K1Client found (batch2 with 3 devices)
      expect(result2.devices.length).toBe(3);

      // Verify device tracking
      const device1 = result2.devices.find(d => d.mac === 'AA:BB:CC:DD:EE:01');
      expect(device1?.discoveryCount).toBe(2); // Seen twice
      expect(device1?.ip).toBe('192.168.1.150'); // Updated IP

      const device2 = result2.devices.find(d => d.mac === 'AA:BB:CC:DD:EE:02');
      expect(device2?.discoveryCount).toBe(2); // Seen twice
      expect(device2?.ip).toBe('192.168.1.151'); // Updated IP

      const device4 = result2.devices.find(d => d.mac === 'AA:BB:CC:DD:EE:04');
      expect(device4?.discoveryCount).toBe(1); // Only in second discovery

      // Verify that device 3 (which disappeared) is still in cache
      const allCached = discovery.getCachedDevices();
      const device3InCache = allCached.find(d => d.mac === 'AA:BB:CC:DD:EE:03');
      expect(device3InCache).toBeDefined(); // Still in cache
      expect(device3InCache?.discoveryCount).toBe(1); // Still just 1 discovery
    });
  });
});
