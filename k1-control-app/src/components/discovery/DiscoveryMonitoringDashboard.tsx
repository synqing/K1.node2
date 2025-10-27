/**
 * Discovery Monitoring Dashboard Component
 * 
 * Provides real-time visualization of:
 * - Live discovery statistics
 * - Method performance charts
 * - Discovery timeline trends
 * - Cache health metrics
 * - Queue configuration display
 */

import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDiscoveryMetrics } from '../../hooks/useDiscoveryMetrics';
import { useCacheStats } from '../../hooks/useCacheStats';
import { useDiscoveryQueueConfigLive } from '../../hooks/useDiscoveryQueueConfig';

export interface DiscoveryMonitoringDashboardProps {
  refreshIntervalMs?: number;
  className?: string;
}

/**
 * Main monitoring dashboard component
 */
export const DiscoveryMonitoringDashboard: React.FC<DiscoveryMonitoringDashboardProps> = ({
  refreshIntervalMs = 1000,
  className = '',
}) => {
  const metrics = useDiscoveryMetrics(refreshIntervalMs);
  const cacheStats = useCacheStats(refreshIntervalMs);
  const queueConfig = useDiscoveryQueueConfigLive(5000); // Less frequent updates

  if (metrics.loading || cacheStats.loading || queueConfig.loading) {
    return (
      <div className={`discovery-monitoring-dashboard ${className}`}>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading discovery metrics...</p>
        </div>
      </div>
    );
  }

  if (metrics.error || cacheStats.error || queueConfig.error) {
    return (
      <div className={`discovery-monitoring-dashboard ${className}`}>
        <div className="error-state">
          <p>Error loading metrics:</p>
          <ul>
            {metrics.error && <li>Metrics: {metrics.error}</li>}
            {cacheStats.error && <li>Cache: {cacheStats.error}</li>}
            {queueConfig.error && <li>Queue: {queueConfig.error}</li>}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`discovery-monitoring-dashboard ${className}`}
      role="main"
      aria-label="Discovery Monitoring Dashboard"
    >
      {/* Panel 1: Live Statistics */}
      <LiveStatisticsPanel 
        metrics={metrics}
        cacheStats={cacheStats}
      />

      {/* Panel 2: Method Performance Chart */}
      <MethodPerformancePanel 
        methodMetrics={metrics.methodMetrics}
      />

      {/* Panel 3: Discovery Timeline Chart */}
      <DiscoveryTimelinePanel 
        history={metrics.history}
      />

      {/* Panel 4: Cache Health Metrics */}
      <CacheHealthPanel 
        cacheStats={cacheStats}
      />

      {/* Panel 5: Queue Configuration */}
      <QueueConfigurationPanel 
        config={queueConfig.config}
        methodStats={queueConfig.methodStats}
      />
    </div>
  );
};

/**
 * Panel 1: Live Statistics Cards
 */
interface LiveStatisticsPanelProps {
  metrics: ReturnType<typeof useDiscoveryMetrics>;
  cacheStats: ReturnType<typeof useCacheStats>;
}

const LiveStatisticsPanel: React.FC<LiveStatisticsPanelProps> = ({ metrics, cacheStats }) => {
  return (
    <section 
      className="panel live-statistics-panel"
      aria-labelledby="live-stats-heading"
    >
      <h3 id="live-stats-heading">Live Statistics</h3>
      <div className="stats-grid" role="group" aria-label="Live statistics cards">
        <div 
          className="stat-card"
          role="img"
          aria-label={`Total discoveries: ${metrics.aggregate.totalDiscoveries.toLocaleString()}`}
        >
          <div 
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
          >
            {metrics.aggregate.totalDiscoveries.toLocaleString()}
          </div>
          <div className="stat-label">Total Discoveries</div>
        </div>
        <div 
          className="stat-card"
          role="img"
          aria-label={`Devices found: ${metrics.aggregate.totalDevicesFound.toLocaleString()}`}
        >
          <div 
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
          >
            {metrics.aggregate.totalDevicesFound.toLocaleString()}
          </div>
          <div className="stat-label">Devices Found</div>
        </div>
        <div 
          className="stat-card"
          role="img"
          aria-label={`Cache size: ${cacheStats.size} of ${cacheStats.maxSize} maximum`}
        >
          <div 
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
          >
            {cacheStats.size}/{cacheStats.maxSize}
          </div>
          <div className="stat-label">Cache Size</div>
          <div 
            className="progress-bar"
            role="progressbar"
            aria-valuenow={cacheStats.size}
            aria-valuemin={0}
            aria-valuemax={cacheStats.maxSize}
            aria-label={`Cache usage: ${cacheStats.size} of ${cacheStats.maxSize}`}
          >
            <div 
              className="progress-fill"
              style={{ width: `${(cacheStats.size / cacheStats.maxSize) * 100}%` }}
            />
          </div>
        </div>
        <div 
          className="stat-card"
          role="img"
          aria-label={`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)} percent`}
        >
          <div 
            className="stat-value"
            aria-live="polite"
            aria-atomic="true"
          >
            {(cacheStats.hitRate * 100).toFixed(1)}%
          </div>
          <div className="stat-label">
            Cache Hit Rate ({cacheStats.totalHits}/{cacheStats.totalHits + cacheStats.totalMisses})
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Panel 2: Method Performance Bar Chart
 */
interface MethodPerformancePanelProps {
  methodMetrics: Map<string, any>;
}

const MethodPerformancePanel: React.FC<MethodPerformancePanelProps> = ({ methodMetrics }) => {
  // Convert Map to array for chart
  const chartData = Array.from(methodMetrics.entries()).map(([method, metrics]) => ({
    method,
    successRate: (metrics.successRate * 100).toFixed(1),
    avgDuration: metrics.avgDurationMs,
    attempts: metrics.attemptCount,
  }));

  return (
    <section 
      className="panel method-performance-panel"
      aria-labelledby="method-performance-heading"
    >
      <h3 id="method-performance-heading">Method Performance</h3>
      {chartData.length > 0 ? (
        <div role="img" aria-label="Bar chart showing discovery method performance by success rate">
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'successRate') return [`${value}%`, 'Success Rate'];
                if (name === 'avgDuration') return [`${value}ms`, 'Avg Duration'];
                return [value, name];
              }}
            />
            <Bar dataKey="successRate" fill="#4CAF50" name="Success Rate (%)" />
            <Bar dataKey="avgDuration" fill="#2196F3" name="Avg Duration (ms)" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data">No method performance data available</div>
      )}
    </div>
  );
};

/**
 * Panel 3: Discovery Timeline Line Chart
 */
interface DiscoveryTimelinePanelProps {
  history: any[];
}

const DiscoveryTimelinePanel: React.FC<DiscoveryTimelinePanelProps> = ({ history }) => {
  // Use last 20 snapshots for timeline
  const timelineData = history.slice(-20).map((snapshot, index) => ({
    time: new Date(snapshot.timestamp).toLocaleTimeString(),
    discoveries: snapshot.totalDiscoveries,
    devices: snapshot.totalDevicesFound,
    avgDevices: snapshot.avgDevicesPerDiscovery,
  }));

  return (
    <div className="panel discovery-timeline-panel">
      <h3>Discovery Timeline</h3>
      {timelineData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="discoveries" 
              stroke="#4CAF50" 
              name="Total Discoveries"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="devices" 
              stroke="#2196F3" 
              name="Total Devices"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data">No timeline data available</div>
      )}
    </div>
  );
};

/**
 * Panel 4: Cache Health Metrics
 */
interface CacheHealthPanelProps {
  cacheStats: ReturnType<typeof useCacheStats>;
}

const CacheHealthPanel: React.FC<CacheHealthPanelProps> = ({ cacheStats }) => {
  const utilizationPercent = (cacheStats.size / cacheStats.maxSize * 100).toFixed(1);
  const ttlHours = (cacheStats.ttlMs / (1000 * 60 * 60)).toFixed(1);

  return (
    <div className="panel cache-health-panel">
      <h3>Cache Health</h3>
      <div className="cache-metrics">
        <div className="metric-row">
          <span className="metric-label">Utilization:</span>
          <span className="metric-value">{utilizationPercent}% ({cacheStats.size}/{cacheStats.maxSize})</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">TTL:</span>
          <span className="metric-value">{ttlHours}h</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Hit Rate:</span>
          <span className="metric-value">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Total Hits:</span>
          <span className="metric-value">{cacheStats.totalHits}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Total Misses:</span>
          <span className="metric-value">{cacheStats.totalMisses}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Evictions:</span>
          <span className="metric-value">{cacheStats.totalEvictions}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Panel 5: Queue Configuration Display
 */
interface QueueConfigurationPanelProps {
  config: any;
  methodStats: any;
}

const QueueConfigurationPanel: React.FC<QueueConfigurationPanelProps> = ({ config, methodStats }) => {
  if (!config) {
    return (
      <div className="panel queue-config-panel">
        <h3>Queue Configuration</h3>
        <div className="no-data">Configuration not available</div>
      </div>
    );
  }

  return (
    <div className="panel queue-config-panel">
      <h3>Queue Configuration</h3>
      <div className="config-section">
        <div className="config-row">
          <span className="config-label">Strategy:</span>
          <span className="config-value strategy-{config.strategy}">{config.strategy}</span>
        </div>
        <div className="config-row">
          <span className="config-label">Default Timeout:</span>
          <span className="config-value">{config.defaultTimeout}ms</span>
        </div>
        <div className="config-row">
          <span className="config-label">Learning:</span>
          <span className="config-value">{config.learningEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div className="methods-section">
        <h4>Method Configuration</h4>
        {config.methods?.map((method: any) => (
          <div key={method.name} className={`method-config ${method.enabled ? 'enabled' : 'disabled'}`}>
            <div className="method-header">
              <span className="method-name">{method.name}</span>
              <span className="method-priority">Priority: {method.priority}</span>
            </div>
            <div className="method-details">
              <span>Timeout: {method.timeout}ms</span>
              <span>Retries: {method.retries}</span>
              <span>Status: {method.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {methodStats?.[method.name] && (
              <div className="method-stats">
                <span>Success Rate: {(methodStats[method.name].successRate * 100).toFixed(1)}%</span>
                <span>Avg Duration: {methodStats[method.name].avgDuration.toFixed(0)}ms</span>
                <span>Attempts: {methodStats[method.name].attemptCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};