/**
 * Tests for DiscoveryMonitoringDashboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryMonitoringDashboard } from '../DiscoveryMonitoringDashboard';
import { useDiscoveryMetrics } from '../../../hooks/useDiscoveryMetrics';
import { useCacheStats } from '../../../hooks/useCacheStats';
import { useDiscoveryQueueConfigLive } from '../../../hooks/useDiscoveryQueueConfig';

// Mock the hooks
vi.mock('../../../hooks/useDiscoveryMetrics');
vi.mock('../../../hooks/useCacheStats');
vi.mock('../../../hooks/useDiscoveryQueueConfig');

// Mock Recharts components
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

const mockUseDiscoveryMetrics = useDiscoveryMetrics as any;
const mockUseCacheStats = useCacheStats as any;
const mockUseDiscoveryQueueConfigLive = useDiscoveryQueueConfigLive as any;

describe('DiscoveryMonitoringDashboard', () => {
  const defaultMetrics = {
    methodMetrics: new Map([
      ['mdns', { successRate: 0.9, avgDurationMs: 1200, attemptCount: 10 }],
      ['scan', { successRate: 0.6, avgDurationMs: 4500, attemptCount: 8 }],
    ]),
    history: [
      { timestamp: Date.now() - 2000, totalDiscoveries: 3, totalDevicesFound: 2 },
      { timestamp: Date.now() - 1000, totalDiscoveries: 4, totalDevicesFound: 2 },
      { timestamp: Date.now(), totalDiscoveries: 5, totalDevicesFound: 3 },
    ],
    snapshot: { timestamp: Date.now(), totalDiscoveries: 5, totalDevicesFound: 3 },
    aggregate: {
      totalDiscoveries: 15,
      totalDevicesFound: 8,
      avgDevicesPerDiscovery: 0.53,
    },
    loading: false,
    error: null,
  };

  const defaultCacheStats = {
    size: 25,
    maxSize: 100,
    ttlMs: 3600000,
    devices: [],
    hitRate: 0.75,
    totalHits: 30,
    totalMisses: 10,
    totalEvictions: 5,
    loading: false,
    error: null,
  };

  const defaultQueueConfig = {
    config: {
      strategy: 'hybrid' as const,
      defaultTimeout: 5000,
      learningEnabled: true,
      methods: [
        { name: 'mdns', priority: 9, timeout: 3000, retries: 1, enabled: true },
        { name: 'scan', priority: 5, timeout: 5000, retries: 0, enabled: true },
      ],
    },
    methodStats: {
      mdns: { successRate: 0.9, avgDuration: 1200, attemptCount: 10 },
      scan: { successRate: 0.6, avgDuration: 4500, attemptCount: 8 },
    },
    loading: false,
    error: null,
  };

  beforeEach(() => {
    mockUseDiscoveryMetrics.mockReturnValue(defaultMetrics);
    mockUseCacheStats.mockReturnValue(defaultCacheStats);
    mockUseDiscoveryQueueConfigLive.mockReturnValue(defaultQueueConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render all 5 panels without errors', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Live Statistics')).toBeInTheDocument();
    expect(screen.getByText('Method Performance')).toBeInTheDocument();
    expect(screen.getByText('Discovery Timeline')).toBeInTheDocument();
    expect(screen.getByText('Cache Health')).toBeInTheDocument();
    expect(screen.getByText('Queue Configuration')).toBeInTheDocument();
  });

  it('should display live statistics cards', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('15')).toBeInTheDocument(); // Total Discoveries
    expect(screen.getByText('8')).toBeInTheDocument(); // Devices Found
    expect(screen.getByText('25/100')).toBeInTheDocument(); // Cache Size
    expect(screen.getAllByText('75.0%')).toHaveLength(2); // Cache Hit Rate (appears in both panels)
  });

  it('should display charts without errors', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
  });

  it('should show correct totalDiscoveries count', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Total Discoveries')).toBeInTheDocument();
  });

  it('should show correct cache size/max size', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('25/100')).toBeInTheDocument();
    expect(screen.getByText('Cache Size')).toBeInTheDocument();
  });

  it('should show hit rate percentage', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getAllByText('75.0%')).toHaveLength(2); // Appears in both live stats and cache health
    expect(screen.getByText(/Cache Hit Rate/)).toBeInTheDocument();
  });

  it('should show method names with priorities', () => {
    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('mdns')).toBeInTheDocument();
    expect(screen.getByText('scan')).toBeInTheDocument();
    expect(screen.getByText('Priority: 9')).toBeInTheDocument();
    expect(screen.getByText('Priority: 5')).toBeInTheDocument();
  });

  it('should render BarChart with method data', () => {
    render(<DiscoveryMonitoringDashboard />);

    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toBeInTheDocument();
    
    // Should have bars for the chart
    expect(screen.getAllByTestId('bar')).toHaveLength(2); // Success rate and avg duration bars
  });

  it('should render LineChart with timeline data', () => {
    render(<DiscoveryMonitoringDashboard />);

    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();
    
    // Should have lines for the chart
    expect(screen.getAllByTestId('line')).toHaveLength(2); // Discoveries and devices lines
  });

  it('should display loading state', () => {
    mockUseDiscoveryMetrics.mockReturnValue({ ...defaultMetrics, loading: true });

    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Loading discovery metrics...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    mockUseDiscoveryMetrics.mockReturnValue({ ...defaultMetrics, error: 'Test error' });

    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Error loading metrics:')).toBeInTheDocument();
    expect(screen.getByText('Metrics: Test error')).toBeInTheDocument();
  });

  it('should handle empty method metrics', () => {
    mockUseDiscoveryMetrics.mockReturnValue({
      ...defaultMetrics,
      methodMetrics: new Map(),
    });

    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('No method performance data available')).toBeInTheDocument();
  });

  it('should handle empty timeline data', () => {
    mockUseDiscoveryMetrics.mockReturnValue({
      ...defaultMetrics,
      history: [],
    });

    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('No timeline data available')).toBeInTheDocument();
  });

  it('should handle missing queue configuration', () => {
    mockUseDiscoveryQueueConfigLive.mockReturnValue({
      ...defaultQueueConfig,
      config: null,
    });

    render(<DiscoveryMonitoringDashboard />);

    expect(screen.getByText('Configuration not available')).toBeInTheDocument();
  });

  it('should pass refresh interval to hooks', () => {
    render(<DiscoveryMonitoringDashboard refreshIntervalMs={2000} />);

    expect(mockUseDiscoveryMetrics).toHaveBeenCalledWith(2000);
    expect(mockUseCacheStats).toHaveBeenCalledWith(2000);
    expect(mockUseDiscoveryQueueConfigLive).toHaveBeenCalledWith(5000); // Fixed interval for config
  });

  it('should apply custom className', () => {
    const { container } = render(<DiscoveryMonitoringDashboard className="custom-class" />);

    expect(container.firstChild).toHaveClass('discovery-monitoring-dashboard');
    expect(container.firstChild).toHaveClass('custom-class');
  });
});