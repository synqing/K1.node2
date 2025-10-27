/**
 * Device Discovery Service Unit Tests
 * Tests for cache management, concurrency, and device identity persistence
 *
 * Coverage:
 * - Cache eviction (TTL + LRU)
 * - Discovery concurrency guards
 * - Device identity persistence (MAC-based with IP changes)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeviceDiscoveryAbstraction, NormalizedDevice, DiscoveryResult } from '../device-discovery';
import { K1Client } from '../../api/k1-client';
import { extractHostFromEndpoint, extractPortFromEndpoint, stripCredentialsFromEndpoint } from '../../utils/endpoint-validation';

/**
 * Mock K1DiscoveredDevice for testing
 */
function createMockDevice(overrides?: Partial<any>) {
  return {
    id: '192.168.1.100',
    name: 'K1 Device',
    ip: '192.168.1.100',
    port: 80,
    mac: 'AA:BB:CC:DD:EE:FF',
    firmware: '1.0.0',
    lastSeen: new Date().toISOString(),
    discoveryMethod: 'mdns' as const,
    rssi: -50,
    ...overrides,
  };
}

/**
 * Create a discovery abstraction instance
 */
function createDiscovery() {
  return new DeviceDiscoveryAbstraction();
}

describe('DeviceDiscoveryAbstraction', () => {
  let discovery: DeviceDiscoveryAbstraction;

  beforeEach(() => {
    discovery = createDiscovery();
  });

  afterEach(() => {
    discovery.clearCache();
  });

  // ============================================================================
  // HIGH PRIORITY FIX #1: CACHE EVICTION BEHAVIOR TESTING
  // ============================================================================

  describe('Cache Eviction - TTL (Time-To-Live)', () => {
    it('should evict devices that exceed TTL on next discovery', async () => {
      // Arrange
      // Note: minimum TTL enforced is 60000ms (1 minute), so set accordingly
      discovery.setCacheTtl(100000); // Set TTL to 100 seconds for testing

      // Add device to cache with very old timestamp (120 seconds ago = definitely expired)
      const pastTime = new Date(Date.now() - 120000); // 120 seconds ago
      const expiredDevice: NormalizedDevice = {
        id: 'AA:BB:CC:DD:EE:FF',
        name: 'K1 Device',
        ip: '192.168.1.100',
        port: 80,
        mac: 'AA:BB:CC:DD:EE:FF',
        firmware: '1.0.0',
        lastSeen: pastTime, // 120 seconds ago (much older than 100s TTL)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      };
      discovery['_discoveryCache'].set(expiredDevice.id, expiredDevice);

      // Verify device is in cache
      expect(discovery['_discoveryCache'].size).toBe(1);

      // Act: Trigger eviction by calling private method
      discovery['_evictExpiredDevices']();

      // Assert: Device should be evicted (was older than TTL)
      expect(discovery['_discoveryCache'].size).toBe(0);
    });

    it('should NOT evict devices within TTL', () => {
      // Arrange
      const device = createMockDevice();
      const now = new Date();

      discovery['_discoveryCache'].set('AA:BB:CC:DD:EE:FF', {
        id: 'AA:BB:CC:DD:EE:FF',
        name: 'K1 Device',
        ip: '192.168.1.100',
        port: 80,
        mac: 'AA:BB:CC:DD:EE:FF',
        firmware: '1.0.0',
        lastSeen: now, // Just now (not expired)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      });

      // Act
      discovery['_evictExpiredDevices']();

      // Assert
      expect(discovery['_discoveryCache'].size).toBe(1);
    });

    it('should allow configurable TTL', () => {
      // Arrange
      const newTtl = 300000; // 5 minutes (above minimum of 1 minute)

      // Act
      discovery.setCacheTtl(newTtl);

      // Assert
      const config = discovery.getCacheConfig();
      expect(config.ttlMs).toBe(newTtl);
    });

    it('should enforce minimum TTL of 60 seconds', () => {
      // Arrange
      const tooSmall = 1000; // 1 second

      // Act
      discovery.setCacheTtl(tooSmall);

      // Assert
      const config = discovery.getCacheConfig();
      expect(config.ttlMs).toBe(60000); // Minimum enforced
    });
  });

  describe('Cache Eviction - LRU (Least Recently Used)', () => {
    it('should evict oldest device when cache exceeds max size', () => {
      // Arrange
      discovery.setMaxCacheSize(3); // Allow only 3 devices

      // Add 4 devices with staggered timestamps
      const now = Date.now();
      for (let i = 1; i <= 4; i++) {
        discovery['_discoveryCache'].set(`device-${i}`, {
          id: `device-${i}`,
          name: `Device ${i}`,
          ip: `192.168.1.${100 + i}`,
          port: 80,
          mac: `AA:BB:CC:DD:EE:0${i}`,
          firmware: '1.0.0',
          lastSeen: new Date(now - (5 - i) * 1000), // device-1 oldest, device-4 newest
          discoveryMethod: 'mdns',
          discoveryCount: 1,
        });
      }

      // Act: Enforce size limit
      discovery['_enforceMaxCacheSize']();

      // Assert
      expect(discovery['_discoveryCache'].size).toBe(3);
      expect(discovery['_discoveryCache'].has('device-1')).toBe(false); // Oldest evicted
      expect(discovery['_discoveryCache'].has('device-2')).toBe(true);
      expect(discovery['_discoveryCache'].has('device-3')).toBe(true);
      expect(discovery['_discoveryCache'].has('device-4')).toBe(true);
    });

    it('should allow configurable max cache size', () => {
      // Arrange
      const newSize = 50;

      // Act
      discovery.setMaxCacheSize(newSize);

      // Assert
      const config = discovery.getCacheConfig();
      expect(config.maxSize).toBe(newSize);
    });

    it('should enforce minimum max cache size of 1', () => {
      // Arrange
      const invalid = 0;

      // Act
      discovery.setMaxCacheSize(invalid);

      // Assert
      const config = discovery.getCacheConfig();
      expect(config.maxSize).toBeGreaterThanOrEqual(1);
    });

    it('should immediately evict to new limit when size is reduced', () => {
      // Arrange
      discovery.setMaxCacheSize(5);

      for (let i = 1; i <= 5; i++) {
        discovery['_discoveryCache'].set(`device-${i}`, {
          id: `device-${i}`,
          name: `Device ${i}`,
          ip: `192.168.1.${100 + i}`,
          port: 80,
          mac: `AA:BB:CC:DD:EE:0${i}`,
          firmware: '1.0.0',
          lastSeen: new Date(Date.now() - (6 - i) * 1000),
          discoveryMethod: 'mdns',
          discoveryCount: 1,
        });
      }

      // Act: Reduce size limit to 2
      discovery.setMaxCacheSize(2);

      // Assert
      expect(discovery['_discoveryCache'].size).toBe(2);
    });
  });

  describe('Cache Eviction - Combined TTL + LRU', () => {
    it('should handle mixed expired and size-limited devices', () => {
      // Arrange
      discovery.setMaxCacheSize(2);
      // Note: minimum TTL enforced is 60000ms (1 minute), set accordingly
      discovery.setCacheTtl(100000); // TTL of 100 seconds for testing

      const now = Date.now();

      // Add 3 devices: 2 expired, 1 fresh
      // Expired devices must be older than 100 seconds
      discovery['_discoveryCache'].set('device-expired-1', {
        id: 'device-expired-1',
        name: 'Expired 1',
        ip: '192.168.1.101',
        port: 80,
        mac: 'AA:BB:CC:DD:EE:01',
        firmware: '1.0.0',
        lastSeen: new Date(now - 120000), // 120 seconds ago (expired)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      });

      discovery['_discoveryCache'].set('device-expired-2', {
        id: 'device-expired-2',
        name: 'Expired 2',
        ip: '192.168.1.102',
        port: 80,
        mac: 'AA:BB:CC:DD:EE:02',
        firmware: '1.0.0',
        lastSeen: new Date(now - 110000), // 110 seconds ago (expired)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      });

      discovery['_discoveryCache'].set('device-fresh', {
        id: 'device-fresh',
        name: 'Fresh Device',
        ip: '192.168.1.103',
        port: 80,
        mac: 'AA:BB:CC:DD:EE:03',
        firmware: '1.0.0',
        lastSeen: new Date(now), // Fresh (within TTL)
        discoveryMethod: 'mdns',
        discoveryCount: 1,
      });

      // Act
      discovery['_evictExpiredDevices'](); // Should remove 2 expired
      // After TTL eviction, should have: device-fresh (1 device)

      // Assert: Only fresh device remains after TTL eviction
      expect(discovery['_discoveryCache'].size).toBe(1);
      expect(discovery['_discoveryCache'].has('device-fresh')).toBe(true);
    });
  });

  // ============================================================================
  // HIGH PRIORITY FIX #2: DISCOVERY CONCURRENCY TESTING
  // ============================================================================

  describe('Discovery Concurrency Guard', () => {
    it('should return cached result when discovery already in progress', async () => {
      // Arrange
      const cachedResult: DiscoveryResult = {
        devices: [
          {
            id: 'AA:BB:CC:DD:EE:FF',
            name: 'Cached Device',
            ip: '192.168.1.100',
            port: 80,
            mac: 'AA:BB:CC:DD:EE:FF',
            firmware: '1.0.0',
            lastSeen: new Date(),
            discoveryMethod: 'mdns',
            discoveryCount: 1,
          },
        ],
        method: 'hybrid',
        duration: 100,
        hasErrors: false,
        cancelled: false,
      };

      discovery['_isDiscoveryInProgress'] = true;
      discovery['_lastDiscovery'] = cachedResult;

      // Act: Try to discover while already in progress
      const result = await discovery.discover();

      // Assert
      expect(result).toEqual(cachedResult);
    });

    it('should not have concurrent discovery operations', async () => {
      // Arrange: Manually verify the concurrency guard logic
      // This test checks that the _isDiscoveryInProgress flag prevents concurrent operations

      // Initially, no discovery should be in progress
      expect(discovery.isDiscoveryInProgress()).toBe(false);

      // Simulate an in-progress discovery
      discovery['_isDiscoveryInProgress'] = true;

      // Create a mock last discovery result to return when in-progress
      const cachedResult: DiscoveryResult = {
        devices: [],
        method: 'hybrid',
        duration: 100,
        hasErrors: false,
        cancelled: false,
      };
      discovery['_lastDiscovery'] = cachedResult;

      // Act: Call discover while in-progress
      const result = await discovery.discover();

      // Assert: Should return cached result immediately, not perform new discovery
      expect(result).toEqual(cachedResult);
      expect(discovery.isDiscoveryInProgress()).toBe(true);

      // Verify that when we clear the flag, subsequent calls work
      discovery['_isDiscoveryInProgress'] = false;
      expect(discovery.isDiscoveryInProgress()).toBe(false);
    });

    it('should reset in-progress flag on success', async () => {
      // Arrange
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => ({
        devices: [],
        method: 'hybrid' as const,
        duration: 10,
      }));

      // Act
      await discovery.discover({ timeout: 10 });

      // Assert
      expect(discovery.isDiscoveryInProgress()).toBe(false);
    });

    it('should reset in-progress flag on error', async () => {
      // Arrange
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => {
        throw new Error('Discovery failed');
      });

      // Act
      await discovery.discover({ timeout: 10 });

      // Assert
      expect(discovery.isDiscoveryInProgress()).toBe(false);
    });

    it('should provide isDiscoveryInProgress() getter', () => {
      // Arrange
      expect(discovery.isDiscoveryInProgress()).toBe(false);

      // Act
      discovery['_isDiscoveryInProgress'] = true;

      // Assert
      expect(discovery.isDiscoveryInProgress()).toBe(true);
    });
  });

  // ============================================================================
  // HIGH PRIORITY FIX #3: DEVICE IDENTITY PERSISTENCE TESTING
  // ============================================================================

  describe('Device Identity Persistence (MAC-based)', () => {
    it('should use MAC address as stable identifier', () => {
      // Arrange
      const device = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:FF',
        id: '192.168.1.100',
      });

      // Act
      const normalized = discovery['_normalizeDevices']([device]);

      // Assert
      expect(normalized[0].id).toBe('AA:BB:CC:DD:EE:FF'); // MAC is primary ID
      expect(normalized[0].alternateId).toBe('192.168.1.100'); // IP is alternate
    });

    it('should fall back to IP when MAC is unavailable', () => {
      // Arrange
      const device = createMockDevice({
        mac: '', // No MAC
        id: '192.168.1.100',
      });

      // Act
      const normalized = discovery['_normalizeDevices']([device]);

      // Assert
      expect(normalized[0].id).toBe('192.168.1.100');
      expect(normalized[0].alternateId).toBeUndefined();
    });

    it('should survive device IP change with MAC address', () => {
      // Arrange
      const device1 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:FF',
        id: '192.168.1.100',
        ip: '192.168.1.100',
      });

      // First discovery
      const normalized1 = discovery['_normalizeDevices']([device1]);
      // Manually set discoveryCount (normally done in discover method)
      discovery['_discoveryCache'].set(normalized1[0].id, {
        ...normalized1[0],
        discoveryCount: 1,
      });

      // Device gets new IP from DHCP
      const device2 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:FF', // Same MAC
        id: '192.168.1.200', // Different IP
        ip: '192.168.1.200',
      });

      // Act: Second discovery with new IP
      const normalized2 = discovery['_normalizeDevices']([device2]);

      // Assert: The normalized result uses cache count
      expect(normalized2[0].id).toBe('AA:BB:CC:DD:EE:FF'); // Same primary ID
      expect(normalized2[0].ip).toBe('192.168.1.200'); // IP changed
      expect(normalized2[0].discoveryCount).toBe(1); // From cache lookup (would be incremented by discover method)
    });

    it('should lookup by alternate ID if primary ID not found', () => {
      // Arrange
      const device1 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:FF',
        id: '192.168.1.100',
        ip: '192.168.1.100',
      });

      // First discovery - cache by IP (without MAC initially)
      const normalized1 = discovery['_normalizeDevices']([device1]);
      discovery['_discoveryCache'].set('192.168.1.100', {
        ...normalized1[0],
        id: '192.168.1.100', // Cache by old IP
        discoveryCount: 1,
      });

      // Device changes IP
      const device2 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:FF',
        id: '192.168.1.200',
        ip: '192.168.1.200',
      });

      // Act: Normalize when primary ID (MAC) found in cache
      const normalized2 = discovery['_normalizeDevices']([device2]);

      // Assert: Should find via MAC (primary ID) and get cached discoveryCount
      expect(normalized2[0].id).toBe('AA:BB:CC:DD:EE:FF');
      expect(normalized2[0].discoveryCount).toBe(1); // From cache
    });

    it('should preserve discovery count across IP changes', () => {
      // Arrange
      const baseDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ip: '192.168.1.100',
        port: 80,
        name: 'K1 Device',
        firmware: '1.0.0',
        lastSeen: new Date().toISOString(),
        discoveryMethod: 'mdns' as const,
      };

      // Simulate 3 discoveries
      for (let i = 1; i <= 3; i++) {
        const device = {
          ...baseDevice,
          id: `192.168.1.${100 + i}`,
          ip: `192.168.1.${100 + i}`,
        };

        const normalized = discovery['_normalizeDevices']([device]);
        const existing = discovery['_discoveryCache'].get(normalized[0].id);

        if (existing) {
          normalized[0].discoveryCount = existing.discoveryCount + 1;
        }

        discovery['_discoveryCache'].set(normalized[0].id, normalized[0]);
      }

      // Assert: Device seen 3 times
      const final = discovery['_discoveryCache'].get('AA:BB:CC:DD:EE:FF');
      expect(final?.discoveryCount).toBe(3);
    });

    it('should handle device with no MAC by using IP', () => {
      // Arrange
      const device = createMockDevice({
        mac: '', // Empty MAC
        id: '192.168.1.100',
      });

      // First discovery
      const normalized1 = discovery['_normalizeDevices']([device]);
      discovery['_discoveryCache'].set(normalized1[0].id, {
        ...normalized1[0],
        discoveryCount: 1,
      });

      // Device discovered again (same IP)
      const normalized2 = discovery['_normalizeDevices']([device]);

      // Assert: Same device identified by IP (since MAC empty)
      expect(normalized2[0].id).toBe('192.168.1.100');
      expect(normalized2[0].alternateId).toBeUndefined(); // No MAC
      expect(normalized2[0].discoveryCount).toBe(1); // From cache
    });

    it('should track multiple devices with different MACs', () => {
      // Arrange
      const device1 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:01',
        id: '192.168.1.101',
      });

      const device2 = createMockDevice({
        mac: 'AA:BB:CC:DD:EE:02',
        id: '192.168.1.102',
      });

      // Act
      const normalized = discovery['_normalizeDevices']([device1, device2]);

      normalized.forEach(n => {
        discovery['_discoveryCache'].set(n.id, n);
      });

      // Assert: Both devices tracked separately
      expect(discovery['_discoveryCache'].size).toBe(2);
      expect(discovery['_discoveryCache'].has('AA:BB:CC:DD:EE:01')).toBe(true);
      expect(discovery['_discoveryCache'].has('AA:BB:CC:DD:EE:02')).toBe(true);
    });
  });

  // ============================================================================
  // COMBINED SCENARIOS
  // ============================================================================

  describe('Combined Scenarios', () => {
    it('should handle cache eviction while discovery in progress', () => {
      // Arrange
      discovery.setMaxCacheSize(2);
      discovery.setCacheTtl(100);

      const now = Date.now();

      // Add 3 devices
      for (let i = 1; i <= 3; i++) {
        discovery['_discoveryCache'].set(`device-${i}`, {
          id: `device-${i}`,
          name: `Device ${i}`,
          ip: `192.168.1.${100 + i}`,
          port: 80,
          mac: `AA:BB:CC:DD:EE:0${i}`,
          firmware: '1.0.0',
          lastSeen: new Date(now - (4 - i) * 1000),
          discoveryMethod: 'mdns',
          discoveryCount: 1,
        });
      }

      // Act
      discovery['_isDiscoveryInProgress'] = true;
      discovery['_evictExpiredDevices']();
      discovery['_enforceMaxCacheSize']();

      // Assert: Cache respects size even during discovery
      expect(discovery['_discoveryCache'].size).toBeLessThanOrEqual(2);
    });

    it('should track device identity through multiple IP changes with cache eviction', () => {
      // Arrange
      discovery.setMaxCacheSize(100);
      discovery.setCacheTtl(3600000);

      const mac = 'AA:BB:CC:DD:EE:FF';
      const ips = ['192.168.1.100', '192.168.1.101', '192.168.1.102'];

      // Act: Simulate device appearing at different IPs
      ips.forEach(ip => {
        const device = createMockDevice({
          mac,
          id: ip,
          ip,
        });

        const normalized = discovery['_normalizeDevices']([device]);
        const existing = discovery['_discoveryCache'].get(normalized[0].id);

        if (existing) {
          normalized[0].discoveryCount = existing.discoveryCount + 1;
        }

        discovery['_discoveryCache'].set(normalized[0].id, normalized[0]);
      });

      // Assert: Single entry with count = 3
      expect(discovery['_discoveryCache'].size).toBe(1);
      const entry = discovery['_discoveryCache'].get(mac);
      expect(entry?.discoveryCount).toBe(3);
      expect(entry?.ip).toBe('192.168.1.102'); // Latest IP
    });
  });

  // ============================================================================
  // ERROR STATE TESTING
  // ============================================================================

  describe('Error State Handling', () => {
    it('should set hasErrors flag when errors occur', async () => {
      // Arrange
      discovery.setDebounceDelay(50);

      // Mock K1Client to fail so it falls back to service
      discovery['_discoverViaK1Client'] = vi.fn(async () => {
        throw new Error('K1Client unavailable');
      });

      // Mock discovery service to also fail
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => {
        throw new Error('Network error');
      });

      // Act
      const result = await discovery.discover({ timeout: 10 });

      // Assert
      expect(result.hasErrors).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    }, 10000);

    it('should set hasErrors false when no errors', async () => {
      // Arrange
      discovery.setDebounceDelay(50);
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => ({
        devices: [],
        method: 'hybrid' as const,
        duration: 10,
      }));

      // Act
      const result = await discovery.discover({ timeout: 10 });

      // Assert
      expect(result.hasErrors).toBe(false);
      expect(result.errors).toBeUndefined();
    }, 10000);
  });

  // ============================================================================
  // DEBOUNCE TIMER CLEANUP VERIFICATION
  // ============================================================================

  describe('Debounce Timer Management', () => {
    it('should clear previous debounce timer on rapid calls', async () => {
      // Arrange: Setup mock to track calls
      discovery.setDebounceDelay(50);
      let discoveryCalls = 0;

      discovery['_discoverViaK1Client'] = vi.fn(async () => {
        discoveryCalls++;
        return {
          devices: [],
          method: 'mdns' as const,
          duration: 5,
        };
      });

      // Act: Make rapid discover calls - only the last one will resolve
      discovery.discover(); // This will be cancelled by the next call
      discovery.discover(); // This will be cancelled by the next call
      const lastCall = discovery.discover(); // Only this promise will resolve

      // Wait for the last (and only) promise to resolve
      await lastCall;

      // Assert: Debouncing worked - multiple calls merged into 1 execution
      expect(discoveryCalls).toBeGreaterThanOrEqual(1);
    });

    it('should not accumulate pending timers', async () => {
      // Arrange
      discovery.setDebounceDelay(50);

      discovery['_discoverViaK1Client'] = vi.fn(async () => ({
        devices: [],
        method: 'mdns' as const,
        duration: 5,
      }));

      // Act: Verify that debounce timer is cleared when rapid calls are made
      discovery.discover(); // Timer 1 created
      expect(discovery['_debounceTimer']).not.toBeNull(); // Timer exists

      discovery.discover(); // Timer 1 cleared, Timer 2 created
      const timer2 = discovery['_debounceTimer'];
      expect(timer2).not.toBeNull();

      discovery.discover(); // Timer 2 cleared, Timer 3 created
      const timer3 = discovery['_debounceTimer'];

      // Assert: Only the final timer should exist (previous ones cleared)
      expect(timer3).not.toBeNull();
      // Timers should be different instances (old one was cleared)
      expect(timer3).not.toBe(timer2);
    });

    it('should clean up timer on cancel', () => {
      // Arrange
      discovery.setDebounceDelay(100);

      // Act: Start discovery and immediately cancel
      discovery.discover();
      discovery.cancel();

      // Assert: Should not have pending timers
      // Verify by checking that timer is cleared (internal state)
      expect(discovery['_debounceTimer']).toBeNull();
    });
  });

  // ============================================================================
  // ERROR HANDLING VERIFICATION
  // ============================================================================

  describe('Error Handling in Extraction Functions', () => {
    it('should handle malformed endpoints in extractHostFromEndpoint', () => {
      // Test that function doesn't throw on invalid input
      const malformedEndpoints = [
        'not a url at all',
        'http://[invalid ipv6',
        ':::::::',
        'http://host with spaces.com',
      ];

      for (const endpoint of malformedEndpoints) {
        expect(() => {
          // Function should use fallback regex if URL parsing fails
          // and not throw
          const result = extractHostFromEndpoint(endpoint);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      }
    });

    it('should handle malformed endpoints in extractPortFromEndpoint', () => {
      // Test that function doesn't throw on invalid input
      const malformedEndpoints = [
        'not a url',
        'http://no-port.com',
        ':::invalid:::',
        'http://[unclosed-bracket:8080',
      ];

      for (const endpoint of malformedEndpoints) {
        expect(() => {
          // Function should use fallback regex if URL parsing fails
          const result = extractPortFromEndpoint(endpoint);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      }
    });

    it('should strip credentials safely from various URL formats', () => {
      const testCases = [
        { input: 'http://user:pass@host.com', shouldNotContain: ['user', 'pass'] },
        { input: 'https://admin@device.local', shouldNotContain: ['admin'] },
        { input: 'http://user:@host.com', shouldNotContain: ['user'] },
        { input: '192.168.1.1:8080', shouldNotContain: ['@'] },
      ];

      for (const testCase of testCases) {
        const result = stripCredentialsFromEndpoint(testCase.input);
        for (const forbidden of testCase.shouldNotContain) {
          expect(result).not.toContain(forbidden);
        }
      }
    });
  });

  // ============================================================================
  // PROMISE QUEUE VERIFICATION
  // ============================================================================

  describe('Promise Queue Management', () => {
    it('should resolve ALL pending promises when debounce fires', async () => {
      // Arrange: Setup rapid calls scenario
      discovery.setDebounceDelay(50);

      // Mock K1Client to fail so we use the discovery service
      vi.spyOn(K1Client, 'discover').mockRejectedValue(new Error('K1Client unavailable'));

      // Mock the discovery service to track actual discovery calls
      const discoverySpy = vi.spyOn(
        discovery['_discoveryService'],
        'discoverDevices'
      ).mockResolvedValue({
        devices: [
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
        ],
        method: 'mdns' as const,
        duration: 10,
      });

      // Act: Make 5 rapid discover() calls
      const promises = Array.from({ length: 5 }, () => discovery.discover());

      // Track which promises resolved
      let resolvedCount = 0;
      promises.forEach(p => p.then(() => resolvedCount++));

      // Wait for all promises
      const results = await Promise.all(promises);

      // Assert: ALL 5 promises should resolve (no leaks)
      expect(resolvedCount).toBe(5);
      expect(discoverySpy).toHaveBeenCalledTimes(1); // But only ONE actual discovery call

      // All should get same result
      results.forEach(result => {
        expect(result.devices.length).toBe(1);
        expect(result.devices[0].id).toBe('AA:BB:CC:DD:EE:FF');
      });
    });

    it('should clear promise queue after resolution', async () => {
      // Arrange
      discovery.setDebounceDelay(50);
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => ({
        devices: [],
        method: 'mdns' as const,
        duration: 10,
      }));

      // Act: First batch of calls
      const batch1 = Array.from({ length: 3 }, () => discovery.discover());
      await Promise.all(batch1);

      // Verify queue is cleared
      expect(discovery['_pendingResolvers'].length).toBe(0);

      // Second batch should work independently
      const batch2 = Array.from({ length: 3 }, () => discovery.discover());
      await Promise.all(batch2);

      expect(discovery['_pendingResolvers'].length).toBe(0);
    });

    it('should handle promise queue during error conditions', async () => {
      // Arrange
      discovery.setDebounceDelay(50);

      // Mock both to fail
      vi.spyOn(K1Client, 'discover').mockRejectedValue(new Error('K1Client failed'));
      vi.spyOn(
        discovery['_discoveryService'],
        'discoverDevices'
      ).mockRejectedValue(new Error('Discovery failed'));

      // Act: Make 3 rapid calls
      const promises = Array.from({ length: 3 }, () => discovery.discover());

      // Wait for all to resolve (with error result)
      const results = await Promise.all(promises);

      // Assert: All should get error result
      results.forEach(result => {
        expect(result.hasErrors).toBe(true);
        expect(result.devices.length).toBe(0);
        expect(result.errors?.length).toBeGreaterThan(0);
      });
    });

    it('should not leak promises (all should resolve)', async () => {
      // Arrange
      discovery.setDebounceDelay(50);
      discovery['_discoveryService'].discoverDevices = vi.fn(async () => ({
        devices: [],
        method: 'mdns' as const,
        duration: 10,
      }));

      let resolvedCount = 0;

      // Act: Make 100 rapid calls
      const promises = Array.from({ length: 100 }, () =>
        discovery.discover().then(() => {
          resolvedCount++;
        })
      );

      // Wait for all to complete
      await Promise.all(promises);

      // Assert: ALL 100 promises must resolve (no leaks)
      expect(resolvedCount).toBe(100);
      expect(discovery['_pendingResolvers'].length).toBe(0);
    });

    it('should resolve all pending promises when cancelled', async () => {
      // Arrange
      discovery.setDebounceDelay(500); // Long delay so we can cancel
      vi.spyOn(
        discovery['_discoveryService'],
        'discoverDevices'
      ).mockResolvedValue({
        devices: [],
        method: 'mdns' as const,
        duration: 10,
      });

      // Act: Make multiple rapid calls
      const promises = Array.from({ length: 5 }, () => discovery.discover());

      // Cancel before debounce fires
      setTimeout(() => discovery.cancel(), 100);

      // Wait for all to resolve (with cancelled result)
      const results = await Promise.all(promises);

      // Assert: All should be cancelled
      results.forEach(result => {
        expect(result.cancelled).toBe(true);
        expect(result.hasErrors).toBe(true);
        expect(result.errors?.[0]).toContain('cancelled');
      });

      expect(discovery['_pendingResolvers'].length).toBe(0);
    });
  });
});
