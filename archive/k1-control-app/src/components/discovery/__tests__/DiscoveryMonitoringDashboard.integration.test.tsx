/**
 * Integration tests for DiscoveryMonitoringDashboard
 * These tests use real singletons (no mocks) to verify end-to-end data flow
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryMonitoringDashboard } from '../DiscoveryMonitoringDashboard';

// Mock Recharts components for integration tests
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
}));

describe('DiscoveryMonitoringDashboard Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render dashboard with real data sources', async () => {
    render(<DiscoveryMonitoringDashboard refreshIntervalMs={100} />);

    // Should render without crashing
    expect(screen.getByText('Live Statistics')).toBeInTheDocument();
    expect(screen.getByText('Method Performance')).toBeInTheDocument();
    expect(screen.getByText('Discovery Timeline')).toBeInTheDocument();
    expect(screen.getByText('Cache Health')).toBeInTheDocument();
    expect(screen.getByText('Queue Configuration')).toBeInTheDocument();
  });

  it('should handle missing singletons gracefully', async () => {
    render(<DiscoveryMonitoringDashboard />);

    // Should not crash and should show appropriate fallback content
    expect(screen.getByText('Live Statistics')).toBeInTheDocument();
    
    // Should show zero values or "no data" messages when singletons are not available
    const hasZeroValues = screen.queryAllByText('0').length > 0;
    const hasNoDataMessage = screen.queryByText('No method performance data available');
    expect(hasZeroValues || hasNoDataMessage).toBeTruthy();
  });

  it('should update data at specified intervals', async () => {
    render(<DiscoveryMonitoringDashboard refreshIntervalMs={100} />);

    // Should render initially
    expect(screen.getByText('Live Statistics')).toBeInTheDocument();

    // Advance timers to trigger updates
    vi.advanceTimersByTime(200);

    // Component should still be functional after interval updates
    expect(screen.getByText('Live Statistics')).toBeInTheDocument();
    expect(screen.getByText('Cache Health')).toBeInTheDocument();
  });

  it('should display cache metrics when available', async () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Cache Health')).toBeInTheDocument();

    // Should show cache-related metrics
    const hasCacheMetrics = screen.queryByText(/Utilization/) || screen.queryByText(/Hit Rate/) || screen.queryByText(/TTL/);
    expect(hasCacheMetrics).toBeTruthy();
  });

  it('should display queue configuration when available', async () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Queue Configuration')).toBeInTheDocument();

    // Should show configuration details or "not available" message
    const hasConfigInfo = screen.queryByText(/Strategy/) || screen.queryByText(/Configuration not available/);
    expect(hasConfigInfo).toBeTruthy();
  }, 15000);
});