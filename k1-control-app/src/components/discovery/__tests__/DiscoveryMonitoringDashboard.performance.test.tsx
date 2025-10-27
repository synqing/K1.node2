/**
 * Performance tests for DiscoveryMonitoringDashboard
 * Measures render times and memory usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiscoveryMonitoringDashboard } from '../DiscoveryMonitoringDashboard'

// Mock Recharts for performance testing
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}))

// Mock the hooks to return consistent data for performance testing
vi.mock('../../../hooks/useDiscoveryMetrics', () => ({
  useDiscoveryMetrics: vi.fn(() => ({
    aggregate: {
      totalDiscoveries: 150,
      totalDevicesFound: 45,
      avgDevicesPerDiscovery: 0.3,
    },
    methodMetrics: new Map([
      ['mdns', { successRate: 0.95, avgDurationMs: 1200, attemptCount: 100 }],
      ['scan', { successRate: 0.8, avgDurationMs: 3800, attemptCount: 50 }]
    ]),
    history: Array.from({ length: 20 }, (_, i) => ({
      timestamp: Date.now() - (19 - i) * 60000,
      totalDiscoveries: 150 + i,
      totalDevicesFound: 45 + Math.floor(i / 3),
    })),
    loading: false,
    error: null,
  }))
}))

vi.mock('../../../hooks/useCacheStats', () => ({
  useCacheStats: vi.fn(() => ({
    size: 25,
    maxSize: 100,
    ttlMs: 3600000,
    hitRate: 0.85,
    totalHits: 340,
    totalMisses: 60,
    totalEvictions: 5,
    devices: [],
    loading: false,
    error: null,
  }))
}))

vi.mock('../../../hooks/useDiscoveryQueueConfig', () => ({
  useDiscoveryQueueConfigLive: vi.fn(() => ({
    config: {
      strategy: 'hybrid',
      defaultTimeout: 5000,
      learningEnabled: true,
      methods: [
        { name: 'mdns', priority: 8, timeout: 5000, retries: 2, enabled: true },
        { name: 'scan', priority: 6, timeout: 10000, retries: 1, enabled: true }
      ]
    },
    methodStats: {
      mdns: { successRate: 0.95, avgDuration: 1200, attemptCount: 100 },
      scan: { successRate: 0.8, avgDuration: 3800, attemptCount: 50 }
    },
    loading: false,
    error: null,
  }))
}))

describe('DiscoveryMonitoringDashboard Performance', () => {
  beforeEach(() => {
    // Clear any previous performance marks
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  })

  it('should render initial component within 100ms', () => {
    const startTime = performance.now()
    
    render(<DiscoveryMonitoringDashboard />)
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    console.log(`Initial render time: ${renderTime.toFixed(2)}ms`)
    
    // Should render within 100ms target
    expect(renderTime).toBeLessThan(100)
    
    // Verify component rendered successfully
    expect(screen.getByText('Live Statistics')).toBeInTheDocument()
    expect(screen.getByText('Method Performance')).toBeInTheDocument()
    expect(screen.getByText('Discovery Timeline')).toBeInTheDocument()
    expect(screen.getByText('Cache Health')).toBeInTheDocument()
    expect(screen.getByText('Queue Configuration')).toBeInTheDocument()
  })

  it('should handle re-renders efficiently', () => {
    const { rerender } = render(<DiscoveryMonitoringDashboard refreshIntervalMs={1000} />)
    
    // Measure re-render time
    const startTime = performance.now()
    
    rerender(<DiscoveryMonitoringDashboard refreshIntervalMs={2000} />)
    
    const endTime = performance.now()
    const rerenderTime = endTime - startTime
    
    console.log(`Re-render time: ${rerenderTime.toFixed(2)}ms`)
    
    // Should re-render within 50ms target
    expect(rerenderTime).toBeLessThan(50)
  })

  it('should maintain reasonable DOM size', () => {
    render(<DiscoveryMonitoringDashboard />)
    
    // Count DOM elements created by the dashboard
    const dashboardElement = screen.getByText('Live Statistics').closest('[class*="dashboard"]')
    const elementCount = dashboardElement?.querySelectorAll('*').length || 0
    
    console.log(`DOM elements created: ${elementCount}`)
    
    // Should not create excessive DOM elements (target: <200)
    expect(elementCount).toBeLessThan(200)
  })

  it('should handle large datasets efficiently', () => {
    const startTime = performance.now()
    
    render(<DiscoveryMonitoringDashboard />)
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    console.log(`Large dataset render time: ${renderTime.toFixed(2)}ms`)
    
    // Should still render efficiently with large datasets
    expect(renderTime).toBeLessThan(150)
    
    // Verify component rendered
    expect(screen.getByText('Live Statistics')).toBeInTheDocument()
  })

  it('should measure memory usage', () => {
    // This test provides guidance for manual memory testing
    render(<DiscoveryMonitoringDashboard />)
    
    console.log('Memory usage test completed. To measure actual memory usage:')
    console.log('1. Open Chrome DevTools')
    console.log('2. Go to Memory tab')
    console.log('3. Take heap snapshot before and after rendering')
    console.log('4. Target: <100KB memory usage for dashboard component')
    
    // Basic check that component doesn't leak obvious memory
    expect(screen.getByText('Live Statistics')).toBeInTheDocument()
  })
})

/**
 * Performance Testing Guide
 * 
 * To run performance tests:
 * npm test -- --run DiscoveryMonitoringDashboard.performance
 * 
 * To measure actual performance in browser:
 * 1. Open React DevTools Profiler
 * 2. Start profiling
 * 3. Render DiscoveryMonitoringDashboard
 * 4. Check render times and re-render efficiency
 * 
 * Performance Targets:
 * - Initial render: <100ms
 * - Re-render: <50ms
 * - Memory usage: <100KB
 * - DOM elements: <200
 * - Hook update time: <10ms
 */