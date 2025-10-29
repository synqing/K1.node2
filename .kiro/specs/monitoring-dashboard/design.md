# Design Document

## Overview

The Monitoring Dashboard is a React-based visualization system that provides real-time insights into device discovery operations. It consists of three custom React hooks for data access and a main dashboard component with five distinct panels. The system operates entirely on local data from singleton services, requiring zero network calls and minimal memory overhead.

**Key Design Principles:**
- Polling-based updates (1-second interval) for simplicity over event subscriptions
- Separation of concerns: hooks handle data access, component handles presentation
- Responsive-first design with mobile and desktop layouts
- Performance-optimized with <100ms initial render and <50ms re-renders
- Graceful degradation when metrics are unavailable

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                     DebugHUD Component                   │
│  ┌────────────┬────────────┬──────────────────────┐    │
│  │Performance │ Transport  │ Discovery (NEW)      │    │
│  │    Tab     │    Tab     │       Tab            │    │
│  └────────────┴────────────┴──────────────────────┘    │
│                                  │                       │
│                                  ▼                       │
│                    ┌──────────────────────────┐         │
│                    │ DiscoveryMonitoring      │         │
│                    │      Dashboard           │         │
│                    └──────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌────────────────────────────────────────────────────────┐
│         DiscoveryMonitoringDashboard (React FC)        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  useDiscoveryMetrics(1000ms)                          │
│    ├─→ Panel 1: Live Statistics (aggregate)           │
│    ├─→ Panel 2: Method Performance Chart              │
│    └─→ Panel 3: Discovery Timeline Chart              │
│                                                        │
│  useCacheStats(1000ms)                                │
│    ├─→ Panel 1: Live Statistics (cache size)          │
│    └─→ Panel 4: Cache Health Metrics                  │
│                                                        │
│  useDiscoveryQueueConfig()                            │
│    └─→ Panel 5: Queue Configuration Display           │
│                                                        │
└────────────────────────────────────────────────────────┘
                         │
                         │ (polls every 1s)
                         ▼
┌────────────────────────────────────────────────────────┐
│              discoveryMetrics (Singleton)              │
│  - methodMetrics: Map<string, DiscoveryMethodMetrics>  │
│  - snapshots: DiscoveryMetricsSnapshot[]               │
│  - cacheStats: { hits, misses, evictions }             │
└────────────────────────────────────────────────────────┘
                         │
                         │ (reads from)
                         ▼
┌────────────────────────────────────────────────────────┐
│           device-discovery (Singleton)                 │
│  - getCachedDevices()                                  │
│  - getCacheConfig()                                    │
│  - getDiscoveryQueueConfig()                           │
└────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Custom React Hooks

#### Hook 1: useDiscoveryMetrics

**Purpose:** Provides real-time access to discovery metrics with automatic polling

**Interface:**
```typescript
interface DiscoveryMetricsHook {
  methodMetrics: Map<string, DiscoveryMethodMetrics>;
  history: DiscoveryMetricsSnapshot[];
  snapshot: DiscoveryMetricsSnapshot | null;
  aggregate: {
    totalDiscoveries: number;
    totalDevicesFound: number;
    avgDevicesPerDiscovery: number;
  };
  loading: boolean;
  error: string | null;
}

function useDiscoveryMetrics(refreshMs: number = 1000): DiscoveryMetricsHook
```

**Implementation Strategy:**
1. Use `useState` to store metrics data
2. Use `useEffect` with `setInterval` for polling
3. On each interval: fetch from discoveryMetrics singleton, update state
4. Cleanup interval on unmount to prevent memory leaks
5. Calculate aggregate statistics from method metrics

**Performance Considerations:**
- Polling interval configurable (default 1000ms)
- State updates batched by React
- Only update state if data has changed (shallow comparison)

#### Hook 2: useCacheStats

**Purpose:** Provides real-time cache performance metrics

**Interface:**
```typescript
interface CacheStatsHook {
  size: number;
  maxSize: number;
  ttlMs: number;
  devices: NormalizedDevice[];
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  loading: boolean;
}

function useCacheStats(refreshMs: number = 1000): CacheStatsHook
```

**Implementation Strategy:**
1. Poll device-discovery singleton for cache config and devices
2. Poll discoveryMetrics singleton for hit/miss/eviction counts
3. Calculate hit rate: `hits / (hits + misses)` with division-by-zero protection
4. Update state on interval

#### Hook 3: useDiscoveryQueueConfig

**Purpose:** Provides current queue configuration (non-polling)

**Interface:**
```typescript
interface DiscoveryQueueConfig {
  strategy: 'sequential' | 'race' | 'hybrid';
  methods: {
    [methodName: string]: {
      name: string;
      priority: number;
      timeout: number;
      retries: number;
      enabled: boolean;
    };
  };
}

function useDiscoveryQueueConfig(): DiscoveryQueueConfig | null
```

**Implementation Strategy:**
1. Fetch once on mount (no polling - config rarely changes)
2. Use `useEffect` with empty dependency array
3. Call `getDiscoveryQueueConfig()` on device-discovery singleton
4. Return null if config unavailable

### Dashboard Component

#### Component Structure

```typescript
interface DiscoveryMonitoringDashboardProps {
  refreshIntervalMs?: number;  // Default: 1000
}

export const DiscoveryMonitoringDashboard: React.FC<
  DiscoveryMonitoringDashboardProps
>
```

**Component Hierarchy:**
```
DiscoveryMonitoringDashboard
├── Panel 1: Live Statistics (Grid of 4 cards)
│   ├── Card: Total Discoveries
│   ├── Card: Devices Found
│   ├── Card: Cache Size (with progress bar)
│   └── Card: Cache Hit Rate (with gauge)
├── Panel 2: Method Performance Chart (Recharts BarChart)
├── Panel 3: Discovery Timeline Chart (Recharts LineChart)
├── Panel 4: Cache Health Metrics (List)
└── Panel 5: Queue Configuration Display (Structured data)
```

#### Panel Specifications

**Panel 1: Live Statistics**
- Layout: 4-column grid (responsive: 2x2 on tablet, 1x4 on mobile)
- Data sources: useDiscoveryMetrics().aggregate, useCacheStats()
- Visual elements: Large numbers (48px+), progress bars, percentage gauges
- Update frequency: 1 second

**Panel 2: Method Performance Chart**
- Chart type: Recharts BarChart
- X-axis: Method names (mDNS, Scan, etc.)
- Y-axis: Success rate (0-100%)
- Bar colors: Green (>80%), Yellow (50-80%), Red (<50%)
- Tooltip: Success rate, avg duration, attempt count
- Data source: useDiscoveryMetrics().methodMetrics

**Panel 3: Discovery Timeline Chart**
- Chart type: Recharts LineChart (dual Y-axis)
- Left Y-axis: Duration in seconds (0-10s)
- Right Y-axis: Devices found (0-20)
- X-axis: Time (last 20 snapshots)
- Lines: Duration (blue), Devices Found (orange)
- Data source: useDiscoveryMetrics().history

**Panel 4: Cache Health Metrics**
- Layout: Key-value list
- Metrics: Hits, Misses, Evictions, Hit Rate
- Conditional styling: Green if hit rate >80%, Yellow if <60%
- Data source: useCacheStats()

**Panel 5: Queue Configuration Display**
- Layout: Structured text with badges
- Content: Strategy, method priorities, timeouts, retries
- Visual indicators: Strategy badge, priority bars, enabled checkmarks
- Data source: useDiscoveryQueueConfig()

## Data Models

### DiscoveryMethodMetrics

```typescript
interface DiscoveryMethodMetrics {
  methodName: string;
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  successRate: number;
  avgDurationMs: number;
  lastUsedTimestamp: number;
}
```

### DiscoveryMetricsSnapshot

```typescript
interface DiscoveryMetricsSnapshot {
  timestamp: number;
  durationMs: number;
  devicesFound: number;
  methodsUsed: string[];
  success: boolean;
}
```

### CacheMetrics

```typescript
interface CacheMetrics {
  size: number;
  maxSize: number;
  ttlMs: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  hitRate: number;
}
```

## Error Handling

### Error Scenarios and Responses

| Error Scenario | Detection | Response |
|----------------|-----------|----------|
| Metrics singleton unavailable | Hook returns null/undefined | Display "No data available" message |
| Hook update fails | Exception in interval callback | Log error, maintain last known state |
| Singleton method missing | Method call throws | Graceful null check, hide affected panel |
| Chart rendering error | Recharts throws exception | Fallback to text-based display |
| Division by zero (hit rate) | hits + misses = 0 | Return 0% hit rate |
| Empty metrics history | history.length === 0 | Display "Collecting data..." message |

### Error Handling Patterns

**Hook Level:**
```typescript
try {
  const metrics = discoveryMetrics.getMethodMetrics();
  setState(metrics);
} catch (error) {
  console.error('Failed to fetch metrics:', error);
  setError(error.message);
}
```

**Component Level:**
```typescript
if (metricsHook.error) {
  return <ErrorMessage>Unable to load metrics</ErrorMessage>;
}

if (metricsHook.loading) {
  return <LoadingSpinner />;
}
```

## Testing Strategy

### Unit Tests (Hooks)

**useDiscoveryMetrics Tests (8 tests):**
1. Returns initial metrics structure
2. Updates metrics at specified interval
3. Aggregates method metrics correctly
4. Includes snapshot history
5. Handles empty metrics gracefully
6. Cleans up interval on unmount
7. Respects custom refresh interval
8. Sets loading state correctly

**useCacheStats Tests (6 tests):**
1. Returns cache size and max size
2. Includes hit/miss/eviction counts
3. Calculates hit rate correctly
4. Returns list of cached devices
5. Updates cache stats on interval
6. Handles empty cache gracefully

**useDiscoveryQueueConfig Tests (4 tests):**
1. Fetches config on mount
2. Returns null if config unavailable
3. Includes strategy and methods
4. Does not re-fetch on re-render

### Component Tests (12+ tests)

**Rendering Tests:**
- Renders all 5 panels without errors
- Displays live statistics cards
- Displays charts without errors

**Data Display Tests:**
- Shows correct totalDiscoveries count
- Shows correct cache size/max size
- Shows hit rate percentage
- Shows method names with priorities

**Chart Tests:**
- BarChart renders with method data
- LineChart renders with timeline data

**Update Tests:**
- Live stats update at interval
- Charts update with new snapshots

**Responsive Tests:**
- Panels stack on mobile, grid on desktop

### Integration Tests (3 scenarios)

**Scenario 1: Dashboard with active discoveries**
- Start multiple discoveries
- Verify totalDiscoveries increases
- Verify method success rates display
- Verify charts update in real-time

**Scenario 2: Dashboard with cache activity**
- Perform discoveries to generate cache hits
- Verify hit rate calculation
- Verify cache stats panel accuracy

**Scenario 3: Dashboard with queue configuration**
- Change discovery strategy
- Verify dashboard reflects new strategy
- Verify method priorities display correctly

### Performance Tests

**Metrics:**
- Initial render: <100ms (measured with React Profiler)
- Re-render on update: <50ms
- Hook update: <10ms
- Memory usage: <100KB (measured with Chrome DevTools)

## Integration Points

### DebugHUD Integration

**File:** `src/components/debug/DebugHUD.tsx`

**Changes Required:**
1. Import DiscoveryMonitoringDashboard component
2. Add "Discovery" tab to Tabs.List
3. Add Tabs.Content with dashboard component
4. Pass refreshIntervalMs prop (default 1000)

**Integration Code:**
```typescript
import { DiscoveryMonitoringDashboard } from '../discovery/DiscoveryMonitoringDashboard';

// In render:
<Tabs.Trigger value="discovery">Discovery</Tabs.Trigger>

<Tabs.Content value="discovery">
  <DiscoveryMonitoringDashboard refreshIntervalMs={1000} />
</Tabs.Content>
```

### Recharts Library

**Installation:**
```bash
npm install recharts
```

**Components Used:**
- BarChart, Bar
- LineChart, Line
- XAxis, YAxis
- CartesianGrid
- Tooltip, Legend
- ResponsiveContainer

**Configuration:**
- All charts wrapped in ResponsiveContainer for responsive sizing
- Custom colors for bars based on success rate thresholds
- Dual Y-axis for timeline chart
- Custom tooltip formatters for readable data display

## Performance Optimization

### Rendering Optimization

1. **Memoization:** Use React.memo for panel components to prevent unnecessary re-renders
2. **Shallow Comparison:** Only update state if data has actually changed
3. **Batched Updates:** React automatically batches state updates within event handlers
4. **Lazy Loading:** Charts only render when tab is active

### Memory Management

1. **Interval Cleanup:** Always clear intervals in useEffect cleanup
2. **History Limiting:** Keep only last 20 snapshots in memory (~10KB)
3. **Singleton Pattern:** Reuse existing metrics singletons, no duplication
4. **Component Unmount:** Release all references when component unmounts

### CPU Usage

**Refresh Cycle Analysis:**
```
Per 1-second cycle:
- Hook polling: ~10ms (3 hooks)
- State updates: ~5ms (React batching)
- Component re-render: ~50ms
- Total: ~65ms per 1000ms = 6.5% CPU
```

**Optimization Strategies:**
- Configurable refresh interval (can increase to 2000ms if needed)
- Skip updates when tab is not active (future enhancement)
- Throttle chart re-renders using shouldComponentUpdate

## Accessibility

### ARIA Labels

- All charts have aria-label attributes
- Statistics cards have aria-live="polite" for screen reader updates
- Interactive elements have proper focus indicators

### Keyboard Navigation

- All interactive elements accessible via Tab key
- Chart tooltips accessible via keyboard
- Focus management within modal/panel contexts

### Color Contrast

- All text meets WCAG 2.1 AA contrast requirements (4.5:1)
- Color is not the only indicator (use icons + text)
- Success/warning/error states have multiple visual cues

## Future Enhancements

1. **Export Functionality:** Export metrics data as CSV/JSON
2. **Custom Time Ranges:** Allow user to select time range for timeline chart
3. **Alert Thresholds:** Configure alerts for low hit rates or high failure rates
4. **Panel Customization:** Allow users to show/hide specific panels
5. **Real-time Subscriptions:** Replace polling with event-based updates
6. **Historical Data:** Store and display metrics over longer time periods
7. **Comparison Mode:** Compare metrics across different time periods
8. **Graph Metrics Integration:** Display libgraph metrics alongside discovery metrics
