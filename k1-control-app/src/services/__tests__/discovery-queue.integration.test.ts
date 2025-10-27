/**
 * Integration tests for Discovery Queue with Device Discovery
 *
 * Tests the complete integration between:
 * - DeviceDiscoveryAbstraction
 * - DiscoveryMethodQueue
 * - Priority-based method selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceDiscoveryAbstraction } from '../device-discovery';

describe('Discovery Queue Integration Tests', () => {
  let discovery: DeviceDiscoveryAbstraction;

  beforeEach(() => {
    discovery = new DeviceDiscoveryAbstraction();
  });

  describe('Queue-Based Discovery', () => {
    it('should use priority queue for method selection', async () => {
      const result = await discovery.discover({ timeout: 1000 });
      
      expect(result).toBeDefined();
      expect(result.method).toBeDefined();
      expect(['mdns', 'scan', 'hybrid', 'sequential_failed', 'race_failed', 'hybrid_failed']).toContain(result.method);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should provide queue configuration access', () => {
      const config = discovery.getQueueConfig();
      
      expect(config).toBeDefined();
      expect(config.strategy).toBe('hybrid');
      expect(config.methods).toBeDefined();
      expect(config.methods.length).toBeGreaterThan(0);
    });

    it('should allow queue configuration updates', () => {
      discovery.setQueueConfig({
        strategy: 'sequential',
        defaultTimeout: 3000,
      });

      const config = discovery.getQueueConfig();
      expect(config.strategy).toBe('sequential');
      expect(config.defaultTimeout).toBe(3000);
    });

    it('should provide method statistics', () => {
      const stats = discovery.getMethodStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Should have stats for enabled methods
      expect(stats.mdns).toBeDefined();
      expect(stats.scan).toBeDefined();
    });

    it('should allow priority reset', () => {
      // Modify priorities
      discovery.setQueueConfig({
        methods: [
          { name: 'mdns', priority: 10, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 2, timeout: 5000, retries: 0, enabled: true },
        ],
      });

      // Reset to defaults
      discovery.resetMethodPriorities();

      const config = discovery.getQueueConfig();
      const mdnsMethod = config.methods.find(m => m.name === 'mdns');
      const scanMethod = config.methods.find(m => m.name === 'scan');

      expect(mdnsMethod?.priority).toBe(8); // Default for mdns
      expect(scanMethod?.priority).toBe(6); // Default for scan
    });
  });

  describe('Strategy Behavior', () => {
    it('should work with sequential strategy', async () => {
      discovery.setQueueConfig({ strategy: 'sequential' });

      const result = await discovery.discover({ timeout: 1000 });
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should work with race strategy', async () => {
      discovery.setQueueConfig({ strategy: 'race' });

      const result = await discovery.discover({ timeout: 1000 });
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should work with hybrid strategy', async () => {
      discovery.setQueueConfig({ strategy: 'hybrid' });

      const result = await discovery.discover({ timeout: 1000 });
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Method Priority and Learning', () => {
    it('should maintain method priorities', async () => {
      const initialConfig = discovery.getQueueConfig();
      const initialMdnsPriority = initialConfig.methods.find(m => m.name === 'mdns')?.priority;

      // Perform discovery to potentially trigger learning
      await discovery.discover({ timeout: 1000 });

      const finalConfig = discovery.getQueueConfig();
      const finalMdnsPriority = finalConfig.methods.find(m => m.name === 'mdns')?.priority;

      // Priority should be defined and reasonable
      expect(initialMdnsPriority).toBeDefined();
      expect(finalMdnsPriority).toBeDefined();
      expect(finalMdnsPriority).toBeGreaterThan(0);
      expect(finalMdnsPriority).toBeLessThanOrEqual(10);
    });

    it('should provide method statistics after discovery', async () => {
      await discovery.discover({ timeout: 1000 });

      const stats = discovery.getMethodStats();
      
      // Should have basic stats structure
      Object.values(stats).forEach(methodStats => {
        expect(methodStats).toHaveProperty('priority');
        expect(methodStats).toHaveProperty('enabled');
        expect(methodStats).toHaveProperty('timeout');
        expect(methodStats).toHaveProperty('retries');
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle method failures gracefully', async () => {
      // Configure with very short timeouts to potentially trigger failures
      discovery.setQueueConfig({
        strategy: 'sequential',
        methods: [
          { name: 'mdns', priority: 8, timeout: 1, retries: 0, enabled: true },
          { name: 'scan', priority: 6, timeout: 1, retries: 0, enabled: true },
        ],
      });

      const result = await discovery.discover({ timeout: 100 });
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      // Result might have errors but should still be a valid response
    });

    it('should work with single enabled method', async () => {
      discovery.setQueueConfig({
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 0, enabled: true },
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: false },
          { name: 'manual', priority: 4, timeout: 2000, retries: 0, enabled: false },
        ],
      });

      const result = await discovery.discover({ timeout: 1000 });
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Performance and Timing', () => {
    it('should complete discovery within reasonable time', async () => {
      const startTime = performance.now();
      
      const result = await discovery.discover({ timeout: 2000 });
      
      const actualDuration = performance.now() - startTime;
      
      expect(result).toBeDefined();
      expect(actualDuration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(actualDuration + 100); // Allow some margin
    });

    it('should respect timeout configurations', async () => {
      discovery.setQueueConfig({
        strategy: 'sequential',
        defaultTimeout: 500, // Very short timeout
      });

      const startTime = performance.now();
      const result = await discovery.discover();
      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      // Should complete relatively quickly due to short timeout
      expect(duration).toBeLessThan(5000);
    });
  });
});