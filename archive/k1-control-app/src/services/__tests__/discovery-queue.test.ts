/**
 * Tests for DiscoveryMethodQueue
 *
 * Coverage areas:
 * - Queue configuration and method management
 * - Sequential execution strategy
 * - Race (parallel) execution strategy
 * - Hybrid execution strategy
 * - Priority learning and adjustment
 * - Method statistics and configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DiscoveryMethodQueue,
  DiscoveryQueueConfig,
  DiscoveryMethod,
  ExecutionOptions,
  DiscoveryResult,
} from '../discovery-queue';
import { DiscoveryMetricsCollector } from '../discovery-metrics';

describe('DiscoveryMethodQueue', () => {
  let queue: DiscoveryMethodQueue;
  let mockMetrics: DiscoveryMetricsCollector;
  let mockExecutor: vi.MockedFunction<(method: string, timeout: number) => Promise<DiscoveryResult>>;

  const defaultConfig: DiscoveryQueueConfig = {
    strategy: 'sequential',
    defaultTimeout: 5000,
    learningEnabled: true,
    methods: [
      {
        name: 'mdns',
        priority: 8,
        timeout: 3000,
        retries: 1,
        enabled: true,
      },
      {
        name: 'scan',
        priority: 6,
        timeout: 5000,
        retries: 0,
        enabled: true,
      },
      {
        name: 'manual',
        priority: 4,
        timeout: 2000,
        retries: 0,
        enabled: false,
      },
    ],
  };

  beforeEach(() => {
    mockMetrics = new DiscoveryMetricsCollector();
    mockExecutor = vi.fn();
    queue = new DiscoveryMethodQueue(defaultConfig, mockMetrics, mockExecutor);
  });

  describe('Configuration Management', () => {
    it('should initialize with provided configuration', () => {
      const config = queue.getConfig();
      expect(config.strategy).toBe('sequential');
      expect(config.methods).toHaveLength(3);
      expect(config.methods.find(m => m.name === 'mdns')?.priority).toBe(8);
    });

    it('should update configuration', () => {
      queue.setConfig({
        strategy: 'race',
        defaultTimeout: 3000,
      });

      const config = queue.getConfig();
      expect(config.strategy).toBe('race');
      expect(config.defaultTimeout).toBe(3000);
    });

    it('should update method configurations', () => {
      const newMethods: DiscoveryMethod[] = [
        {
          name: 'mdns',
          priority: 9,
          timeout: 2000,
          retries: 2,
          enabled: true,
        },
      ];

      queue.setConfig({ methods: newMethods });

      const config = queue.getConfig();
      expect(config.methods).toHaveLength(1);
      expect(config.methods[0].priority).toBe(9);
      expect(config.methods[0].retries).toBe(2);
    });
  });

  describe('Sequential Execution Strategy', () => {
    it('should execute methods in priority order', async () => {
      // Ensure clean configuration
      queue.setConfig({
        strategy: 'sequential',
        defaultTimeout: 5000,
        learningEnabled: true,
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: true },
          { name: 'manual', priority: 4, timeout: 2000, retries: 0, enabled: false },
        ],
      });

      // Mock successful mdns result
      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'mdns',
        duration: 1000,
        hasErrors: false,
        cancelled: false,
      });

      const result = await queue.execute({ strategy: 'sequential' });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('mdns', 3000); // mdns method-specific timeout
      expect(result.method).toBe('mdns');
      expect(result.devices).toHaveLength(1);
    });

    it('should fallback to next method if first fails', async () => {
      // Ensure clean configuration
      queue.setConfig({
        strategy: 'sequential',
        defaultTimeout: 5000,
        learningEnabled: true,
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: true },
          { name: 'manual', priority: 4, timeout: 2000, retries: 0, enabled: false },
        ],
      });

      // Mock mdns failure (with retry), then scan success
      mockExecutor
        .mockRejectedValueOnce(new Error('mDNS failed attempt 1'))
        .mockRejectedValueOnce(new Error('mDNS failed attempt 2'))
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'scan',
          duration: 2000,
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'sequential' });

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(mockExecutor).toHaveBeenNthCalledWith(1, 'mdns', 3000);
      expect(mockExecutor).toHaveBeenNthCalledWith(2, 'mdns', 3000); // Retry
      expect(mockExecutor).toHaveBeenNthCalledWith(3, 'scan', 5000);
      expect(result.method).toBe('scan');
    });

    it('should retry methods according to retry configuration', async () => {
      // Ensure clean configuration
      queue.setConfig({
        strategy: 'sequential',
        defaultTimeout: 5000,
        learningEnabled: true,
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: true },
          { name: 'manual', priority: 4, timeout: 2000, retries: 0, enabled: false },
        ],
      });

      // Mock mdns failures (1 retry), then scan success
      mockExecutor
        .mockRejectedValueOnce(new Error('mDNS failed attempt 1'))
        .mockRejectedValueOnce(new Error('mDNS failed attempt 2'))
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'scan',
          duration: 2000,
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'sequential' });

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      // mdns called twice (original + 1 retry)
      expect(mockExecutor).toHaveBeenNthCalledWith(1, 'mdns', 3000);
      expect(mockExecutor).toHaveBeenNthCalledWith(2, 'mdns', 3000);
      // then scan called once
      expect(mockExecutor).toHaveBeenNthCalledWith(3, 'scan', 5000);
      expect(result.method).toBe('scan');
    });

    it('should return error if all methods fail', async () => {
      mockExecutor
        .mockRejectedValueOnce(new Error('mDNS failed'))
        .mockRejectedValueOnce(new Error('mDNS retry failed'))
        .mockRejectedValueOnce(new Error('Scan failed'));

      const result = await queue.execute({ strategy: 'sequential' });

      expect(result.hasErrors).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.devices).toHaveLength(0);
    });

    it('should only use enabled methods', async () => {
      // Enable manual method
      queue.setConfig({
        methods: [
          { name: 'manual', priority: 10, timeout: 1000, retries: 0, enabled: true },
          { name: 'mdns', priority: 8, timeout: 3000, retries: 1, enabled: false },
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: true },
        ],
      });

      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'manual',
        duration: 500,
        hasErrors: false,
        cancelled: false,
      });

      const result = await queue.execute({ strategy: 'sequential' });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('manual', 1000); // manual has highest priority
      expect(result.method).toBe('manual');
    });
  });

  describe('Race Execution Strategy', () => {
    it('should execute all methods in parallel', async () => {
      // Mock both methods succeeding
      mockExecutor
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'mdns',
          duration: 100,
          hasErrors: false,
          cancelled: false,
        })
        .mockResolvedValueOnce({
          devices: [{ id: 'device2', name: 'Device 2' } as any],
          method: 'scan',
          duration: 200,
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'race' });

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      // Should return the highest priority successful result
      expect(result.method).toBe('mdns'); // Higher priority method
    });

    it('should return first successful result by priority order', async () => {
      // Both methods succeed, but scan has lower priority
      mockExecutor
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'mdns',
          duration: 1000,
          hasErrors: false,
          cancelled: false,
        })
        .mockResolvedValueOnce({
          devices: [{ id: 'device2', name: 'Device 2' } as any],
          method: 'scan',
          duration: 500, // Faster but lower priority
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'race' });

      expect(result.method).toBe('mdns'); // Higher priority wins
      expect(result.devices).toHaveLength(1);
    });

    it('should handle mixed success/failure results', async () => {
      mockExecutor
        .mockRejectedValueOnce(new Error('mDNS failed'))
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'scan',
          duration: 2000,
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'race' });

      expect(result.method).toBe('scan');
      expect(result.hasErrors).toBe(false);
    });
  });

  describe('Hybrid Execution Strategy', () => {
    it('should try high-priority methods sequentially first', async () => {
      // Ensure clean configuration with mdns as high priority
      queue.setConfig({
        strategy: 'hybrid',
        defaultTimeout: 5000,
        learningEnabled: true,
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 0, enabled: true }, // High priority
          { name: 'scan', priority: 6, timeout: 5000, retries: 0, enabled: true }, // Lower priority
          { name: 'manual', priority: 4, timeout: 2000, retries: 0, enabled: false }, // Disabled
        ],
      });

      // mdns (priority 8) should be tried first
      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'mdns',
        duration: 1000,
        hasErrors: false,
        cancelled: false,
      });

      const result = await queue.execute({ strategy: 'hybrid' });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('mdns', 3000);
      expect(result.method).toBe('mdns');
    });

    it('should race low-priority methods if high-priority fails', async () => {
      // Set up methods with clear priority split
      queue.setConfig({
        methods: [
          { name: 'mdns', priority: 8, timeout: 3000, retries: 0, enabled: true }, // High priority
          { name: 'scan', priority: 5, timeout: 5000, retries: 0, enabled: true }, // Low priority
          { name: 'manual', priority: 3, timeout: 2000, retries: 0, enabled: true }, // Low priority
        ],
      });

      // mdns fails, scan and manual race
      mockExecutor
        .mockRejectedValueOnce(new Error('mDNS failed'))
        .mockResolvedValueOnce({
          devices: [{ id: 'device1', name: 'Device 1' } as any],
          method: 'scan',
          duration: 2000,
          hasErrors: false,
          cancelled: false,
        })
        .mockResolvedValueOnce({
          devices: [{ id: 'device2', name: 'Device 2' } as any],
          method: 'manual',
          duration: 1000,
          hasErrors: false,
          cancelled: false,
        });

      const result = await queue.execute({ strategy: 'hybrid' });

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(result.method).toBe('scan'); // Higher priority among low-priority methods
    });
  });

  describe('Priority Learning and Adjustment', () => {
    it('should adjust priorities based on success rates and speed', () => {
      // Mock metrics data
      const mockMethodMetrics = new Map();
      mockMethodMetrics.set('mdns', {
        attemptCount: 20,
        successRate: 0.9,
        avgDurationMs: 1500,
      });
      mockMethodMetrics.set('scan', {
        attemptCount: 15,
        successRate: 0.6,
        avgDurationMs: 5000,
      });

      vi.spyOn(mockMetrics, 'getMethodMetrics').mockReturnValue(mockMethodMetrics);

      const initialConfig = queue.getConfig();
      const initialMdnsPriority = initialConfig.methods.find(m => m.name === 'mdns')?.priority || 0;

      queue.adjustPriorities();

      const updatedConfig = queue.getConfig();
      const updatedMdnsPriority = updatedConfig.methods.find(m => m.name === 'mdns')?.priority || 0;

      // mdns should have higher priority due to better performance
      expect(updatedMdnsPriority).toBeGreaterThanOrEqual(initialMdnsPriority);
    });

    it('should not adjust priorities with insufficient data', () => {
      // Mock metrics with low attempt count
      const mockMethodMetrics = new Map();
      mockMethodMetrics.set('mdns', {
        attemptCount: 5, // Below threshold of 10
        successRate: 0.9,
        avgDurationMs: 1500,
      });

      vi.spyOn(mockMetrics, 'getMethodMetrics').mockReturnValue(mockMethodMetrics);

      const initialConfig = queue.getConfig();
      const initialMdnsPriority = initialConfig.methods.find(m => m.name === 'mdns')?.priority || 0;

      queue.adjustPriorities();

      const updatedConfig = queue.getConfig();
      const updatedMdnsPriority = updatedConfig.methods.find(m => m.name === 'mdns')?.priority || 0;

      // Priority should remain unchanged
      expect(updatedMdnsPriority).toBe(initialMdnsPriority);
    });

    it('should enable/disable learning', async () => {
      queue.setConfig({ learningEnabled: false });

      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'mdns',
        duration: 1000,
        hasErrors: false,
        cancelled: false,
      });

      const initialConfig = queue.getConfig();
      await queue.execute({ strategy: 'sequential' });
      const finalConfig = queue.getConfig();

      // Priorities should not change when learning is disabled
      expect(finalConfig.methods).toEqual(initialConfig.methods);
    });
  });

  describe('Method Statistics and Utilities', () => {
    it('should return method statistics', () => {
      const mockMethodMetrics = new Map();
      mockMethodMetrics.set('mdns', {
        attemptCount: 10,
        successRate: 0.8,
        avgDurationMs: 1500,
      });

      vi.spyOn(mockMetrics, 'getMethodMetrics').mockReturnValue(mockMethodMetrics);

      const stats = queue.getMethodStats();

      expect(stats.mdns).toBeDefined();
      expect(stats.mdns.priority).toBe(8);
      expect(stats.mdns.successRate).toBe(0.8);
      expect(stats.mdns.avgDuration).toBe(1500);
    });

    it('should reset priorities to defaults', () => {
      // Modify priorities
      queue.setConfig({
        methods: [
          { name: 'mdns', priority: 10, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 2, timeout: 5000, retries: 0, enabled: true },
        ],
      });

      queue.resetPriorities();

      const config = queue.getConfig();
      const mdnsMethod = config.methods.find(m => m.name === 'mdns');
      const scanMethod = config.methods.find(m => m.name === 'scan');

      expect(mdnsMethod?.priority).toBe(8); // Default for mdns
      expect(scanMethod?.priority).toBe(6); // Default for scan
    });

    it('should handle preferred methods', async () => {
      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'scan',
        duration: 2000,
        hasErrors: false,
        cancelled: false,
      });

      const result = await queue.execute({
        strategy: 'sequential',
        preferredMethods: ['scan'], // Only use scan
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('scan', 5000);
      expect(result.method).toBe('scan');
    });

    it('should handle empty preferred methods gracefully', async () => {
      const result = await queue.execute({
        preferredMethods: ['nonexistent'],
      });

      expect(result.hasErrors).toBe(true);
      expect(result.errors).toContain('No enabled discovery methods available');
    });
  });

  describe('Error Handling', () => {
    it('should handle executor exceptions gracefully', async () => {
      mockExecutor.mockRejectedValue(new Error('Network error'));

      const result = await queue.execute({ strategy: 'sequential' });

      expect(result.hasErrors).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.devices).toHaveLength(0);
    });

    it('should handle invalid strategy gracefully', async () => {
      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'mdns',
        duration: 1000,
        hasErrors: false,
        cancelled: false,
      });

      // @ts-ignore - Testing invalid strategy
      const result = await queue.execute({ strategy: 'invalid' });

      // Should default to sequential
      expect(result.method).toBe('mdns');
      expect(result.hasErrors).toBe(false);
    });

    it('should handle timeout configuration', async () => {
      mockExecutor.mockResolvedValueOnce({
        devices: [{ id: 'device1', name: 'Device 1' } as any],
        method: 'mdns',
        duration: 1000,
        hasErrors: false,
        cancelled: false,
      });

      await queue.execute({ timeout: 8000 });

      expect(mockExecutor).toHaveBeenCalledWith('mdns', 3000); // Method-specific timeout takes precedence
    });
  });
});