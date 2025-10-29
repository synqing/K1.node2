/**
 * Device Discovery Performance Benchmarks
 *
 * Measures:
 * - Discovery time under various loads
 * - Memory usage with rapid calls
 * - Device matching accuracy (MAC-based identity)
 * - Queue overhead
 * - Concurrent load handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeviceDiscoveryAbstraction } from '../device-discovery';
import { K1Client } from '../../api/k1-client';

// Helper: Create mock devices
function createMockDevices(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `192.168.1.${100 + i}`,
    name: `K1 Device ${i}`,
    ip: `192.168.1.${100 + i}`,
    port: 80,
    mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`,
    firmware: '1.0.0',
    lastSeen: new Date(),
    discoveryMethod: 'mdns' as const,
    rssi: -50 - i,
  }));
}

describe('Device Discovery Performance Benchmarks', () => {
  let discovery: DeviceDiscoveryAbstraction;

  beforeEach(() => {
    discovery = new DeviceDiscoveryAbstraction();
    discovery.setDebounceDelay(50); // Faster for testing
  });

  afterEach(() => {
    discovery.clearCache();
    vi.clearAllMocks();
  });

  // ============================================================================
  // BENCHMARK 1: DISCOVERY TIME
  // ============================================================================

  describe('Discovery Time', () => {
    it('should complete discovery in <500ms with 10 devices', async () => {
      const mockDevices = createMockDevices(10);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const start = performance.now();
      const result = await discovery.discover();
      const duration = performance.now() - start;

      expect(result.devices.length).toBe(10);
      expect(duration).toBeLessThan(500);

      console.log(`[BENCH] Discovery time (10 devices): ${duration.toFixed(2)}ms`);
    });

    it('should complete discovery in <1000ms with 100 devices', async () => {
      const mockDevices = createMockDevices(100);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const start = performance.now();
      const result = await discovery.discover();
      const duration = performance.now() - start;

      expect(result.devices.length).toBe(100);
      expect(duration).toBeLessThan(1000);

      console.log(`[BENCH] Discovery time (100 devices): ${duration.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // BENCHMARK 2: MEMORY USAGE
  // ============================================================================

  describe('Memory Usage', () => {
    it('should handle 100 rapid discover() calls without memory leak', async () => {
      const mockDevices = createMockDevices(10);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      // Force garbage collection if available
      if (global.gc) global.gc();

      const initialMemory = process.memoryUsage().heapUsed;

      // Make 100 rapid calls
      const promises = Array.from({ length: 100 }, () => discovery.discover());
      await Promise.all(promises);

      // Force garbage collection again
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      expect(memoryIncrease).toBeLessThan(5); // <5MB increase acceptable

      console.log(
        `[BENCH] Memory increase (100 calls): ${memoryIncrease.toFixed(2)}MB`
      );
    });

    it('should not leak promises (all 100 promises should resolve)', async () => {
      const mockDevices = createMockDevices(5);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      let resolvedCount = 0;

      // Make 100 rapid calls, count how many resolve
      const promises = Array.from({ length: 100 }, () =>
        discovery.discover().then(() => {
          resolvedCount++;
        })
      );

      await Promise.all(promises);

      // ALL 100 promises must resolve (no leaks)
      expect(resolvedCount).toBe(100);

      console.log(`[BENCH] Promises resolved: ${resolvedCount}/100`);
    });
  });

  // ============================================================================
  // BENCHMARK 3: DEVICE MATCHING ACCURACY
  // ============================================================================

  describe('Device Matching Accuracy', () => {
    it('should match devices by MAC with 100% accuracy after IP change', async () => {
      const mac = 'AA:BB:CC:DD:EE:FF';

      // First discovery: device at 192.168.1.100
      const devices1 = createMockDevices(1);
      devices1[0].mac = mac;
      devices1[0].ip = '192.168.1.100';

      let callCount = 0;
      vi.spyOn(K1Client, 'discover').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return devices1;
        } else {
          // Second call - same device, different IP
          const devices2 = createMockDevices(1);
          devices2[0].mac = mac;
          devices2[0].ip = '192.168.1.200';
          return devices2;
        }
      });

      const result1 = await discovery.discover();
      const device1 = result1.devices.find(d => d.mac === mac);

      expect(device1).toBeDefined();
      expect(device1!.id).toBe(mac); // ID is MAC
      expect(device1!.ip).toBe('192.168.1.100');
      expect(device1!.discoveryCount).toBe(1);

      // Second discovery: same device, different IP
      const result2 = await discovery.discover();
      const device2 = result2.devices.find(d => d.mac === mac);

      // Verify same device (by MAC)
      expect(device2).toBeDefined();
      expect(device2!.id).toBe(mac); // Same ID
      expect(device2!.ip).toBe('192.168.1.200'); // Updated IP
      expect(device2!.discoveryCount).toBe(2); // Incremented count

      console.log(`[BENCH] Device matching: 100% accuracy (MAC-based identity)`);
    });

    it('should deduplicate 10 devices with changing IPs across 5 discoveries', async () => {
      const macs = Array.from({ length: 10 }, (_, i) =>
        `BB:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`  // Changed prefix to avoid conflicts
      );

      let discoveryNum = 0;
      vi.spyOn(K1Client, 'discover').mockImplementation(async () => {
        discoveryNum++;
        return macs.map((mac, i) => ({
          id: `192.168.1.${100 + (discoveryNum * 10) + i}`, // IP changes each time
          name: `K1 Device ${i}`,
          ip: `192.168.1.${100 + (discoveryNum * 10) + i}`,
          port: 80,
          mac,
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns' as const,
          rssi: -50,
        }));
      });

      for (let i = 1; i <= 5; i++) {
        await discovery.discover();
      }

      const cached = discovery.getCachedDevices();

      // Should have exactly 10 unique devices (not 50)
      expect(cached.length).toBe(10);

      // All should have discoveryCount = 5
      cached.forEach(device => {
        expect(device.discoveryCount).toBe(5);
      });

      console.log(
        `[BENCH] Deduplication: 10 unique devices across 5 discoveries (100% accuracy)`
      );
    });
  });

  // ============================================================================
  // BENCHMARK 4: QUEUE OVERHEAD
  // ============================================================================

  describe('Queue Overhead', () => {
    it('should add <10ms overhead for promise queue with 100 pending calls', async () => {
      const mockDevices = createMockDevices(5);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      // Single call baseline
      const baselineStart = performance.now();
      await discovery.discover();
      const baselineDuration = performance.now() - baselineStart;

      // 100 rapid calls
      const start = performance.now();
      const promises = Array.from({ length: 100 }, () => discovery.discover());
      await Promise.all(promises);
      const duration = performance.now() - start;

      const overhead = duration - baselineDuration;

      expect(overhead).toBeLessThan(10); // <10ms overhead

      console.log(`[BENCH] Queue overhead (100 calls): ${overhead.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // BENCHMARK 5: CONCURRENT LOAD
  // ============================================================================

  describe('Concurrent Load Handling', () => {
    it('should handle 10 simultaneous discover() calls efficiently', async () => {
      const mockDevices = createMockDevices(20);
      vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      const start = performance.now();

      // 10 simultaneous calls (not sequential)
      const promises = Array.from({ length: 10 }, () => discovery.discover());
      const results = await Promise.all(promises);

      const duration = performance.now() - start;

      // All should get the same result (debounced)
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.devices.length).toBe(20);
      });

      // Should complete in reasonable time (<200ms)
      expect(duration).toBeLessThan(200);

      console.log(`[BENCH] Concurrent load (10 calls): ${duration.toFixed(2)}ms`);
    });

    it('should not trigger multiple K1Client.discover calls for rapid requests', async () => {
      const mockDevices = createMockDevices(5);
      const discoverSpy = vi.spyOn(K1Client, 'discover').mockResolvedValue(mockDevices);

      // 20 rapid calls
      const promises = Array.from({ length: 20 }, () => discovery.discover());
      await Promise.all(promises);

      // Should only call K1Client.discover ONCE (debounced)
      expect(discoverSpy).toHaveBeenCalledTimes(1);

      console.log(`[BENCH] Debounce efficiency: 1 API call for 20 requests`);
    });
  });
});
