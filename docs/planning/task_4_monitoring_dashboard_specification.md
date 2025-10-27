<!-- markdownlint-disable MD013 -->

# Task 4: Monitoring Dashboard Specification

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Formal specification for real-time device discovery metrics visualization dashboard

---

## 1. Executive Summary

Build a comprehensive monitoring dashboard component displaying real-time discovery metrics:
- Live statistics panels (discovery count, devices found, cache stats)
- Method performance charts (success rates per method over time)
- Discovery timeline visualization (duration vs devices found trends)
- Cache health metrics (hits/misses/evictions)
- Queue configuration display (current strategy and method priorities)

**Technology Stack:**
- React functional components with TypeScript
- Custom React hooks for data binding
- Recharts library for visualizations
- 1-second refresh interval for real-time updates
- Integration into existing DebugHUD component

**Key Features:**
- Zero external API calls (uses local metrics singleton)
- Auto-updating every 1 second
- Responsive layout (mobile-friendly)
- No performance impact on discovery operations

---

## 2. Functional Requirements

### 2.1 React Hooks (Custom Data Binding)

#### Hook 1: useDiscoveryMetrics

**File Location:** `src/hooks/useDiscoveryMetrics.ts`

```typescript
export function useDiscoveryMetrics(refreshMs: number = 1000) {
  /**
   * Purpose: Bind React component to discovery metrics in real time
   *
   * Inputs:
   *   - refreshMs: number (update interval in ms, default 1000)
   *
   * Returns: DiscoveryMetricsHook
   *   {
   *     methodMetrics: Map<string, DiscoveryMethodMetrics>,
   *     history: DiscoveryMetricsSnapshot[],
   *     snapshot: DiscoveryMetricsSnapshot | null,
   *     aggregate: {
   *       totalDiscoveries: number,
   *       totalDevicesFound: number,
   *       avgDevicesPerDiscovery: number
   *     },
   *     loading: boolean,
   *     error: string | null
   *   }
   *
   * Implementation:
   *   1. useState for metrics data
   *   2. useEffect hook with setInterval
   *   3. Interval callback:
   *      - Get discoveryMetrics singleton
   *      - Extract methods, snapshots, stats
   *      - Update state (triggers re-render)
   *   4. Cleanup: clearInterval on unmount
   *
   * Performance:
   *   - Poll interval: 1 second (configurable)
   *   - No subscriptions (polling is simpler)
   *   - Minimal state updates (only on data change)
   *
   * Error Handling:
   *   - If metrics not available: set error state
   *   - If extraction fails: log and continue
   */
}
```

#### Hook 2: useCacheStats

**File Location:** `src/hooks/useCacheStats.ts`

```typescript
export function useCacheStats(refreshMs: number = 1000) {
  /**
   * Purpose: Bind React component to cache metrics
   *
   * Inputs:
   *   - refreshMs: number (update interval, default 1000)
   *
   * Returns: CacheStatsHook
   *   {
   *     size: number,
   *     maxSize: number,
   *     ttlMs: number,
   *     devices: NormalizedDevice[],
   *     hitRate: number,
   *     totalHits: number,
   *     totalMisses: number,
   *     totalEvictions: number,
   *     loading: boolean
   *   }
   *
   * Implementation:
   *   1. useState for cache metrics
   *   2. useEffect with setInterval
   *   3. Callback queries device-discovery singleton:
   *      - getCachedDevices()
   *      - getCacheConfig()
   *      - getCacheMetrics() from discoveryMetrics
   *   4. Update state
   *   5. Cleanup interval
   *
   * Data Sources:
   *   - device-discovery instance: cache size, devices
   *   - discoveryMetrics: hit/miss/eviction stats
   */
}
```

#### Hook 3: useDiscoveryQueueConfig

**File Location:** `src/hooks/useDiscoveryQueueConfig.ts`

```typescript
export function useDiscoveryQueueConfig() {
  /**
   * Purpose: Get current discovery queue configuration
   *
   * Returns: DiscoveryQueueConfig | null
   *   {
   *     strategy: 'sequential' | 'race' | 'hybrid',
   *     methods: {
   *       mdns: { name, priority, timeout, retries, enabled },
   *       scan: { name, priority, timeout, retries, enabled }
   *     }
   *   }
   *
   * Implementation:
   *   1. useState for config (nullable)
   *   2. useEffect runs once on mount
   *   3. Get device-discovery singleton
   *   4. Call getDiscoveryQueueConfig()
   *   5. Set state with result
   *   6. No polling (config rarely changes)
   *
   * Use Case:
   *   - Display current strategy
   *   - Show method priorities
   *   - Enable/disable methods (future)
   */
}
```

### 2.2 Dashboard Component: DiscoveryMonitoringDashboard

**File Location:** `src/components/discovery/DiscoveryMonitoringDashboard.tsx`

**Component Type:** React FC with TypeScript

```typescript
interface DiscoveryMonitoringDashboardProps {
  refreshIntervalMs?: number;  // Default: 1000
}

export const DiscoveryMonitoringDashboard: React.FC<
  DiscoveryMonitoringDashboardProps
> = ({ refreshIntervalMs = 1000 }) => {
  // Component implementation
}
```

#### 2.2.1 Panel 1: Live Statistics

**Purpose:** Display aggregate discovery metrics

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Live Statistics                             │
├─────────────────────────────────────────────┤
│  Total Discoveries  │  Devices Found        │
│  42                 │  15                   │
├─────────────────────────────────────────────┤
│  Cache Size         │  Cache Hit Rate       │
│  12/100             │  78% (42/54)          │
└─────────────────────────────────────────────┘
```

**Card Content:**
- Card 1: totalDiscoveries count (large number)
- Card 2: totalDevicesFound count (large number)
- Card 3: `${cacheSize}/${maxSize}` with progress bar
- Card 4: `${hitRate.toFixed(0)}%` with gauge

**Data Sources:**
- useDiscoveryMetrics().aggregate.totalDiscoveries
- useDiscoveryMetrics().aggregate.totalDevicesFound
- useCacheStats().size, maxSize
- useCacheStats().hitRate

**Styling:**
- 4-column grid layout
- Card background: subtle border + shadow
- Large font for metrics (48px+)
- Responsive: 2x2 on desktop, 1x4 on mobile

#### 2.2.2 Panel 2: Method Performance Chart

**Purpose:** Show success rate and speed for each method

**Type:** Recharts BarChart

**Data:**
```
[
  {
    method: 'mDNS',
    successRate: 0.92,
    avgDurationMs: 1200,
    attemptCount: 42
  },
  {
    method: 'Scan',
    successRate: 0.65,
    avgDurationMs: 4800,
    attemptCount: 42
  }
]
```

**Visualization:**
```
Success Rate by Method
100% ├────────
 90% ├── mDNS (92%)
 80% │
 70% │  Scan (65%)
 60% ├──
 50% └────────────────
     mDNS    Scan
```

**Bars:**
- X-axis: method names
- Y-axis: success rate (0-100%)
- Bar color: green if >80%, yellow if 50-80%, red if <50%
- Label on each bar: percentage + attempt count

**Interactive Features:**
- Hover: show tooltip with avgDurationMs
- Tooltip format: "Success: 92% | Avg Duration: 1.2s | Attempts: 42"

**Data Source:**
- useDiscoveryMetrics().methodMetrics (iterate over Map)

#### 2.2.3 Panel 3: Discovery Timeline Chart

**Purpose:** Visualize discovery duration trends over time

**Type:** Recharts LineChart (dual-axis)

**Data Points:**
```
[
  {
    timestamp: 1698345600000,
    durationMs: 2340,
    devicesFound: 3
  },
  {
    timestamp: 1698345605000,
    durationMs: 1850,
    devicesFound: 3
  },
  ...
]
```

**Visualization:**
```
Discovery Metrics Over Time
Dur.│
(s) │   ╱╲         ╱╲
  5 │  ╱  ╲       ╱  ╲
  4 │ ╱    ╲_____╱    ╲___
  3 │╱                     ╲
    ├─────────────────────────
    │ Duration ─ Devices Found
```

**Chart Configuration:**
- Left Y-axis: Duration in seconds (0-10s)
- Right Y-axis: Devices found (0-20)
- X-axis: Time (last 20 snapshots ~100 seconds)
- Line 1: duration (blue, left axis)
- Line 2: devicesFound (orange, right axis)

**Labels:**
- Tooltip: "Duration: 2.3s | Devices: 3 | Time: 13:45:22"
- Legend: "Discovery Duration (s)" and "Devices Found"

**Data Source:**
- useDiscoveryMetrics().history (last 20 snapshots)
- Extract: timestamp, durationMs, devicesFound per snapshot

#### 2.2.4 Panel 4: Cache Health Metrics

**Purpose:** Display cache operation statistics

**Content:**
```
┌─────────────────────────────┐
│ Cache Health                │
├─────────────────────────────┤
│ Cache Hits        42        │
│ Cache Misses      12        │
│ Cache Evictions   3         │
│ Hit Rate          77.8%     │
└─────────────────────────────┘
```

**Metrics Displayed:**
- totalHits (from useCacheStats)
- totalMisses
- totalEvictions
- hitRate (calculated: hits / (hits + misses))

**Styling:**
- List format (key: value pairs)
- Hit rate highlighted if > 80%
- Warning style if < 60%

#### 2.2.5 Panel 5: Queue Configuration Display

**Purpose:** Show current discovery strategy and method settings

**Content:**
```
┌─────────────────────────────────────┐
│ Queue Configuration                 │
├─────────────────────────────────────┤
│ Strategy:  HYBRID                   │
│                                     │
│ mDNS (Priority 9)                   │
│   Timeout: 3000ms | Retries: 1      │
│                                     │
│ Scan (Priority 5)                   │
│   Timeout: 5000ms | Retries: 0      │
└─────────────────────────────────────┘
```

**Data Display:**
- Current strategy (bold, large)
- For each method:
  - Name and priority
  - Timeout (ms)
  - Retries allowed

**Visual Indicators:**
- Strategy as badge (blue for hybrid, green for sequential, orange for race)
- Priority as progress bar (priority/10)
- Enabled status: ✓ or ✗

**Data Source:**
- useDiscoveryQueueConfig()

### 2.3 Integration into DebugHUD

**File Location:** `src/components/debug/DebugHUD.tsx`

**Modification:**
```typescript
import { DiscoveryMonitoringDashboard } from './discovery/DiscoveryMonitoringDashboard';

export const DebugHUD: React.FC = () => {
  // Existing tabs...

  return (
    <Tabs defaultValue="performance">
      <Tabs.List>
        <Tabs.Trigger value="performance">Performance</Tabs.Trigger>
        <Tabs.Trigger value="transport">Transport</Tabs.Trigger>
        <Tabs.Trigger value="discovery">Discovery</Tabs.Trigger>  {/* NEW */}
      </Tabs.List>

      <Tabs.Content value="performance">
        {/* Existing performance tab */}
      </Tabs.Content>

      <Tabs.Content value="transport">
        {/* Existing transport tab */}
      </Tabs.Content>

      <Tabs.Content value="discovery">
        <DiscoveryMonitoringDashboard refreshIntervalMs={1000} />
      </Tabs.Content>
    </Tabs>
  );
};
```

---

## 3. Testing Requirements

### 3.1 Hook Tests: useDiscoveryMetrics.test.ts, useCacheStats.test.ts, useDiscoveryQueueConfig.test.ts

**Test Framework:** React Testing Library + Vitest

#### Hook 1 Tests: useDiscoveryMetrics (8 tests)

```typescript
describe('useDiscoveryMetrics', () => {
  it('should return initial metrics data', () => {
    // Render hook with test wrapper
    // Verify structure of returned metrics
  });

  it('should update metrics at specified interval', async () => {
    // Mock discoveryMetrics singleton
    // Render hook
    // Wait for refresh interval
    // Verify data updated
  });

  it('should aggregate method metrics correctly', () => {
    // Setup metrics with known values
    // Verify aggregate calculations
  });

  it('should include snapshot history', () => {
    // Verify snapshots array present
    // Verify latest snapshot is recent
  });

  it('should handle empty metrics gracefully', () => {
    // Clear metrics
    // Hook should return zeros, not error
  });

  it('should cleanup interval on unmount', () => {
    // Spy on clearInterval
    // Unmount hook
    // Verify interval cleared
  });

  it('should handle custom refresh interval', async () => {
    // Pass refreshMs={2000}
    // Measure actual update frequency
    // Verify matches provided interval
  });

  it('should set loading state correctly', () => {
    // Verify loading=true initially
    // Verify loading=false after first update
  });
});
```

#### Hook 2 Tests: useCacheStats (6 tests)

```typescript
describe('useCacheStats', () => {
  it('should return cache size and max size', () => {
    // Mock device-discovery singleton
    // Verify size/maxSize from getCacheConfig()
  });

  it('should include hit/miss/eviction counts', () => {
    // Verify totalHits, totalMisses, totalEvictions
  });

  it('should calculate hit rate correctly', () => {
    // Setup: 70 hits, 30 misses
    // Verify hitRate = 0.7
  });

  it('should return list of cached devices', () => {
    // Verify devices array
    // Verify each device has expected properties
  });

  it('should update cache stats on interval', async () => {
    // Mock cache change
    // Wait for refresh
    // Verify size updated
  });

  it('should handle empty cache gracefully', () => {
    // Clear all devices
    // Verify size=0, hitRate calculation doesn't break
  });
});
```

#### Hook 3 Tests: useDiscoveryQueueConfig (4 tests)

```typescript
describe('useDiscoveryQueueConfig', () => {
  it('should fetch config on mount', () => {
    // Mock device-discovery.getDiscoveryQueueConfig()
    // Render hook
    // Verify config loaded
  });

  it('should return null if config unavailable', () => {
    // Mock null config
    // Verify hook returns null gracefully
  });

  it('should include strategy and methods', () => {
    // Verify config.strategy present
    // Verify config.methods.mdns and scan
  });

  it('should not re-fetch on every render', () => {
    // Spy on getDiscoveryQueueConfig calls
    // Re-render component
    // Verify called only once (on mount)
  });
});
```

### 3.2 Component Tests: DiscoveryMonitoringDashboard.test.tsx

**Test Framework:** React Testing Library + Vitest

**Test Categories:** 12+ tests

#### Category 1: Rendering (3 tests)
- ✓ Renders all 5 panels
- ✓ Displays live statistics cards
- ✓ Displays charts without errors

#### Category 2: Data Display (4 tests)
- ✓ Shows correct totalDiscoveries count
- ✓ Shows correct cache size/max size
- ✓ Shows hit rate percentage
- ✓ Shows method names with priorities

#### Category 3: Charts (2 tests)
- ✓ BarChart renders with method data
- ✓ LineChart renders with timeline data

#### Category 4: Updates (2 tests)
- ✓ Live stats update at interval
- ✓ Charts update with new snapshots

#### Category 5: Responsive Layout (1 test)
- ✓ Panels stack on mobile, grid on desktop

### 3.3 Integration Tests: Dashboard with real metrics

**Test Scenarios:** 3 flows

#### Scenario 1: Dashboard with active discoveries
- Start several discoveries
- Dashboard shows increasing totalDiscoveries
- Method success rates visible
- ✓ Charts update in real-time

#### Scenario 2: Dashboard with cache activity
- Perform discoveries
- Cache hits recorded
- Hit rate displayed correctly
- ✓ Cache stats panel shows accurate counts

#### Scenario 3: Dashboard with queue configuration
- Change discovery strategy
- Dashboard reflects new strategy
- Method priorities displayed
- ✓ Config panel updates immediately

---

## 4. Performance Specifications

### 4.1 Component Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Initial render | <100ms | Dashboard first paint |
| Re-render (on data update) | <50ms | Each 1s refresh cycle |
| Hook update | <10ms | Per hook, no network |
| Chart re-render | <30ms | Recharts optimization |

### 4.2 Memory Usage

| Component | Memory |
|-----------|--------|
| useDiscoveryMetrics hook | ~50KB (20 snapshots) |
| useCacheStats hook | ~10KB (device list) |
| useDiscoveryQueueConfig hook | ~1KB (config) |
| DiscoveryMonitoringDashboard | ~20KB (component state) |
| **Total** | **~80KB** (negligible) |

### 4.3 Network Impact

- **Zero network calls** (all data from local singletons)
- **No external API dependencies** (Recharts is bundled)
- **Polling interval:** 1 second (user-configurable)

### 4.4 Refresh Cycle

```
Timeline: ├─0ms──┬──500ms──┬──1000ms──┬──1500ms──┬──2000ms──
Interval: └──────┼─────────●──────────┼─────────●──────────
         (refresh at 1000ms intervals)

Per cycle:
  - Hook: poll metrics (<10ms)
  - State update: React batch (<5ms)
  - Component re-render: <50ms
  - Total: ~65ms per 1000ms interval = 6.5% CPU
```

---

## 5. Data Flow Architecture

```
┌────────────────────────────────────────────┐
│ DiscoveryMonitoringDashboard (FC)          │
├────────────────────────────────────────────┤
│                                            │
│ useDiscoveryMetrics() ─────→ [Panel 2]     │
│ (methodMetrics, history)      [Panel 3]    │
│                               [Panel 1]    │
│                                            │
│ useCacheStats() ────────────→ [Panel 4]    │
│ (hits, misses, evictions)     [Panel 1]    │
│                                            │
│ useDiscoveryQueueConfig() ──→ [Panel 5]    │
│ (strategy, priorities)                     │
│                                            │
└────────────────────────────────────────────┘
         ↓ (reads from)
┌────────────────────────────────────────────┐
│ discoveryMetrics (singleton)                │
│ - methodMetrics Map                         │
│ - snapshots array                           │
│ - cache stats                               │
└────────────────────────────────────────────┘
         ↓ (reads from)
┌────────────────────────────────────────────┐
│ device-discovery (singleton)                │
│ - cached devices                            │
│ - cache config                              │
│ - queue configuration                       │
└────────────────────────────────────────────┘
```

---

## 6. Configuration & Customization

### 6.1 Refresh Interval

```typescript
<DiscoveryMonitoringDashboard refreshIntervalMs={500} />  // 500ms (faster)
<DiscoveryMonitoringDashboard refreshIntervalMs={2000} /> // 2s (slower)
```

### 6.2 Custom Panel Visibility (Future)

```typescript
interface DashboardConfig {
  showLiveStats?: boolean;      // Default: true
  showMethodChart?: boolean;    // Default: true
  showTimeline?: boolean;       // Default: true
  showCacheHealth?: boolean;    // Default: true
  showQueueConfig?: boolean;    // Default: true
}
```

### 6.3 Theme Support

- Uses existing design tokens from project
- Light/dark mode support via CSS variables
- Responsive breakpoints: mobile/tablet/desktop

---

## 7. Error Handling

| Error | Handling |
|-------|----------|
| Metrics not available | Show "No data" message |
| Hook update fails | Log error, show loading state |
| Singleton missing | Graceful null check, hide panel |
| Chart rendering error | Fallback to text display |

---

## 8. Success Criteria

### 8.1 Functional Success

- ✓ All 5 panels render without errors
- ✓ Live statistics update every 1 second
- ✓ Charts display correctly
- ✓ Data sources are accurate
- ✓ Configuration panel shows current settings

### 8.2 Performance Success

- ✓ Initial render: <100ms
- ✓ Re-renders: <50ms each
- ✓ Memory usage: <100KB
- ✓ No impact on discovery operations
- ✓ Smooth 1-second refresh cycle

### 8.3 Integration Success

- ✓ DebugHUD "Discovery" tab displays dashboard
- ✓ All 3 hooks work correctly
- ✓ All 12+ component tests pass
- ✓ All 3 integration scenarios pass
- ✓ No regressions to existing DebugHUD

---

## 9. Code Review Checklist

- [ ] All hooks have JSDoc comments
- [ ] Component has PropTypes or TypeScript props
- [ ] All 5 panels implemented correctly
- [ ] Recharts charts configured properly
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] 1-second refresh interval working
- [ ] All 12+ component tests pass
- [ ] All 3 hook tests pass
- [ ] All 3 integration scenarios pass
- [ ] No TypeScript errors
- [ ] Code follows project style guide
- [ ] Accessibility: labels, ARIA attributes for charts

---

## 10. Implementation Notes

### 10.1 Recharts Integration

```typescript
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// All charts wrapped in <ResponsiveContainer>
// Ensures responsive sizing
```

### 10.2 React Hooks Pattern

```typescript
// Each hook is a separate custom hook
// Exported from src/hooks/
// Can be used independently in other components

useDiscoveryMetrics()      // ~50 LOC
useCacheStats()            // ~40 LOC
useDiscoveryQueueConfig()  // ~30 LOC
Total: ~120 LOC
```

### 10.3 Dashboard Component

```typescript
// Functional component with TypeScript
// Props interface for configuration
// 5 render sections (panels)
// ~200 LOC total
```

---

## 11. Related Documents

- **Previous Task:** docs/planning/task_3_priority_queue_fallback_specification.md
- **Base Task:** docs/planning/task_1_metrics_collection_specification.md
- **Cache Task:** docs/planning/task_2_smart_cache_invalidation_specification.md
- **Architecture:** docs/architecture/device-discovery-system-overview.md

---

## Changelog

- `2025-10-27` — Initial specification published
  - Defined 3 custom React hooks for data binding
  - Specified 5 dashboard panels with exact layouts
  - Provided Recharts configuration for charts
  - Outlined integration into DebugHUD
  - Listed 12+ component tests and 3 integration scenarios
  - Included performance targets and error handling

<!-- markdownlint-enable MD013 -->
