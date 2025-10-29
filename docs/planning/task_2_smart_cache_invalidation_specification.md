---
title: Task 2: Smart Cache Invalidation Specification
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

# Task 2: Smart Cache Invalidation Specification

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Formal specification for intelligent cache invalidation with device state tracking and adaptive TTL

---

## 1. Executive Summary

Replace fixed 1-hour TTL cache eviction with intelligent state-based invalidation that:
- Detects IP/MAC address changes (device moved or reconfigured)
- Tracks device disappearances (lost connectivity)
- Scores device reliability based on discovery history
- Adapts TTL dynamically (5 min to 2 hours) based on confidence
- Gracefully handles stale device states

**Key Metrics:**
- Reduce false negatives (missed rediscovery) by 40-60%
- Improve cache efficiency through adaptive TTL
- Maintain backward compatibility with existing discovery flow

---

## 2. Functional Requirements

### 2.1 Core Module: CacheInvalidationManager

**File Location:** `src/services/cache-invalidation.ts`
**Module Type:** Service (Singleton)
**Dependencies:** None (standalone)
**Export:** `export const cacheInvalidationManager = new CacheInvalidationManager()`

#### 2.1.1 Class Definition

```typescript
export class CacheInvalidationManager {
  // State tracking for each device
  private deviceHistory: Map<string, DeviceStateSnapshot[]>;

  // Confidence scoring for each device
  private confidenceScores: Map<string, number>;

  // Invalidation event log
  private invalidationLog: InvalidationTrigger[];

  // Configuration
  private readonly minTtlMs = 300000;      // 5 minutes
  private readonly maxTtlMs = 7200000;     // 2 hours
  private readonly confidenceThreshold = 0.8;
}
```

#### 2.1.2 Core Methods

**Method 1: recordDeviceState()**

```typescript
recordDeviceState(device: NormalizedDevice): void {
  /**
   * Purpose: Record current state of a discovered device
   *
   * Inputs:
   *   - device: NormalizedDevice (id, mac, ip, lastSeen, discoveryCount)
   *
   * Operations:
   *   1. Retrieve existing history for device.id (if any)
   *   2. Create DeviceStateSnapshot with timestamp, mac, ip, discoveryCount
   *   3. Append to history (max 20 snapshots per device = ~1 hour of data)
   *   4. Update confidence score
   *
   * Side Effects:
   *   - Modifies deviceHistory Map
   *   - Updates confidenceScores Map
   *   - Prunes old snapshots (>20 per device)
   *
   * Error Handling:
   *   - If device.id is empty: skip recording (log warning)
   *   - If device.mac is empty: use ip as identifier (document in snapshot)
   */
}
```

**Method 2: detectChanges()**

```typescript
detectChanges(device: NormalizedDevice): ChangeDetectionResult {
  /**
   * Purpose: Identify IP/MAC changes or device state transitions
   *
   * Inputs:
   *   - device: NormalizedDevice (current state)
   *
   * Returns: ChangeDetectionResult
   *   {
   *     changeType: 'ip_change' | 'mac_change' | 'stable' | 'new_device',
   *     confidence: 0.0-1.0,
   *     oldState: DeviceStateSnapshot | null,
   *     newState: DeviceStateSnapshot,
   *     details: string
   *   }
   *
   * Detection Logic:
   *   1. If no history exists: return { changeType: 'new_device', confidence: 0.5 }
   *   2. If only 1 snapshot in history: return { changeType: 'stable', confidence: 0.6 }
   *   3. Compare current device.mac with last 3 snapshots:
   *      - If MAC differs but IP same: IP_CHANGE (confidence: 0.9)
   *      - If MAC differs and IP differs: MAC_CHANGE (confidence: 0.95)
   *      - If all match: STABLE (confidence: 0.99)
   *   4. Return result with appropriate confidence level
   *
   * Error Handling:
   *   - If device.id empty: return null (log error)
   *   - If history corrupted: reset to empty array
   */
}
```

**Method 3: computeConfidence()**

```typescript
computeConfidence(deviceId: string): number {
  /**
   * Purpose: Calculate device reliability score (0.0-1.0)
   *
   * Inputs:
   *   - deviceId: string (stable identifier: MAC or IP)
   *
   * Returns: number (0.0-1.0)
   *
   * Scoring Formula:
   *   baseScore = min(discoveryCount / 10, 1.0)
   *   ageFactor = (Date.now() - lastSeenTime) / (24 * 60 * 60 * 1000) // days
   *   ageFactor = max(0.5, 1.0 - ageFactor) // min 0.5 if very old
   *   stateStabilityFactor = (1.0 - changeFrequency)
   *
   *   confidence = baseScore * 0.5 + ageFactor * 0.3 + stateStabilityFactor * 0.2
   *
   * Examples:
   *   - New device, seen once, 5 mins ago: ~0.5
   *   - Device seen 10x, stable IP/MAC, 30 mins ago: ~0.95
   *   - Device seen 3x, IP changed twice, 2 hours ago: ~0.65
   *
   * Cache Implications:
   *   - confidence >= 0.9: TTL = 2 hours (very reliable)
   *   - confidence 0.7-0.9: TTL = 1 hour (reliable)
   *   - confidence 0.5-0.7: TTL = 30 min (unstable)
   *   - confidence < 0.5: TTL = 5 min (new/unreliable)
   */
}
```

**Method 4: computeAdaptiveTTL()**

```typescript
computeAdaptiveTTL(deviceId: string): number {
  /**
   * Purpose: Calculate dynamic cache TTL based on device confidence
   *
   * Inputs:
   *   - deviceId: string
   *
   * Returns: number (milliseconds)
   *
   * Logic:
   *   1. Get confidence score for deviceId
   *   2. Map confidence to TTL:
   *        confidence 0.90-1.00 → 2 hours (7200000 ms)
   *        confidence 0.75-0.90 → 1 hour  (3600000 ms)
   *        confidence 0.60-0.75 → 30 min  (1800000 ms)
   *        confidence 0.00-0.60 → 5 min   (300000 ms)
   *   3. Return computed TTL
   *
   * Integration Point (device-discovery.ts):
   *   Called from _evictExpiredDevices():
   *      const adaptiveTTL = cacheInvalidationManager.computeAdaptiveTTL(deviceId)
   *      if (now - device.lastSeen.getTime() > adaptiveTTL) { evict }
   */
}
```

**Method 5: shouldInvalidate()**

```typescript
shouldInvalidate(device: NormalizedDevice): boolean {
  /**
   * Purpose: Determine if device should be invalidated from cache
   *
   * Inputs:
   *   - device: NormalizedDevice (current cached device)
   *
   * Returns: boolean
   *
   * Decision Logic:
   *   1. Get change detection result: detectChanges(device)
   *   2. If changeType === 'ip_change' AND confidence > 0.8: return true
   *   3. If changeType === 'mac_change' AND confidence > 0.8: return true
   *   4. If TTL exceeded: return true
   *   5. If device disappeared (>3 consecutive misses): return true
   *   6. Otherwise: return false (keep in cache)
   *
   * Error Handling:
   *   - On invalid device: return false (default: keep)
   */
}
```

**Method 6: markAsStale()**

```typescript
markAsStale(deviceId: string, reason: 'disappeared' | 'changed' | 'ttl_expired'): void {
  /**
   * Purpose: Mark device as stale and record invalidation trigger
   *
   * Inputs:
   *   - deviceId: string
   *   - reason: enumeration of why device is being invalidated
   *
   * Operations:
   *   1. Create InvalidationTrigger record with:
   *      { deviceId, timestamp, reason, confidence }
   *   2. Append to invalidationLog (keep last 100 entries)
   *   3. Log the event
   *
   * Side Effects:
   *   - Modifies invalidationLog
   *
   * Note: Does NOT remove from deviceHistory (preserve for analysis)
   */
}
```

**Method 7: getInvalidationHistory()**

```typescript
getInvalidationHistory(limit: number = 50): InvalidationTrigger[] {
  /**
   * Purpose: Retrieve recent invalidation events for analysis
   *
   * Inputs:
   *   - limit: max number of records to return (default: 50)
   *
   * Returns: Array of InvalidationTrigger sorted by timestamp (newest first)
   *
   * Use Cases:
   *   - Dashboard: show recent invalidations
   *   - Debugging: trace why devices were removed
   *   - Analytics: measure invalidation frequency per method
   */
}
```

### 2.2 Interface Definitions

#### DeviceStateSnapshot

```typescript
export interface DeviceStateSnapshot {
  timestamp: number;           // ms since epoch
  mac: string;                 // MAC address (primary identifier)
  ip: string;                  // IPv4 address
  discoveryCount: number;      // cumulative discoveries
  discoveryMethod: 'mdns' | 'scan' | 'manual';
  rssi?: number;               // signal strength if available
}
```

#### ChangeDetectionResult

```typescript
export interface ChangeDetectionResult {
  changeType: 'ip_change' | 'mac_change' | 'stable' | 'new_device';
  confidence: number;          // 0.0-1.0
  oldState: DeviceStateSnapshot | null;  // previous state
  newState: DeviceStateSnapshot;         // current state
  details: string;             // human-readable explanation
}
```

#### InvalidationTrigger

```typescript
export interface InvalidationTrigger {
  deviceId: string;
  timestamp: number;           // when invalidation occurred
  reason: 'disappeared' | 'changed' | 'ttl_expired';
  confidence: number;          // confidence at time of invalidation
  details?: string;            // optional context
}
```

---

## 3. Integration Points

### 3.1 device-discovery.ts Modifications

**Location 1: _normalizeDevices() method**

```typescript
private _normalizeDevices(devices: K1DiscoveredDevice[]): NormalizedDevice[] {
  return devices.map(device => {
    const normalized = { /* ... existing code ... */ };

    // NEW: Record device state for change detection
    cacheInvalidationManager.recordDeviceState(normalized);

    // NEW: Detect and handle IP/MAC changes
    const change = cacheInvalidationManager.detectChanges(normalized);
    if (change.confidence > 0.8 && change.changeType !== 'stable') {
      // Device changed significantly - may need to evict
      if (cacheInvalidationManager.shouldInvalidate(normalized)) {
        cacheInvalidationManager.markAsStale(normalized.id, 'changed');
        // Optionally: force re-discovery of this device
      }
    }

    return normalized;
  });
}
```

**Location 2: _evictExpiredDevices() method**

```typescript
private _evictExpiredDevices(): void {
  const now = Date.now();
  const expired: string[] = [];

  this._discoveryCache.forEach((device, deviceId) => {
    // OLD: const ttl = this._cacheTtlMs;
    // NEW: Use adaptive TTL based on device confidence
    const adaptiveTTL = cacheInvalidationManager.computeAdaptiveTTL(deviceId);

    if (now - device.lastSeen.getTime() > adaptiveTTL) {
      expired.push(deviceId);
      cacheInvalidationManager.markAsStale(deviceId, 'ttl_expired');
    }
  });

  expired.forEach(deviceId => this._discoveryCache.delete(deviceId));
}
```

---

## 4. Testing Requirements

### 4.1 Unit Tests: cache-invalidation.test.ts

**Test Categories:** 6 major areas with 20+ individual tests

#### Category 1: Device State Recording (4 tests)
- ✓ Records first device state snapshot
- ✓ Maintains history up to 20 snapshots
- ✓ Prunes old snapshots when history exceeds limit
- ✓ Handles empty/missing device data gracefully

#### Category 2: IP Change Detection (3 tests)
- ✓ Detects IP change (same MAC, different IP) → confidence 0.9
- ✓ Tracks new IP in device history
- ✓ Returns 'ip_change' with correct details

#### Category 3: MAC Change Detection (3 tests)
- ✓ Detects MAC change (different MAC, same IP) → confidence 0.95
- ✓ Detects simultaneous IP + MAC change
- ✓ Handles edge case: null MAC (use IP as identifier)

#### Category 4: Device Disappearance (3 tests)
- ✓ Records missing device with decreasing confidence
- ✓ After 3 consecutive misses → confidence < 0.6
- ✓ Marks device as stale after threshold

#### Category 5: Confidence Scoring (4 tests)
- ✓ New device (1 discovery) → confidence ~0.5
- ✓ Stable device (10+ discoveries, <1 hour old) → confidence >0.9
- ✓ Old device (2 hours without updates) → confidence ~0.6
- ✓ Unstable device (3+ IP/MAC changes) → confidence <0.7

#### Category 6: Adaptive TTL (3 tests)
- ✓ High confidence (>0.9) → TTL 2 hours
- ✓ Medium confidence (0.7-0.9) → TTL 1 hour
- ✓ Low confidence (<0.6) → TTL 5 minutes

### 4.2 Integration Tests: device-discovery with cache invalidation

**Test Scenarios:** 4 major flows

#### Scenario 1: Device Moves (IP Changes)
- Discover device at 192.168.1.100
- Device moved to 192.168.1.101
- Cache detects IP change
- Device not evicted (same MAC)
- Re-discovery returns new IP
- ✓ New state in cache

#### Scenario 2: Device Reconfigured (MAC Changes)
- Discover device with MAC aa:bb:cc:dd:ee:ff
- Device factory reset (new MAC)
- Cache detects MAC change
- Device marked stale
- Re-discovery creates new cache entry
- ✓ Old device eventually evicted

#### Scenario 3: Disappearance Handling
- Discover device 10 times
- Device goes offline (no re-discovery for 3 attempts)
- Confidence drops with each miss
- After threshold: marked as stale
- ✓ Evicted from cache

#### Scenario 4: Adaptive TTL in Action
- New device (confidence 0.5) → TTL 5 min
- After 5 discoveries (confidence 0.85) → TTL 1 hour
- After 15 discoveries (confidence 0.95) → TTL 2 hours
- ✓ Cache retention aligns with reliability

---

## 5. Performance Specifications

### 5.1 Memory Impact

| Operation | Time Complexity | Space Complexity | Max Memory |
|-----------|-----------------|------------------|-----------|
| recordDeviceState() | O(1) | O(1) per device | ~5KB per device |
| detectChanges() | O(3) linear | O(1) | ~200B |
| computeConfidence() | O(1) | O(1) | Negligible |
| computeAdaptiveTTL() | O(1) | O(1) | Negligible |
| getInvalidationHistory() | O(n) | O(n) | ~50KB for 100 events |

**Total Memory (100 devices):** ~500KB + 50KB log = ~550KB (acceptable)

### 5.2 Execution Timing

| Operation | Target | Notes |
|-----------|--------|-------|
| recordDeviceState() | <1ms | Single snapshot append |
| detectChanges() | <1ms | Compare with last 3 snapshots |
| computeConfidence() | <0.5ms | Simple arithmetic |
| computeAdaptiveTTL() | <0.5ms | Lookup + mapping |
| shouldInvalidate() | <2ms | Multiple conditions |

**Total per discovery:** ~5ms overhead (negligible vs. network latency)

---

## 6. Error Handling & Edge Cases

### 6.1 Edge Cases

| Case | Behavior |
|------|----------|
| Device with no MAC | Use IP as identifier, flag in snapshot |
| History exceeds 20 snapshots | Oldest removed (FIFO) |
| Confidence calculation with no history | Return 0.5 (uncertain) |
| Invalidation log exceeds 100 entries | Keep newest 100 |
| Device appears after marked stale | Treated as new discovery |

### 6.2 Error Handling

| Error | Recovery |
|-------|----------|
| Invalid deviceId | Log warning, skip operation |
| Corrupted history array | Reset to empty, log error |
| Null/undefined device | Skip processing, log warning |
| TTL computation failure | Default to 1 hour |

---

## 7. Configuration & Extensibility

### 7.1 Configurable Parameters

```typescript
private readonly minTtlMs = 300000;       // 5 min (configurable)
private readonly maxTtlMs = 7200000;      // 2 hours (configurable)
private readonly confidenceThreshold = 0.8; // 80% (configurable)
private readonly maxHistoryPerDevice = 20;  // snapshots (configurable)
private readonly maxInvalidationLog = 100;  // entries (configurable)
```

### 7.2 Future Extensions

- **Predictive TTL:** Use ML to predict device reliability based on history
- **Geolocation Awareness:** Adjust confidence based on location changes
- **Custom Scoring:** Allow plugins to override confidence algorithm
- **Persistent History:** Store invalidation log to disk for long-term analytics

---

## 8. Success Criteria

### 8.1 Functional Success

- ✓ IP change detection works correctly (confidence >= 0.9)
- ✓ MAC change detection works correctly (confidence >= 0.95)
- ✓ Adaptive TTL adjusts based on confidence
- ✓ Device disappearance detected after 3 consecutive misses
- ✓ No false positives (stable devices not evicted prematurely)

### 8.2 Performance Success

- ✓ All operations complete in <5ms
- ✓ Memory usage stays <1MB for 100+ devices
- ✓ No memory leaks (history properly pruned)
- ✓ Snapshot capture doesn't block discovery

### 8.3 Integration Success

- ✓ device-discovery.ts integrations work seamlessly
- ✓ Metrics collection tracks invalidation events
- ✓ All 20+ unit tests pass
- ✓ All 4 integration scenarios work correctly
- ✓ No regressions to existing device-discovery tests

---

## 9. Code Review Checklist

- [ ] All methods have JSDoc comments with Inputs/Outputs/Operations
- [ ] Interface definitions match usage throughout code
- [ ] Error handling covers all edge cases listed in section 6
- [ ] Memory management prevents leaks (arrays pruned, maps cleaned)
- [ ] Performance meets targets (all operations <5ms)
- [ ] Integration points in device-discovery.ts are correct
- [ ] All 20+ unit tests pass
- [ ] All 4 integration scenarios pass
- [ ] No TypeScript errors
- [ ] Code follows project style guide

---

## 10. Related Documents

- **Previous Task:** docs/planning/task_1_metrics_collection_specification.md
- **Following Task:** docs/planning/task_3_priority_queue_specification.md
- **Architecture:** docs/architecture/device-discovery-system-overview.md
- **CLAUDE.md:** Workflow multiplier patterns and agent playbooks

---

## Changelog

- `2025-10-27` — Initial specification published
  - Defined CacheInvalidationManager class with 7 core methods
  - Specified IP/MAC change detection with confidence scoring
  - Outlined adaptive TTL algorithm (5 min - 2 hours)
  - Provided integration points for device-discovery.ts
  - Listed 20+ unit test cases and 4 integration scenarios

<!-- markdownlint-enable MD013 -->
