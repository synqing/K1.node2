/**
 * Tests for useDiscoveryMetrics hook
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDiscoveryMetrics } from '../useDiscoveryMetrics';
import { discoveryMetrics } from '../../services/discovery-metrics';

// Mock the discovery metrics singleton
vi.mock('../../services/discovery-metrics', () => ({
  discoveryMetrics: {
    getMethodMetrics: vi.fn(),
    getSnapshots: vi.fn(),
    getTotalStats: vi.fn(),
  },
}));

const mockDiscoveryMetrics = discoveryMetrics as any;

describe('useDiscoveryMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock implementations
    mockDiscoveryMetrics.getMethodMetrics.mockReturnValue(new Map());
    mockDiscoveryMetrics.getSnapshots.mockReturnValue([]);
    mockDiscoveryMetrics.getTotalStats.mockReturnValue({
      totalDiscoveries: 0,
      totalDevicesFound: 0,
      avgDevicesPerDiscovery: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial metrics structure', () => {
    const { result } = renderHook(() => useDiscoveryMetrics());

    expect(result.current).toEqual({
      methodMetrics: expect.any(Map),
      history: expect.any(Array),
      snapshot: null,
      aggregate: {
        totalDiscoveries: 0,
        totalDevicesFound: 0,
        avgDevicesPerDiscovery: 0,
      },
      loading: false,
      error: null,
    });
  });

  it('should update metrics at specified interval', async () => {
    const mockMethodMetrics = new Map([
      ['mdns', { successRate: 0.9, avgDurationMs: 1200, attemptCount: 10 }],
    ]);
    const mockSnapshots = [
      { timestamp: Date.now(), totalDiscoveries: 5, totalDevicesFound: 3 },
    ];
    const mockTotalStats = {
      totalDiscoveries: 5,
      totalDevicesFound: 3,
      avgDevicesPerDiscovery: 0.6,
    };

    mockDiscoveryMetrics.getMethodMetrics.mockReturnValue(mockMethodMetrics);
    mockDiscoveryMetrics.getSnapshots.mockReturnValue(mockSnapshots);
    mockDiscoveryMetrics.getTotalStats.mockReturnValue(mockTotalStats);

    const { result } = renderHook(() => useDiscoveryMetrics(1000));

    // Initial call
    expect(mockDiscoveryMetrics.getMethodMetrics).toHaveBeenCalledTimes(1);

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockDiscoveryMetrics.getMethodMetrics).toHaveBeenCalledTimes(2);
    expect(result.current.methodMetrics).toBe(mockMethodMetrics);
    expect(result.current.history).toBe(mockSnapshots);
    expect(result.current.aggregate).toEqual(mockTotalStats);
  });

  it('should aggregate method metrics correctly', () => {
    const mockTotalStats = {
      totalDiscoveries: 15,
      totalDevicesFound: 8,
      avgDevicesPerDiscovery: 0.53,
    };

    mockDiscoveryMetrics.getTotalStats.mockReturnValue(mockTotalStats);

    const { result } = renderHook(() => useDiscoveryMetrics());

    expect(result.current.aggregate).toEqual({
      totalDiscoveries: 15,
      totalDevicesFound: 8,
      avgDevicesPerDiscovery: 0.53,
    });
  });

  it('should include snapshot history', () => {
    const mockSnapshots = [
      { timestamp: Date.now() - 2000, totalDiscoveries: 3, totalDevicesFound: 2 },
      { timestamp: Date.now() - 1000, totalDiscoveries: 4, totalDevicesFound: 2 },
      { timestamp: Date.now(), totalDiscoveries: 5, totalDevicesFound: 3 },
    ];

    mockDiscoveryMetrics.getSnapshots.mockReturnValue(mockSnapshots);

    const { result } = renderHook(() => useDiscoveryMetrics());

    expect(result.current.history).toBe(mockSnapshots);
    expect(result.current.snapshot).toBe(mockSnapshots[2]); // Latest snapshot
  });

  it('should handle empty metrics gracefully', () => {
    mockDiscoveryMetrics.getMethodMetrics.mockReturnValue(new Map());
    mockDiscoveryMetrics.getSnapshots.mockReturnValue([]);
    mockDiscoveryMetrics.getTotalStats.mockReturnValue({
      totalDiscoveries: 0,
      totalDevicesFound: 0,
      avgDevicesPerDiscovery: 0,
    });

    const { result } = renderHook(() => useDiscoveryMetrics());

    expect(result.current.methodMetrics.size).toBe(0);
    expect(result.current.history).toHaveLength(0);
    expect(result.current.snapshot).toBeNull();
    expect(result.current.aggregate.totalDiscoveries).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useDiscoveryMetrics());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should respect custom refresh interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    
    renderHook(() => useDiscoveryMetrics(2000));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    setIntervalSpy.mockRestore();
  });

  it('should set loading state correctly', () => {
    const { result } = renderHook(() => useDiscoveryMetrics());

    // Should not be loading after initial update
    expect(result.current.loading).toBe(false);
  });

  it('should handle errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDiscoveryMetrics.getMethodMetrics.mockImplementation(() => {
      throw new Error('Test error');
    });

    const { result } = renderHook(() => useDiscoveryMetrics());

    expect(result.current.error).toBe('Test error');
    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[useDiscoveryMetrics] Error updating metrics:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});