/**
 * Tests for useCacheStats hook
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCacheStats } from '../useCacheStats';
import { getDeviceDiscovery } from '../../services/device-discovery';
import { discoveryMetrics } from '../../services/discovery-metrics';

// Mock the dependencies
vi.mock('../../services/device-discovery', () => ({
  getDeviceDiscovery: vi.fn(),
}));

vi.mock('../../services/discovery-metrics', () => ({
  discoveryMetrics: {
    getCacheMetrics: vi.fn(),
  },
}));

const mockGetDeviceDiscovery = getDeviceDiscovery as any;
const mockDiscoveryMetrics = discoveryMetrics as any;

describe('useCacheStats', () => {
  const mockDeviceDiscovery = {
    getCacheConfig: vi.fn(),
    getCachedDevices: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockGetDeviceDiscovery.mockReturnValue(mockDeviceDiscovery as any);
    
    // Default mock implementations
    mockDeviceDiscovery.getCacheConfig.mockReturnValue({
      currentSize: 0,
      maxSize: 100,
      ttlMs: 3600000, // 1 hour
    });
    mockDeviceDiscovery.getCachedDevices.mockReturnValue([]);
    mockDiscoveryMetrics.getCacheMetrics.mockReturnValue({
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return cache size and max size', () => {
    mockDeviceDiscovery.getCacheConfig.mockReturnValue({
      currentSize: 25,
      maxSize: 100,
      ttlMs: 3600000,
    });

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.size).toBe(25);
    expect(result.current.maxSize).toBe(100);
    expect(result.current.ttlMs).toBe(3600000);
  });

  it('should include hit/miss/eviction counts', () => {
    mockDiscoveryMetrics.getCacheMetrics.mockReturnValue({
      hitRate: 0.75,
      totalHits: 30,
      totalMisses: 10,
      totalEvictions: 5,
    });

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.totalHits).toBe(30);
    expect(result.current.totalMisses).toBe(10);
    expect(result.current.totalEvictions).toBe(5);
  });

  it('should calculate hit rate correctly', () => {
    mockDiscoveryMetrics.getCacheMetrics.mockReturnValue({
      hitRate: 0.7,
      totalHits: 70,
      totalMisses: 30,
      totalEvictions: 0,
    });

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.hitRate).toBe(0.7);
  });

  it('should return list of cached devices', () => {
    const mockDevices = [
      { id: '1', ip: '192.168.1.100', lastSeen: Date.now() },
      { id: '2', ip: '192.168.1.101', lastSeen: Date.now() - 1000 },
    ];

    mockDeviceDiscovery.getCachedDevices.mockReturnValue(mockDevices as any);

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.devices).toBe(mockDevices);
  });

  it('should update cache stats on interval', async () => {
    const { result } = renderHook(() => useCacheStats(1000));

    // Initial call
    expect(mockDeviceDiscovery.getCacheConfig).toHaveBeenCalledTimes(1);

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockDeviceDiscovery.getCacheConfig).toHaveBeenCalledTimes(2);
    expect(mockDeviceDiscovery.getCachedDevices).toHaveBeenCalledTimes(2);
    expect(mockDiscoveryMetrics.getCacheMetrics).toHaveBeenCalledTimes(2);
  });

  it('should handle empty cache gracefully', () => {
    mockDeviceDiscovery.getCacheConfig.mockReturnValue({
      currentSize: 0,
      maxSize: 100,
      ttlMs: 3600000,
    });
    mockDeviceDiscovery.getCachedDevices.mockReturnValue([]);
    mockDiscoveryMetrics.getCacheMetrics.mockReturnValue({
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
    });

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.size).toBe(0);
    expect(result.current.devices).toHaveLength(0);
    expect(result.current.hitRate).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useCacheStats());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should respect custom refresh interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    
    renderHook(() => useCacheStats(2000));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    setIntervalSpy.mockRestore();
  });

  it('should handle errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDeviceDiscovery.getCacheConfig.mockImplementation(() => {
      throw new Error('Cache error');
    });

    const { result } = renderHook(() => useCacheStats());

    expect(result.current.error).toBe('Cache error');
    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[useCacheStats] Error updating cache stats:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});