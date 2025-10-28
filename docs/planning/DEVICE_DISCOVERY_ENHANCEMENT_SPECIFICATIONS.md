---
title: Device Discovery Enhancement Project: Complete Specifications
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
<!-- markdownlint-disable MD013 -->

# Device Discovery Enhancement Project: Complete Specifications

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Master index and overview of all 4 device discovery enhancement tasks with formal specifications

---

## 1. Project Overview

This document serves as the comprehensive index for the Device Discovery Enhancement Project, which adds sophisticated metrics collection, intelligent caching, adaptive discovery strategies, and real-time monitoring to the K1 device discovery system.

**Project Goals:**
- Reduce discovery latency by 30-50% through intelligent method selection
- Improve cache efficiency by 40-60% through state-aware invalidation
- Add complete observability to discovery operations
- Maintain backward compatibility with existing code

**Total Scope:** 4 interconnected tasks, ~1700 LOC, 60+ unit tests, fully specified and ready for implementation

---

## 2. Task Breakdown & Specifications

### Task 1: Metrics Collection System ✅ COMPLETED

**Status:** Implemented and tested (25/25 tests passing)

**File:** `docs/planning/task_1_metrics_collection_specification.md`

**What It Does:**
- Tracks per-method discovery performance (success rates, duration, attempts)
- Records cache operations (hits, misses, evictions)
- Maintains time-series snapshots (rolling window: 100 entries)
- Provides method recommendation based on success rate (70%) + speed (30%)

**Core Classes:**
- `DiscoveryMetricsCollector` (in `discovery-metrics.ts`)
- Singleton: `discoveryMetrics`

**Key Methods:**
- `startDiscovery(method)` → attemptId
- `completeDiscovery(attemptId, result)` → void
- `recordCacheHit/Miss/Eviction()` → void
- `getRecommendedMethod()` → string | null
- `getMethodMetrics()` → Map<string, DiscoveryMethodMetrics>

**Integration Points in device-discovery.ts:**
1. Import: `import { discoveryMetrics } from './discovery-metrics'`
2. Start: `const attemptId = discoveryMetrics.startDiscovery('hybrid')`
3. Complete: `discoveryMetrics.completeDiscovery(attemptId, { ... })`
4. Eviction: `discoveryMetrics.recordCacheEviction(deviceId)`
5. Cache update: `discoveryMetrics.updateCacheMetrics(size, maxSize)`

**Test Coverage:** 25 comprehensive unit tests
- Attempt tracking and timing
- Method metrics calculation
- Cache operations
- Recommendation algorithm
- Snapshots and history
- Export/reset functionality

**Files Created:**
- ✅ `src/services/discovery-metrics.ts` (400 LOC)
- ✅ `src/services/__tests__/discovery-metrics.test.ts` (380 LOC)

**Files Modified:**
- ✅ `src/services/device-discovery.ts` (+52 LOC integration)

---

### Task 2: Smart Cache Invalidation (Detailed Spec Available)

**Specification File:** `docs/planning/task_2_smart_cache_invalidation_specification.md`

**What It Does:**
- Detects device IP/MAC address changes with confidence scoring
- Tracks device disappearances through consecutive miss counting
- Computes adaptive TTL (5 min to 2 hours) based on device reliability
- Replaces fixed 1-hour TTL with intelligent state-based eviction

**Core Classes:**
- `CacheInvalidationManager` (in `cache-invalidation.ts`)
- Singleton: `cacheInvalidationManager`

**Key Methods (7 total):**
1. `recordDeviceState(device)` - Capture device state snapshot
2. `detectChanges(device)` - Identify IP/MAC changes with confidence
3. `computeConfidence(deviceId)` - Calculate reliability score (0.0-1.0)
4. `computeAdaptiveTTL(deviceId)` - Map confidence to TTL duration
5. `shouldInvalidate(device)` - Determine if device should be evicted
6. `markAsStale(deviceId, reason)` - Record invalidation event
7. `getInvalidationHistory(limit)` - Retrieve invalidation log

**Confidence Scoring:**
- New device (1 discovery): ~0.5
- Stable device (10+ discoveries, <1 hour): >0.9
- Device with IP/MAC changes: reduced confidence
- Device missing 3+ attempts: confidence < 0.6

**Adaptive TTL Mapping:**
- Confidence ≥0.90 → 2 hours
- Confidence 0.75-0.90 → 1 hour
- Confidence 0.60-0.75 → 30 minutes
- Confidence <0.60 → 5 minutes

**Integration Points in device-discovery.ts:**
1. In `_normalizeDevices()`: Call `recordDeviceState()` and `detectChanges()`
2. In `_evictExpiredDevices()`: Replace fixed TTL with `computeAdaptiveTTL()`
3. In `_evictLRUDevice()`: Call `recordCacheEviction(deviceId)` on eviction

**Test Coverage:** 20+ unit tests across 6 categories
- Device state recording
- IP/MAC change detection (confidence: 0.9-0.95)
- Device disappearance handling
- Confidence scoring
- Adaptive TTL computation
- Integration scenarios (device moves, device reconfigures, disappears)

**Estimated Implementation:** 6-8 hours
- Module: ~350 LOC
- Tests: ~280 LOC
- Integration: ~15 LOC to device-discovery.ts

---

### Task 3: Priority Queue Fallback Logic (Detailed Spec Available)

**Specification File:** `docs/planning/task_3_priority_queue_fallback_specification.md`

**What It Does:**
- Replaces sequential K1Client → K1DiscoveryService fallback with intelligent queueing
- Supports 3 execution strategies: Sequential, Race (parallel), Hybrid
- Implements learning algorithm that adjusts method priorities based on success rates
- Configurable method priorities, timeouts, and retries

**Core Classes:**
- `DiscoveryMethodQueue` (in `discovery-queue.ts`)
- Used by DeviceDiscoveryAbstraction (not a singleton)

**Key Methods (8 total):**
1. `execute(options)` - Delegate to appropriate strategy
2. `executeSequential()` - Try methods in priority order, return first success
3. `executeRace()` - Execute all methods in parallel, return first success
4. `executeHybrid()` - Sequential for high-priority, race for low-priority
5. `adjustPriorities()` - Update priorities based on metrics (70% success, 30% speed)
6. `getRecommendedStrategy()` - Suggest optimal strategy based on network conditions
7. `setConfig()` - Update configuration (priorities, timeouts, strategies)
8. `getConfig()` - Retrieve current configuration

**Default Configuration:**
```
strategy: 'hybrid' (recommended)
methods:
  mdns: priority=9, timeout=3s, retries=1
  scan: priority=5, timeout=5s, retries=0
```

**Execution Strategies:**
- **Sequential:** Best case 3-5s (first succeeds), worst case 8s (both fail), reliable networks
- **Race:** Best case 3s, worst case 5s (slowest timeout), unreliable networks
- **Hybrid:** Best case 3-5s (high-priority succeeds), worst case 5-8s (fallback to race)

**Priority Learning Algorithm:**
```
score = (successRate * 0.7) + (speedFactor * 0.3)
speedFactor = max(0, 1 - avgDurationMs / 10000)

Example:
  mDNS: 90% success, 1.5s avg → score = 0.63 + 0.255 = 0.885 → priority 8
  Scan: 60% success, 5.0s avg → score = 0.42 + 0.15 = 0.57 → priority 5
```

**Integration Points in device-discovery.ts:**
1. Constructor: Initialize queue with metrics reference
2. In `discover()`: Replace sequential logic with `this._queue.execute()`
3. New method: `_executeDiscoveryMethod(method, timeout)` executor function
4. New methods: `setDiscoveryStrategy()`, `getDiscoveryQueueConfig()`

**Test Coverage:** 20+ unit tests across 5 categories
- Sequential strategy (priority ordering, retries, fast-return)
- Race strategy (parallel execution)
- Hybrid strategy (high-priority sequential, low-priority race)
- Priority learning (score calculation, clamping)
- Configuration management

**Estimated Implementation:** 8-10 hours
- Module: ~450 LOC
- Tests: ~350 LOC
- Integration: ~30 LOC to device-discovery.ts

---

### Task 4: Monitoring Dashboard (Detailed Spec Available)

**Specification File:** `docs/planning/task_4_monitoring_dashboard_specification.md`

**What It Does:**
- Displays real-time discovery metrics with 1-second refresh
- Shows 5 panels: live stats, method performance chart, timeline chart, cache health, queue config
- Uses React hooks for data binding to metrics singletons
- Integrates into existing DebugHUD as new "Discovery" tab

**Components & Hooks:**

1. **useDiscoveryMetrics** (~50 LOC)
   - Returns: methodMetrics, history, snapshot, aggregate, loading, error
   - Refreshes every 1000ms

2. **useCacheStats** (~40 LOC)
   - Returns: size, maxSize, devices, hitRate, hits, misses, evictions, loading
   - Refreshes every 1000ms

3. **useDiscoveryQueueConfig** (~30 LOC)
   - Returns: strategy, methods, priorities
   - Fetches once on mount (config rarely changes)

4. **DiscoveryMonitoringDashboard** (~200 LOC)
   - 5 panels:
     1. Live Statistics (4 cards: discoveries, devices, cache size, hit rate)
     2. Method Performance (Recharts BarChart: success rate per method)
     3. Discovery Timeline (Recharts LineChart: duration + devices over time)
     4. Cache Health (text metrics: hits, misses, evictions, hit rate)
     5. Queue Configuration (current strategy and method priorities)

**Panel 1: Live Statistics**
- Grid of 4 cards
- Shows: totalDiscoveries, totalDevicesFound, cacheSize/maxSize, hitRate%
- Responsive: 2x2 desktop, 1x4 mobile

**Panel 2: Method Performance Chart**
- BarChart with method names on X, success rate (0-100%) on Y
- Bar colors: green (>80%), yellow (50-80%), red (<50%)
- Tooltip: "Success: 92% | Avg Duration: 1.2s | Attempts: 42"

**Panel 3: Discovery Timeline Chart**
- LineChart with dual axes
- Left Y: Duration (0-10s), Right Y: Devices (0-20)
- Blue line: discovery duration, Orange line: devices found
- Shows last 20 snapshots (~100 seconds)

**Panel 4: Cache Health Metrics**
- List format: key-value pairs
- Metrics: totalHits, totalMisses, totalEvictions, hitRate
- Warning style if hitRate < 60%

**Panel 5: Queue Configuration**
- Strategy as badge (blue/green/orange)
- For each method: name, priority, timeout, retries
- Enable/disable indicator

**Integration into DebugHUD:**
```typescript
<Tabs.Trigger value="discovery">Discovery</Tabs.Trigger>
<Tabs.Content value="discovery">
  <DiscoveryMonitoringDashboard refreshIntervalMs={1000} />
</Tabs.Content>
```

**Performance:**
- Initial render: <100ms
- Re-renders: <50ms (every 1 second)
- Memory: ~80KB total (negligible)
- Network: Zero external API calls

**Test Coverage:** 18+ tests
- Hook tests: 8 + 6 + 4 = 18 tests
- Component tests: 12+ tests
- Integration scenarios: 3 flows (active discoveries, cache activity, config changes)

**Estimated Implementation:** 6-8 hours
- Hooks: ~120 LOC
- Component: ~200 LOC
- Tests: ~450 LOC
- DebugHUD integration: ~5 LOC

---

## 3. Dependency Mapping

```
Task 1: Metrics Collection
  ├─ No dependencies (standalone)
  └─ Used by Tasks 2, 3, 4

Task 2: Smart Cache Invalidation
  ├─ Depends on: Task 1 (metrics)
  ├─ Modifies: device-discovery.ts cache eviction
  └─ Used by: Device discovery cache management

Task 3: Priority Queue Fallback Logic
  ├─ Depends on: Task 1 (metrics)
  ├─ Modifies: device-discovery.ts discover() method
  └─ Creates: New queue abstraction

Task 4: Monitoring Dashboard
  ├─ Depends on: Tasks 1, 2, 3 (all metrics)
  ├─ Consumes: All metrics and config
  └─ Adds: DebugHUD visualization
```

**Recommended Implementation Order:**
1. ✅ Task 1: Metrics (foundational layer)
2. → Task 2: Cache Invalidation (independent, uses metrics)
3. → Task 3: Priority Queue (independent, uses metrics)
4. → Task 4: Dashboard (consumes all three)

---

## 4. Testing Summary

| Task | Unit Tests | Integration Tests | Total |
|------|-----------|------------------|-------|
| Task 1: Metrics | 25 | 4 scenarios | 29 |
| Task 2: Cache Invalidation | 20+ | 4 scenarios | 24+ |
| Task 3: Priority Queue | 20+ | 4 scenarios | 24+ |
| Task 4: Dashboard | 18 | 3 scenarios | 21 |
| **TOTAL** | **83+** | **15 scenarios** | **98+** |

**Pre-implementation baseline:** 155 passing tests (from previous session)
**Expected post-implementation:** 155 + 98 = 253+ passing tests

---

## 5. Code Statistics

| Task | Files Created | Lines of Code | Files Modified | LOC Modified |
|------|---------|---------|---------|---------|
| Task 1 | 2 | 780 | 1 | 52 |
| Task 2 | 2 | 630 | 1 | 15 |
| Task 3 | 2 | 800 | 1 | 30 |
| Task 4 | 4 | 320 | 1 | 5 |
| **TOTAL** | **10** | **2530** | **4** | **102** |

---

## 6. Implementation Timeline

**Recommended Schedule:** 24-32 hours (spread across 4 days)

| Task | Effort | Duration | Start Day |
|------|--------|----------|-----------|
| Task 1: Metrics | 4-6h | Complete | Day 1 ✅ |
| Task 2: Cache Invalidation | 6-8h | 1.5 days | Day 2 |
| Task 3: Priority Queue | 8-10h | 2 days | Day 2 |
| Task 4: Dashboard | 6-8h | 1.5 days | Day 3 |
| **TOTAL** | **24-32h** | **4 days** | **Days 1-4** |

---

## 7. Success Criteria

### 7.1 Functional Criteria (All Must Pass)

- ✅ Task 1 metrics implemented and integrated (25/25 tests passing)
- [ ] Task 2 cache invalidation working with confidence scoring
- [ ] Task 3 priority queue executing with all 3 strategies
- [ ] Task 4 dashboard displaying real-time metrics

### 7.2 Performance Criteria

- [ ] Average discovery time: 4-6 seconds (vs. current 5-8s)
- [ ] 40-60% reduction in false negatives (cache misses)
- [ ] Dashboard refresh: <50ms per cycle
- [ ] Zero network impact (all local data)

### 7.3 Quality Criteria

- [ ] 98+ unit tests passing
- [ ] 15 integration scenarios passing
- [ ] No regressions to 155 existing tests
- [ ] Zero TypeScript compilation errors
- [ ] All code reviews approved

### 7.4 Documentation Criteria

- [ ] All specifications published and linked
- [ ] Code comments follow project standards
- [ ] CLAUDE.md artifact filing completed
- [ ] Integration guides published

---

## 8. Risk Assessment & Mitigation

### Risk 1: Metrics Integration Breaking Discovery
**Severity:** High | **Probability:** Low
**Mitigation:** Comprehensive unit tests, gradual integration, metrics are append-only

### Risk 2: Adaptive TTL Causing False Evictions
**Severity:** Medium | **Probability:** Medium
**Mitigation:** Conservative default confidence thresholds, extensive testing, validation against baseline

### Risk 3: Priority Learning Creating Bad Decisions
**Severity:** Medium | **Probability:** Low
**Mitigation:** Algorithm weights success heavily (70%), minimum 10 attempts before adjustment

### Risk 4: Dashboard Performance Degradation
**Severity:** Low | **Probability:** Low
**Mitigation:** Polling instead of subscriptions, 1-second interval, React optimization

---

## 9. File Structure Reference

```
k1-control-app/src/
├── services/
│   ├── discovery-metrics.ts                    [NEW - Task 1]
│   ├── cache-invalidation.ts                   [NEW - Task 2]
│   ├── discovery-queue.ts                      [NEW - Task 3]
│   ├── device-discovery.ts                     [MODIFIED - Tasks 1,2,3]
│   └── __tests__/
│       ├── discovery-metrics.test.ts           [NEW - Task 1]
│       ├── cache-invalidation.test.ts          [NEW - Task 2]
│       ├── discovery-queue.test.ts             [NEW - Task 3]
│       └── device-discovery.integration.test.ts [MODIFIED - Tasks 1,2,3]
├── hooks/
│   ├── useDiscoveryMetrics.ts                  [NEW - Task 4]
│   ├── useCacheStats.ts                        [NEW - Task 4]
│   └── useDiscoveryQueueConfig.ts              [NEW - Task 4]
└── components/
    ├── discovery/
    │   ├── DiscoveryMonitoringDashboard.tsx    [NEW - Task 4]
    │   └── __tests__/
    │       └── DiscoveryMonitoringDashboard.test.tsx [NEW - Task 4]
    └── debug/
        ├── DebugHUD.tsx                        [MODIFIED - Task 4]
        └── ...
```

---

## 10. Related Documentation

**Specifications (This Document Suite):**
- Task 1: `docs/planning/task_1_metrics_collection_specification.md` ✅
- Task 2: `docs/planning/task_2_smart_cache_invalidation_specification.md`
- Task 3: `docs/planning/task_3_priority_queue_fallback_specification.md`
- Task 4: `docs/planning/task_4_monitoring_dashboard_specification.md`

**Workflow Documentation:**
- CLAUDE.md: Project workflow guardrails and multiplier patterns
- Multiplier Orchestrator playbook: Tier 1/2/3 artifact dependencies

**Project Architecture:**
- `docs/architecture/device-discovery-system-overview.md` (create as reference)
- `docs/analysis/device-discovery-bottleneck-analysis.md` (from previous session)

---

## 11. Next Steps for Implementation Teams

### For Task 2 (Cache Invalidation Team):
1. Read `task_2_smart_cache_invalidation_specification.md` completely
2. Create `cache-invalidation.ts` with CacheInvalidationManager class
3. Create comprehensive test suite (`cache-invalidation.test.ts`)
4. Integrate into `device-discovery.ts` (3 locations specified)
5. Verify all 20+ tests pass
6. Run full test suite (should pass 155 + 20 = 175 tests)

### For Task 3 (Queue Implementation Team):
1. Read `task_3_priority_queue_fallback_specification.md` completely
2. Create `discovery-queue.ts` with DiscoveryMethodQueue class
3. Create test suite (`discovery-queue.test.ts`)
4. Integrate into `device-discovery.ts` (4 locations specified)
5. Verify all 20+ tests pass
6. Validate with performance benchmarks

### For Task 4 (Dashboard Team):
1. Read `task_4_monitoring_dashboard_specification.md` completely
2. Create 3 custom hooks (useDiscoveryMetrics, useCacheStats, useDiscoveryQueueConfig)
3. Create DiscoveryMonitoringDashboard component with 5 panels
4. Create test suites for hooks and component
5. Integrate into DebugHUD
6. Verify dashboard displays correctly and updates in real-time

---

## Changelog

- `2025-10-27` — Complete specification set published
  - ✅ Task 1 (Metrics): COMPLETED and tested (25/25)
  - 📋 Task 2 (Cache Invalidation): Formal specification (20+ tests, 350 LOC)
  - 📋 Task 3 (Priority Queue): Formal specification (20+ tests, 450 LOC)
  - 📋 Task 4 (Dashboard): Formal specification (18+ tests, 320 LOC)
  - 📋 Master index (this document) linking all 4 specifications
  - Dependency mapping and implementation timeline
  - Risk assessment and mitigation strategies

<!-- markdownlint-enable MD013 -->
